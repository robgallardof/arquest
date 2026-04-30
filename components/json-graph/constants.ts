/** Tailwind token helpers and theme constants (no hardcoded hex). */

/**
 * Builds an HSL color string from a Tailwind CSS variable token.
 * @param token CSS variable name, e.g. "--foreground"
 * @param alpha Optional alpha in [0..1]
 */
export const hslv = (token: string, alpha?: number) =>
  alpha == null ? `hsl(var(${token}))` : `hsl(var(${token}) / ${alpha})`;

/** Canonical tokens from your theme. */
export const TOKENS = {
  bg: hslv("--background"),
  card: hslv("--card"),
  text: hslv("--foreground"),
  textMuted: hslv("--muted-foreground"),
  border: hslv("--border"),
  popover: hslv("--popover"),
  ring: hslv("--ring"),
  edge: hslv("--foreground", 0.85),
  edgeDim: hslv("--foreground", 0.65),
  labelBg: hslv("--popover", 0.9),
  labelBgStroke: hslv("--border", 0.6),
  grid: hslv("--foreground", 0.08),
  minimapMask: hslv("--background", 0.6),
} as const;

/** Semantic colors by JSON kind. */
export const TYPE_COLORS = {
  object: {
    stroke: hslv("--chart-1"),
    badgeBg: hslv("--chart-1", 0.15),
    badgeText: hslv("--chart-1", 0.7),
  },
  array: {
    stroke: hslv("--chart-3"),
    badgeBg: hslv("--chart-3", 0.15),
    badgeText: hslv("--chart-3", 0.7),
  },
  string: {
    stroke: hslv("--success"),
    badgeBg: hslv("--success", 0.15),
    badgeText: hslv("--success", 0.7),
  },
  number: {
    stroke: hslv("--warning"),
    badgeBg: hslv("--warning", 0.15),
    badgeText: hslv("--warning", 0.7),
  },
  boolean: {
    stroke: hslv("--chart-4"),
    badgeBg: hslv("--chart-4", 0.15),
    badgeText: hslv("--chart-4", 0.7),
  },
  null: {
    stroke: hslv("--muted-foreground"),
    badgeBg: hslv("--muted-foreground", 0.18),
    badgeText: hslv("--muted-foreground"),
  },
  unknown: {
    stroke: hslv("--muted-foreground"),
    badgeBg: hslv("--muted-foreground", 0.18),
    badgeText: hslv("--muted-foreground"),
  },
} as const;
