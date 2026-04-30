/**
 * Canonical list of HTTP methods supported by the runner.
 */
export const HTTP_METHODS = ['GET','POST','PUT','PATCH','DELETE'] as const;

/**
 * Strongly-typed HTTP method.
 */
export type HttpMethod = typeof HTTP_METHODS[number];

/**
 * Runtime guard that checks if a value is a valid HttpMethod.
 * @param v Unknown value to validate.
 */
export function isHttpMethod(v: unknown): v is HttpMethod {
  return typeof v === 'string' && HTTP_METHODS.includes(v.toUpperCase() as HttpMethod);
}

/**
 * Returns Tailwind tone classes for a method badge.
 * @param m Method string to colorize.
 */
export function methodTone(m?: string): string {
  const k = String(m || '').toUpperCase();
  switch (k) {
    case 'GET':    return 'text-emerald-700 bg-emerald-500/10 ring-1 ring-emerald-600/25';
    case 'POST':   return 'text-blue-700 bg-blue-500/10 ring-1 ring-blue-600/25';
    case 'PUT':    return 'text-amber-700 bg-amber-500/10 ring-1 ring-amber-600/25';
    case 'PATCH':  return 'text-violet-700 bg-violet-500/10 ring-1 ring-violet-600/25';
    case 'DELETE': return 'text-red-700 bg-red-500/10 ring-1 ring-red-600/25';
    default:       return 'text-foreground bg-muted ring-1 ring-border';
  }
}
