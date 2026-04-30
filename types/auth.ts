/**
 * Supported authentication mechanism types.
 */
export type AuthType = 'none' | 'bearer' | 'basic' | 'api-key-header' | 'api-key-query';

/**
 * No authentication.
 */
export interface NoneAuth {
  type: 'none';
  /** Whether this auth configuration should be applied. */
  enabled: boolean;
}

/**
 * Bearer token authentication (e.g., JWT).
 */
export interface BearerAuth {
  type: 'bearer';
  enabled: boolean;
  /** Token without scheme prefix. */
  token?: string;
  /** Scheme prefix. Defaults to "Bearer". */
  scheme?: string;
}

/**
 * HTTP Basic authentication.
 */
export interface BasicAuth {
  type: 'basic';
  enabled: boolean;
  /** Username part. */
  username?: string;
  /** Password part. */
  password?: string;
}

/**
 * API key sent as a custom HTTP header.
 */
export interface ApiKeyHeaderAuth {
  type: 'api-key-header';
  enabled: boolean;
  /** Header name, e.g. "X-API-Key". */
  headerName?: string;
  /** API key value. */
  key?: string;
}

/**
 * API key appended as a URL query parameter.
 */
export interface ApiKeyQueryAuth {
  type: 'api-key-query';
  enabled: boolean;
  /** Query parameter name, e.g. "api_key". */
  paramName?: string;
  /** API key value. */
  key?: string;
}

/**
 * Union of all supported auth configurations.
 * `enabled` is required in every variant to avoid assignability issues.
 */
export type AuthConfig =
  | NoneAuth
  | BearerAuth
  | BasicAuth
  | ApiKeyHeaderAuth
  | ApiKeyQueryAuth;

/* -------------------------
 * Helper utilities (private)
 * ------------------------- */

/**
 * Case-insensitive check for an existing header.
 * @param headers Current headers map.
 * @param name Header name to check.
 */
function hasHeader(headers: Record<string, string>, name: string): boolean {
  const n = name.toLowerCase();
  return Object.keys(headers).some(k => k.toLowerCase() === n);
}

/**
 * Sets a header only if a header with the same name (case-insensitive) is not already present.
 * Never overwrites existing values.
 */
function setHeaderIfAbsent(
  headers: Record<string, string>,
  name: string,
  value?: string
) {
  if (value == null) return;
  if (hasHeader(headers, name)) return;
  headers[name] = value;
}

/**
 * Base64 encoder that works in both browser and Node (fallback).
 * @param input String to encode.
 */
function toBase64(input: string): string {
  if (typeof globalThis !== 'undefined' && typeof (globalThis as any).btoa === 'function') {
    return (globalThis as any).btoa(unescape(encodeURIComponent(input)));
  }
  // @ts-ignore Node fallback for SSR/unit tests
  return Buffer.from(input, 'utf8').toString('base64');
}

/* --------------
 * Public helper
 * -------------- */

/**
 * Applies an authentication configuration to URL and headers.
 * Rules:
 *  - If `auth` is absent, disabled, or `type === 'none'`, inputs are returned unchanged.
 *  - A manually provided "Authorization" header is never overwritten.
 *  - For header-based API keys, an existing header with the same name is respected (case-insensitive).
 *  - For query-based API keys, the parameter is appended if missing (absolute & relative URL friendly).
 *
 * @param input Current request url and headers.
 * @param auth Optional authentication configuration.
 * @returns A new `{ url, headers }` object with auth applied.
 */
export function applyAuth(
  input: { url: string; headers: Record<string, string> },
  auth?: AuthConfig
): { url: string; headers: Record<string, string> } {
  const out = { url: input.url, headers: { ...input.headers } };

  if (!auth || !auth.enabled || auth.type === 'none') return out;

  switch (auth.type) {
    case 'bearer': {
      const scheme = (auth.scheme || 'Bearer').trim();
      const token = (auth.token || '').trim();
      if (token && !hasHeader(out.headers, 'Authorization')) {
        out.headers['Authorization'] = `${scheme} ${token}`;
      }
      break;
    }
    case 'basic': {
      if (!hasHeader(out.headers, 'Authorization')) {
        const user = auth.username || '';
        const pass = auth.password || '';
        out.headers['Authorization'] = `Basic ${toBase64(`${user}:${pass}`)}`;
      }
      break;
    }
    case 'api-key-header': {
      const name = (auth.headerName || 'X-API-Key').trim();
      setHeaderIfAbsent(out.headers, name, auth.key ?? '');
      break;
    }
    case 'api-key-query': {
      const param = (auth.paramName || 'api_key').trim();
      const key = auth.key ?? '';
      try {
        const u = new URL(out.url);
        if (!u.searchParams.has(param)) u.searchParams.append(param, key);
        out.url = u.toString();
      } catch {
        const join = out.url.includes('?') ? '&' : '?';
        const rx = new RegExp(`[?&]${param}=`);
        out.url = rx.test(out.url)
          ? out.url
          : `${out.url}${join}${encodeURIComponent(param)}=${encodeURIComponent(key)}`;
      }
      break;
    }
  }
  return out;
}
