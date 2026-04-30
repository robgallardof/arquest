# Arquest / Thunderpost PWA

## ES — Descripción
Cliente HTTP tipo Postman/Thunder con Next.js App Router, enfoque **dark mode**, UX moderna y capacidades **PWA** (instalable/offline cache).

## EN — Description
A Postman/Thunder-like HTTP client built on Next.js App Router with **dark-mode-first UI/UX** and **PWA** capabilities (installable + offline caching).

## ES — Variables de entorno
Crea `.env.local`:

```bash
NEXT_PUBLIC_ENABLE_PROXY_FALLBACK=true
NEXT_PUBLIC_REQUEST_TIMEOUT_MS=30000
```

- `NEXT_PUBLIC_ENABLE_PROXY_FALLBACK`: reintenta automáticamente por `/api/proxy` cuando un request directo falla por CORS/network.
- `NEXT_PUBLIC_REQUEST_TIMEOUT_MS`: timeout por defecto para requests (ms).

## EN — Environment variables
Create `.env.local`:

```bash
NEXT_PUBLIC_ENABLE_PROXY_FALLBACK=true
NEXT_PUBLIC_REQUEST_TIMEOUT_MS=30000
```

- `NEXT_PUBLIC_ENABLE_PROXY_FALLBACK`: auto-retry through `/api/proxy` when direct requests fail due to CORS/network issues.
- `NEXT_PUBLIC_REQUEST_TIMEOUT_MS`: default request timeout in milliseconds.

## ES — CORS, localhost y externos
- Se mantiene request directo a `http://localhost:*` y APIs externas.
- Si la política CORS del backend bloquea el navegador, la app puede fallback al proxy interno.

## EN — CORS, localhost, and external APIs
- Direct browser requests to `http://localhost:*` and external APIs remain supported.
- If backend CORS blocks browser calls, the app can fallback to the internal proxy endpoint.

## PWA Notes
- App keeps service worker + runtime cache strategy.
- UX and networking updates preserve PWA behavior.

## Development
```bash
pnpm install
pnpm dev
```

## Build
```bash
pnpm build
pnpm start
```
