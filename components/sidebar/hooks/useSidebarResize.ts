"use client";

import * as React from "react";

/**
 * Pointer-based horizontal resize for the sidebar with rAF throttling.
 * Keeps re-render pressure low by batching pointermove updates.
 */
export function useSidebarResize(opts: {
  width: number;
  minWidth: number;
  maxWidth: number;
  onWidthChange: (w: number) => void;
  onCollapsedChange: (c: boolean) => void;
}) {
  const { width, minWidth, maxWidth, onWidthChange, onCollapsedChange } = opts;

  const draggingRef = React.useRef(false);
  const startXRef = React.useRef(0);
  const startWRef = React.useRef(0);
  const frameRef = React.useRef<number | null>(null);
  const lastXRef = React.useRef<number>(0);

  const clamp = (n: number, min: number, max: number) =>
    Math.max(min, Math.min(max, n));

  const flush = React.useCallback(() => {
    frameRef.current = null;
    if (!draggingRef.current) return;
    const dx = lastXRef.current - startXRef.current;
    const next = clamp(Math.round(startWRef.current + dx), minWidth, maxWidth);
    onCollapsedChange(false);
    onWidthChange(next);
  }, [minWidth, maxWidth, onWidthChange, onCollapsedChange]);

  const onPointerMove = React.useCallback(
    (e: PointerEvent) => {
      if (!draggingRef.current) return;
      lastXRef.current = e.clientX ?? 0;
      if (frameRef.current == null) {
        frameRef.current = requestAnimationFrame(flush);
      }
    },
    [flush]
  );

  const stopDragging = React.useCallback(() => {
    draggingRef.current = false;
    if (frameRef.current != null) {
      cancelAnimationFrame(frameRef.current);
      frameRef.current = null;
    }
    window.removeEventListener("pointermove", onPointerMove);
    window.removeEventListener("pointerup", stopDragging);
  }, [onPointerMove]);

  const startDragging = React.useCallback(
    (e: React.PointerEvent<HTMLElement>) => {
      e.preventDefault();
      draggingRef.current = true;
      startXRef.current = e.clientX ?? 0;
      startWRef.current = width;

      window.addEventListener("pointermove", onPointerMove, { passive: true });
      window.addEventListener("pointerup", stopDragging);
      try {
        (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
      } catch {}
    },
    [onPointerMove, stopDragging, width]
  );

  React.useEffect(() => {
    return () => {
      if (draggingRef.current) {
        stopDragging();
      }
    };
  }, [stopDragging]);

  return { startDragging };
}
