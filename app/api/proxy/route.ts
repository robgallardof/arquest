import type { NextRequest } from "next/server";

export const runtime = "nodejs";

/**
 * A list of hop-by-hop headers that should not be forwarded in proxy requests.
 */
const HOP_BY_HOP = new Set([
  "connection",
  "keep-alive",
  "proxy-authenticate",
  "proxy-authorization",
  "te",
  "trailer",
  "transfer-encoding",
  "upgrade",
  "host",
  "content-length",
  "accept-encoding",
]);

/**
 * Determines whether the given HTTP method supports a request body.
 *
 * @param method - The HTTP method to check.
 * @returns `true` if the method allows a body; otherwise `false`.
 */
function methodAllowsBody(method: string): boolean {
  return !["GET", "HEAD"].includes(method.toUpperCase());
}

/**
 * Generates permissive CORS headers for the response.
 *
 * @param origin - The value of the `Origin` header from the request, if any.
 * @returns A `HeadersInit` object with the appropriate CORS headers.
 */
function corsHeaders(origin: string | null): HeadersInit {
  return {
    "Access-Control-Allow-Origin": origin ?? "*",
    "Access-Control-Allow-Methods": "GET,POST,PUT,PATCH,DELETE,OPTIONS",
    "Access-Control-Allow-Headers": "*",
  };
}

/**
 * Rewrites `localhost` or `127.0.0.1` to client IP in production.
 *
 * @param rawUrl - The original target URL.
 * @param req - The incoming request object.
 * @returns A sanitized or rewritten URL string, or `null` if disallowed.
 */
function sanitizeTargetUrl(rawUrl: string, req: NextRequest): string | null {
  const isLocal = rawUrl.includes("localhost") || rawUrl.includes("127.0.0.1");

  // Allow localhost in development
  if (isLocal && process.env.NODE_ENV !== "production") {
    return rawUrl;
  }

  // Rewrite localhost to client IP in production
  if (isLocal && process.env.NODE_ENV === "production") {
    const clientIp =
      req.headers.get("x-real-ip") ||
      req.headers.get("x-forwarded-for")?.split(",")[0];

    if (!clientIp) return null;

    try {
      const url = new URL(rawUrl);
      url.hostname = clientIp;
      return url.toString();
    } catch {
      return null;
    }
  }

  return rawUrl;
}

/**
 * Handles all proxied requests (GET, POST, etc.).
 *
 * @param req - The incoming Next.js request.
 * @returns A Response object with the proxied result.
 */
async function handleProxy(req: NextRequest): Promise<Response> {
  const origin = req.headers.get("origin");
  const rawUrl = req.nextUrl.searchParams.get("url");

  if (!rawUrl) {
    return new Response("Missing ?url=", {
      status: 400,
      headers: corsHeaders(origin),
    });
  }

  const safeUrl = sanitizeTargetUrl(rawUrl, req);
  if (!safeUrl) {
    return new Response(
      "Invalid or disallowed URL (localhost requires client IP in production).",
      {
        status: 400,
        headers: corsHeaders(origin),
      }
    );
  }

  let target: URL;
  try {
    target = new URL(safeUrl);
  } catch {
    return new Response("Malformed URL", {
      status: 400,
      headers: corsHeaders(origin),
    });
  }

  if (!/^https?:$/.test(target.protocol)) {
    return new Response("Only http/https are allowed", {
      status: 400,
      headers: corsHeaders(origin),
    });
  }

  const method = req.method.toUpperCase();

  // Forward headers, stripping hop-by-hop
  const fwd = new Headers();
  req.headers.forEach((v, k) => {
    if (!HOP_BY_HOP.has(k.toLowerCase())) fwd.set(k, v);
  });

  const init: RequestInit = {
    method,
    headers: fwd,
    redirect: "follow",
  };

  if (methodAllowsBody(method) && req.body) {
    (init as any).duplex = "half";
    init.body = req.body as any;
  }

  let upstream: Response;

  try {
    upstream = await fetch(target.toString(), init);
  } catch (err) {
    return new Response(`Fetch error: ${(err as Error).message}`, {
      status: 502,
      headers: corsHeaders(origin),
    });
  }

  const outHeaders = new Headers(corsHeaders(origin));
  upstream.headers.forEach((v, k) => {
    if (!HOP_BY_HOP.has(k.toLowerCase())) outHeaders.set(k, v);
  });

  return new Response(upstream.body, {
    status: upstream.status,
    statusText: upstream.statusText,
    headers: outHeaders,
  });
}

/**
 * Handles preflight CORS requests.
 *
 * @param req - The incoming Next.js request object.
 * @returns A 204 response with the appropriate CORS headers.
 */
export async function OPTIONS(req: NextRequest): Promise<Response> {
  return new Response(null, {
    headers: corsHeaders(req.headers.get("origin")),
  });
}

/**
 * Handles GET requests via proxy.
 */
export const GET = handleProxy;

/**
 * Handles POST requests via proxy.
 */
export const POST = handleProxy;

/**
 * Handles PUT requests via proxy.
 */
export const PUT = handleProxy;

/**
 * Handles PATCH requests via proxy.
 */
export const PATCH = handleProxy;

/**
 * Handles DELETE requests via proxy.
 */
export const DELETE = handleProxy;
