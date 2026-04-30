export interface RunRequestInit
  extends Omit<RequestInit, "body" | "headers" | "signal"> {
  /** Absolute or relative URL to fetch. */
  url: string;
  /** Additional headers to send. These will be normalized and merged. */
  headers?: HeadersInit;
  /** Raw body. Ignored if `json` is provided or method is GET/HEAD. */
  body?: BodyInit | null;
  /** Convenience: JSON value to be stringified into the request body. */
  json?: unknown;
  /** Convenience: query params to append to the URL (null/undefined are skipped). */
  params?: Record<string, string | number | boolean | null | undefined>;
  /**
   * Request timeout in milliseconds.
   * If omitted or <= 0, NO timeout will be applied (the request can run indefinitely).
   * Use an external AbortSignal to cancel manually from the UI.
   */
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

/** True if the HTTP method is allowed to carry a request body. */
function methodAllowsBody(m: string | undefined): boolean {
  const mm = (m ?? "GET").toUpperCase();
  return !(mm === "GET" || mm === "HEAD");
}

/**
 * Performs a fetch with:
 * - Optional timeout (disabled if `timeoutMs` is omitted or <= 0) and abort chaining
 *   (internal AbortController + optional external signal),
 * - Optional JSON body (auto-sets Content-Type if missing),
 * - Optional query params,
 * - Normalized/merged headers,
 * - Stable text body for downstream UI.
 */
export async function runRequest(
  init: RunRequestInit
): Promise<RunRequestResult> {
  const {
    url,
    params,
    json,
    timeoutMs, // no default ⇒ no timeout unless > 0
    signal: externalSignal,
    headers: initHeaders,
    body: initBody,
    method,
    ...rest
  } = init;

  const methodNorm = (method ?? "GET").toUpperCase();

  // URL + params
  const urlWithParams = withParams(url, params);
  const finalUrl = urlWithParams; // no proxy rewrite

  // Headers (normalized and mutable)
  const headers = new Headers(initHeaders);

  // If `json` is provided and method allows a body, serialize it and set Content-Type when missing
  let body: BodyInit | null | undefined = initBody;
  if (!methodAllowsBody(methodNorm)) {
    body = undefined; // never send a body for GET/HEAD
  } else if (json !== undefined) {
    if (!headers.has("Content-Type")) {
      headers.set("Content-Type", "application/json");
    }
    body = safeJsonStringify(json);
  }

  // Prefer JSON/text by default if not explicitly set
  if (!headers.has("Accept")) {
    headers.set("Accept", "application/json, text/*;q=0.9, */*;q=0.8");
  }

  // Abort controller + optional timeout
  const controller = new AbortController();
  let timeoutId: number | null = null;
  let timedOut = false;

  if (typeof timeoutMs === "number" && timeoutMs > 0) {
    timeoutId = window.setTimeout(() => {
      timedOut = true;
      controller.abort(new DOMException("Request timed out", "AbortError"));
    }, timeoutMs);
  }

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
      method: methodNorm,
      headers,
      body,
      redirect: "follow",
      signal: controller.signal,
      // Add credentials/referrer/policy here if your app requires it.
      ...rest,
    });

    if (timeoutId !== null) window.clearTimeout(timeoutId);
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
    if (timeoutId !== null) window.clearTimeout(timeoutId);

    const aborted =
      (err instanceof DOMException && err.name === "AbortError") ||
      (typeof err === "object" &&
        err !== null &&
        (err as { name?: string }).name === "AbortError");

    const message = aborted
      ? `Request aborted${
          timedOut
            ? " (timeout)"
            : externalSignal?.aborted
              ? " (external signal)"
              : " (user)"
        }.`
      : err instanceof Error
        ? err.message
        : String(err);

    const t1 = nowMs();
    return {
      ok: false,
      status: 0,
      statusText: aborted ? "ABORTED" : "NETWORK_ERROR",
      url: urlWithParams,
      redirected: false,
      durationMs: t1 - t0,
      headers: {},
      contentType: "text/plain",
      body: message,
    };
  }
}
