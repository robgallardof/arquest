import type {
  RequestModel,
  ParamKV,
  RequestBody,
  HeaderKV,
} from "@/lib/domain/models";
import type { AuthConfig } from "@/types/auth";
import { applyAuth } from "@/types/auth";

/**
 * Converts an array of header KVs into a case-insensitive header map,
 * filtering out disabled entries and empty keys.
 * @param headers List of header key-values from the model.
 */
function toHeaderMap(headers: HeaderKV[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (const h of headers) {
    if (!h.enabled || !h.key) continue;
    out[h.key] = h.value ?? "";
  }
  return out;
}

/**
 * Appends enabled query params to a URL. Preserves existing search params.
 * Works with absolute and relative URLs.
 * - Existing keys are overridden by enabled Param entries with the same key.
 * - If no enabled params, returns the original URL unchanged.
 *
 * @param url Base URL (relative or absolute).
 * @param params Query params to append.
 */
export function appendParams(url: string, params: ParamKV[]): string {
  const enabled = params.filter((p) => p.enabled && p.key);
  if (!enabled.length) return url;

  const base =
    typeof window !== "undefined" ? window.location.href : "http://localhost";

  let u: URL;
  try {
    u = new URL(url, base);
  } catch {
    // Fallback to a safe absolute URL to avoid throwing on malformed input
    u = new URL(String(url || "/"), base);
  }

  // Copy current query into a map, then overlay enabled params
  const map = new Map<string, string>();
  u.searchParams.forEach((v, k) => map.set(k, v));
  for (const p of enabled) map.set(p.key, p.value ?? "");

  // Rebuild search
  u.search = "";
  for (const [k, v] of map.entries()) u.searchParams.set(k, v);

  return u.toString();
}

/**
 * Sets Content-Type only if it's not already present (case-insensitive).
 * @param headers Mutable header map.
 * @param ct MIME type to ensure.
 */
function ensureContentType(headers: Record<string, string>, ct: string) {
  const has = Object.keys(headers).some(
    (k) => k.toLowerCase() === "content-type"
  );
  if (!has) headers["Content-Type"] = ct;
}

/**
 * Builds the fetch body and adjusts headers according to RequestBody.type.
 * Never overwrites an existing Content-Type set by the user.
 *
 * Notes:
 * - 'form' uses FormData (do not set Content-Type; the browser adds boundary).
 * - 'form-urlencoded' uses URLSearchParams.
 * - 'graphql' serializes { query, variables } as JSON.
 * - 'binary' requires the runner/UX to bind a Blob/File from `binaryPath` or equivalent.
 *
 * @param body Request body model.
 * @param headers Mutable header map.
 */
export function buildBodyAndHeaders(
  body: RequestBody | undefined,
  headers: Record<string, string>
): { body: BodyInit | undefined; headers: Record<string, string> } {
  if (!body) return { body: undefined, headers };

  switch (body.type) {
    case "raw": {
      // User decides Content-Type entirely.
      return { body: body.raw ?? "", headers };
    }

    case "json": {
      const payload = body.raw ?? "";
      ensureContentType(headers, "application/json; charset=utf-8");
      return { body: payload, headers };
    }

    case "xml": {
      const payload = body.raw ?? "";
      ensureContentType(headers, "application/xml; charset=utf-8");
      return { body: payload, headers };
    }

    case "text": {
      const payload = body.raw ?? "";
      ensureContentType(headers, "text/plain; charset=utf-8");
      return { body: payload, headers };
    }

    case "graphql": {
      const query = body.graphql?.query ?? "";
      const variables = body.graphql?.variables ?? {};
      ensureContentType(headers, "application/json; charset=utf-8");
      return { body: JSON.stringify({ query, variables }), headers };
    }

    case "form-urlencoded": {
      const form = new URLSearchParams();
      for (const f of body.form ?? []) {
        if (f.enabled === false || !f.key) continue;
        if (f.file) continue; // not applicable to urlencoded
        form.append(f.key, f.value ?? "");
      }
      ensureContentType(
        headers,
        "application/x-www-form-urlencoded; charset=utf-8"
      );
      return { body: form, headers };
    }

    case "form": {
      const fd = new FormData();
      for (const f of body.form ?? []) {
        if (f.enabled === false || !f.key) continue;
        if (f.file) {
          // TODO: Bind real File/Blob here via your UI mechanism (binary chooser).
          // For now, skip file parts if there's no binding.
          continue;
        } else {
          fd.append(f.key, f.value ?? "");
        }
      }
      // Do NOT set Content-Type for FormData (browser sets boundary).
      return { body: fd, headers };
    }

    case "binary": {
      // TODO: Resolve `binaryPath` into a Blob/File. Placeholder falls back to raw string.
      return { body: body.raw ?? "", headers };
    }

    default:
      return { body: undefined, headers };
  }
}

/**
 * Produces the final { url, headers, body, method } for fetch, including:
 * - URL with existing query + enabled Params (Params override duplicates)
 * - Enabled headers KVs → flat header map
 * - Body builder based on RequestBody.type (safe defaults)
 * - Auth via `applyAuth` (never overwrites a manual Authorization header)
 *
 * @param req Request model to materialize into a real HTTP request.
 */
function applyEnv(input: string, env: Record<string, string>): string {
  return input.replace(/\{\{\s*([A-Za-z0-9_.-]+)\s*\}\}/g, (_, key) => {
    const next = env[key];
    return typeof next === "string" ? next : "";
  });
}

export function materializeRequest(
  req: RequestModel,
  envVars: Record<string, string> = {}
): {
  url: string;
  method: RequestModel["method"];
  headers: Record<string, string>;
  body: BodyInit | undefined;
} {
  // 1) Headers from KVs
  let headers = toHeaderMap(req.headers ?? []);
  headers = Object.fromEntries(
    Object.entries(headers).map(([k, v]) => [k, applyEnv(v ?? "", envVars)])
  );

  // 2) URL + enabled params (preserve existing query)
  let url = appendParams(applyEnv(req.url, envVars), req.params ?? []);

  // 3) Body & content-type handling
  const bodyWithEnv =
    req.body?.raw != null
      ? { ...req.body, raw: applyEnv(req.body.raw, envVars) }
      : req.body;
  const built = buildBodyAndHeaders(bodyWithEnv, headers);
  headers = built.headers;

  // 4) Auth (respects a manual Authorization header)
  const withAuth = applyAuth(
    { url, headers },
    req.auth as AuthConfig | undefined
  );

  return {
    url: withAuth.url,
    method: req.method,
    headers: withAuth.headers,
    body: built.body,
  };
}
