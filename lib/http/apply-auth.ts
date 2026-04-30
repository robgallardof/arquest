import type { AuthConfig } from "@/types/auth";

/**
 * Case-insensitive header key lookup.
 * @param headers Mutable headers object.
 * @param name Header name to find.
 * @returns The matching key from `headers` preserving original casing, or `undefined`.
 */
function findHeaderKey(headers: Record<string, string>, name: string): string | undefined {
  const target = name.toLowerCase();
  return Object.keys(headers).find(k => k.toLowerCase() === target);
}

/**
 * Sets a header value with case-insensitive replace semantics.
 * If a header with the same name exists, it is replaced preserving original key casing.
 * Otherwise, a new header is added using `name` as provided.
 * @param headers Mutable headers object.
 * @param name Header name.
 * @param value Header value.
 */
function setHeader(headers: Record<string, string>, name: string, value: string): void {
  const existing = findHeaderKey(headers, name);
  if (existing) {
    headers[existing] = value;
  } else {
    headers[name] = value;
  }
}

/**
 * Base64 encoder that works in both browser and (if needed) Node.
 * @param input String to encode.
 * @returns Base64-encoded string.
 */
function toBase64(input: string): string {
  // Browser
  if (typeof globalThis !== "undefined" && typeof (globalThis as any).btoa === "function") {
    return (globalThis as any).btoa(input);
  }
  // Node fallback (shouldn't be needed in client code, but safe)
  const { Buffer } = require("buffer");
  return Buffer.from(input, "utf-8").toString("base64");
}

/**
 * Applies an authentication configuration to the provided URL and headers.
 * Rules:
 *  - If `auth.enabled` is false or `auth` is undefined, inputs are returned unchanged.
 *  - A manually provided "Authorization" header is never overwritten.
 *  - For header-based API keys, an existing header with the same name (case-insensitive) is respected.
 *  - For query-based API keys, the parameter is added/replaced in the URL's query string.
 *
 * @param inputUrl The original URL string.
 * @param baseHeaders A plain object of request headers (case-insensitive semantics).
 * @param auth Optional authentication block to apply.
 * @returns An object containing the transformed `url` and `headers`.
 */
export function applyAuth(
  inputUrl: string,
  baseHeaders: Record<string, string>,
  auth?: AuthConfig
): { url: string; headers: Record<string, string> } {
  let url = inputUrl;
  const headers: Record<string, string> = { ...baseHeaders };

  if (!auth || !auth.enabled) {
    return { url, headers };
  }

  const hasAuthorization = !!findHeaderKey(headers, "authorization");

  switch (auth.type) {
    case "none":
      return { url, headers };

    case "bearer": {
      if (!hasAuthorization && auth.token?.trim()) {
        const scheme = (auth.scheme ?? "Bearer").trim();
        setHeader(headers, "Authorization", `${scheme} ${auth.token}`);
      }
      return { url, headers };
    }

    case "basic": {
      if (!hasAuthorization) {
        const user = auth.username ?? "";
        const pass = auth.password ?? "";
        const encoded = toBase64(`${user}:${pass}`);
        setHeader(headers, "Authorization", `Basic ${encoded}`);
      }
      return { url, headers };
    }

    case "api-key-header": {
      const name = auth.headerName?.trim();
      if (name && auth.key != null && findHeaderKey(headers, name) === undefined) {
        setHeader(headers, name, String(auth.key));
      }
      return { url, headers };
    }

    case "api-key-query": {
      const param = auth.paramName?.trim();
      if (param && auth.key != null) {
        try {
          const u = new URL(url);
          u.searchParams.set(param, String(auth.key));
          url = u.toString();
        } catch {
          // If URL is invalid or relative, attempt a graceful append
          const sep = url.includes("?") ? "&" : "?";
          url = `${url}${sep}${encodeURIComponent(param)}=${encodeURIComponent(String(auth.key))}`;
        }
      }
      return { url, headers };
    }

    default:
      return { url, headers };
  }
}
