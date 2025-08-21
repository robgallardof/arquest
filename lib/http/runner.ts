// lib/http/runner.ts

export interface RunRequestInit
  extends Omit<RequestInit, "body" | "headers" | "signal"> {
  /** Absolute or relative URL to fetch. */
  url: string;
  /** Additional headers to send. These will be normalized and merged. */
  headers?: HeadersInit;
  /** Raw body. Ignored if `json` is provided. */
  body?: BodyInit | null;
  /** Convenience: JSON value to be stringified into the request body. */
  json?: unknown;
  /** Convenience: query params to append to the URL (null/undefined are skipped). */
  params?: Record<string, string | number | boolean | null | undefined>;
  /** Request timeout in milliseconds. Defaults to 30000 (30s). */
  timeoutMs?: number;
  /**
   * External AbortSignal to cancel the request. It is chained with the internal
   * timeout-based signal so either one can abort the fetch.
   */
  signal?: AbortSignal;
}

export interface RunRequestResult {
  /** True when the HTTP status is in the 2xx range. */
  ok: boolean;
  /** Numeric HTTP status code. `0` on network/abort errors. */
  status: number;
  /** HTTP status text (or "ABORTED"/"NETWORK_ERROR" on failure). */
  statusText: string;
  /** Final fetched URL (after redirects). */
  url: string;
  /** Whether the request was redirected. */
  redirected: boolean;
  /** Total time from start to settled, in milliseconds. */
  durationMs: number;
  /** Response headers as a plain object (duplicate headers are comma-joined). */
  headers: Record<string, string>;
  /** Resolved Content-Type header (empty string if missing). */
  contentType: string;
  /**
   * Response body as plain text. Keeping it as string lets the UI decide how to
   * pretty-print (e.g., JSON formatting) without re-fetching the stream.
   */
  body: string;
}

/** Returns a high-resolution "now" in ms, falling back to Date.now() when not available. */
function nowMs(): number {
  return typeof performance !== "undefined" ? performance.now() : Date.now();
}

/** Safe JSON stringify for unknown values (maps `undefined` to `null` in objects). */
function safeJsonStringify(value: unknown): string {
  return JSON.stringify(value, (_k, v) => (v === undefined ? null : v));
}

/** Converts a Headers object into a plain record, merging duplicates with commas. */
function headersToObject(h: Headers): Record<string, string> {
  const out: Record<string, string> = {};
  h.forEach((value, key) => {
    out[key] = out[key] ? `${out[key]}, ${value}` : value;
  });
  return out;
}

/** Builds a URL with the provided query params (skips null/undefined). */
function withParams(url: string, params?: RunRequestInit["params"]): string {
  if (!params) return url;
  const base =
    typeof window !== "undefined" ? window.location.href : "http://localhost";
  const u = new URL(url, base);
  for (const [k, v] of Object.entries(params)) {
    if (v === null || v === undefined) continue;
    u.searchParams.set(k, String(v));
  }
  return u.toString();
}

/**
 * Performs a fetch with:
 * - timeout & abort chaining (internal AbortController + optional external signal),
 * - optional JSON body (auto sets Content-Type if missing),
 * - optional query params,
 * - normalized/merged headers,
 * - stable text body for downstream UI.
 *
 * @example
 * // Basic usage
 * const res = await runRequest({ url: "https://httpbin.org/get" });
 *
 * @example
 * // JSON POST with timeout and params
 * const res = await runRequest({
 *   url: "https://api.example.com/items",
 *   method: "POST",
 *   params: { q: "shoes", page: 2 },
 *   json: { name: "Boots", price: 99.9 },
 *   timeoutMs: 15000,
 * });
 */
export async function runRequest(
  init: RunRequestInit
): Promise<RunRequestResult> {
  const {
    url,
    params,
    json,
    timeoutMs = 30_000,
    signal: externalSignal,
    headers: initHeaders,
    body: initBody,
    method,
    ...rest
  } = init;

  // URL + params
  const finalUrl = withParams(url, params);

  // Headers (normalized and mutable)
  const headers = new Headers(initHeaders);

  // If `json` is provided, serialize it and set Content-Type when missing
  let body: BodyInit | null | undefined = initBody;
  if (json !== undefined) {
    if (!headers.has("Content-Type")) {
      headers.set("Content-Type", "application/json");
    }
    body = safeJsonStringify(json);
  }

  // Prefer JSON/text by default if not explicitly set
  if (!headers.has("Accept")) {
    headers.set("Accept", "application/json, text/*;q=0.9, */*;q=0.8");
  }

  // Timeout + chain with external signal
  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    controller.abort(new DOMException("Request timed out", "AbortError"));
  }, timeoutMs);

  if (externalSignal) {
    if (externalSignal.aborted) {
      controller.abort(externalSignal.reason);
    } else {
      externalSignal.addEventListener(
        "abort",
        () => controller.abort(externalSignal.reason),
        { once: true }
      );
    }
  }

  const t0 = nowMs();
  try {
    const res = await fetch(finalUrl, {
      method: method ?? "GET",
      headers,
      body,
      redirect: "follow",
      signal: controller.signal,
      // Add credentials/referrer/policy here if your app requires it.
      ...rest,
    });

    clearTimeout(timeoutId);
    const t1 = nowMs();

    const contentType = res.headers.get("content-type") ?? "";
    const text = await res.text();

    return {
      ok: res.ok,
      status: res.status,
      statusText: res.statusText,
      url: res.url,
      redirected: res.redirected,
      durationMs: t1 - t0,
      headers: headersToObject(res.headers),
      contentType,
      body: text,
    };
  } catch (err: unknown) {
    clearTimeout(timeoutId);

    const aborted =
      (err instanceof DOMException && err.name === "AbortError") ||
      (typeof err === "object" &&
        err !== null &&
        (err as { name?: string }).name === "AbortError");

    const message = aborted
      ? `Request aborted${
          externalSignal?.aborted ? " (external signal)" : " (timeout)"
        }.`
      : err instanceof Error
      ? err.message
      : String(err);

    const t1 = nowMs();
    return {
      ok: false,
      status: 0,
      statusText: aborted ? "ABORTED" : "NETWORK_ERROR",
      url: finalUrl,
      redirected: false,
      durationMs: t1 - t0,
      headers: {},
      contentType: "text/plain",
      body: message,
    };
  }
}
