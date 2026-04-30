import type { Kind } from "./types";

/** Detects the runtime kind of a value in a JSON-centric way. */
export const kindOf = (v: unknown): Kind =>
  v === null
    ? "null"
    : Array.isArray(v)
      ? "array"
      : (["object", "string", "number", "boolean"] as const).includes(
            typeof v as any
          )
        ? (typeof v as Kind)
        : "unknown";

/** Human-friendly preview for arbitrary JSON values. */
export const previewOf = (v: unknown): string => {
  const k = kindOf(v);
  if (k === "string") {
    const s = String(v);
    return `"${s.length > 60 ? s.slice(0, 60) + "…" : s}"`;
  }
  if (k === "number" || k === "boolean") return String(v);
  if (k === "null") return "null";
  if (k === "array") return "[…]";
  if (k === "object") return "{…}";
  return String(v ?? "");
};

/** Formats a JSON path like root["a"][0]["b"]. */
export const jsonPathBracket = (parts: string[]): string =>
  parts.length === 0
    ? "root"
    : "root" +
      parts
        .map((p) =>
          /^\d+$/.test(p) ? `[${p}]` : `["${p.replace(/"/g, '\\"')}"]`
        )
        .join("");

/** Normalizes a string for a React Flow node id. */
export const sanitizeIdPart = (s: string) =>
  s.replace(/\./g, "").replace(/[^\w-]/g, "_");

/** Produces a stable edge id from two node ids. */
export const sanitizeEdgeId = (a: string, b: string) =>
  `e__${a}__${b}`.replace(/[^\w-]/g, "_");

/** Stable path key used to track collapsed state. */
export const pathKey = (parts: string[]) => parts.join("\u0000");

/** Utility: map-like numeric suffix factory for unique ids. */
export const makeIdFactory = () => {
  const seen = new Map<string, number>();
  return (path: string[]) => {
    const base = path.length ? path.map(sanitizeIdPart).join("__") : "root";
    const n = seen.get(base) ?? 0;
    seen.set(base, n + 1);
    return n === 0 ? base : `${base}__${n}`;
  };
};
