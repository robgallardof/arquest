"use client";

import * as React from "react";
import type { Collection, MenuItem } from "@/types/collections";

export const DEFAULT_WIDTH = 288;

/**
 * Structural ref compatible with `useRef<T>(null)` without deprecated types.
 * When needed in JSX `ref={}`, pass it via `asReactRef(refish)`.
 */
export type Refish<T extends HTMLElement> = { readonly current: T | null };

/** Keyboard event targeting a generic HTMLElement. */
export type KeyEvt = React.KeyboardEvent<HTMLElement>;

/** Clamp a number within [min, max]. */
export const clamp = (n: number, min: number, max: number) =>
  Math.max(min, Math.min(max, n));

/**
 * Returns collections filtered by a case-insensitive query.
 */
export function filterCollections(
  map: Record<string, Collection>,
  q: string
): Collection[] {
  const all = Object.values(map);
  if (!q) return all;
  const needle = q.toLowerCase();
  return all.filter((c) => c.name.toLowerCase().includes(needle));
}

/**
 * Builds the context menu for a given collection.
 */
export function buildMenuItems(
  current: Collection,
  fns: {
    startRename: (c: Collection) => void;
    duplicate: (c: Collection) => void;
    remove: (c: Collection) => void;
    exportJson: (c: Collection) => void;
  }
): MenuItem[] {
  return [
    { id: "rename", label: "Rename", onSelect: () => fns.startRename(current) },
    {
      id: "duplicate",
      label: "Duplicate",
      onSelect: () => fns.duplicate(current),
    },
    {
      id: "export",
      label: "Export (.json)",
      onSelect: () => fns.exportJson(current),
    },
    {
      id: "delete",
      label: "Delete",
      destructive: true,
      onSelect: () => fns.remove(current),
    },
  ];
}

/** True if value looks like a hex color (#RGB | #RRGGBB | #RRGGBBAA). */
export function isHexColor(v: string): boolean {
  return /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/.test(v);
}

/**
 * Returns a validated hex color or `undefined` if invalid.
 */
export function safeHex(v: string | undefined | null): string | undefined {
  return v && isHexColor(v) ? v : undefined;
}

/**
 * Coerces a structural ref (`Refish<T>`) into a React.RefObject<T>
 * so TypeScript accepts it in JSX `ref={...}`.
 */
export function asReactRef<T extends HTMLElement>(
  r: Refish<T>
): React.RefObject<T> {
  return r as unknown as React.RefObject<T>;
}

/**
 * Style helper to tint Lucide icons (they use `currentColor`).
 * Use like: <Folder style={tintStyle(col.iconColor)} />
 */
export function tintStyle(hex?: string): React.CSSProperties {
  return hex ? { color: hex } : {};
}
