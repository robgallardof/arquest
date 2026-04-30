const raw = process.env.NEXT_PUBLIC_ENABLE_PROXY_FALLBACK;
const timeoutRaw = process.env.NEXT_PUBLIC_REQUEST_TIMEOUT_MS;

function toBool(value: string | undefined, defaultValue: boolean): boolean {
  if (!value) return defaultValue;
  return ["1", "true", "yes", "on"].includes(value.toLowerCase());
}

function toPositiveInt(value: string | undefined, fallback: number): number {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return fallback;
  return Math.floor(n);
}

export const runtimeConfig = {
  enableProxyFallback: toBool(raw, true),
  requestTimeoutMs: toPositiveInt(timeoutRaw, 30_000),
};
