"use client";
import * as React from "react";
import { gsap } from "gsap";
import type { Refish } from "../utils";

/** Adds subtle bottom border shadow to the header while scrolling (smoothed). */
export function useHeaderShadowOnScroll(
  containerRef: Refish<HTMLElement>,
  headerRef: Refish<HTMLDivElement>,
  _collapsed: boolean
) {
  React.useEffect(() => {
    const container = containerRef.current;
    const header = headerRef.current;
    if (!container || !header) return;

    const viewport = container.querySelector(
      "[data-radix-scroll-area-viewport]"
    ) as HTMLDivElement | null;
    if (!viewport) return;

    // quickTo suaviza cambios sin crear tweens por scroll event
const setShadow = gsap.quickTo(header, "boxShadow", {
    duration: 0.18,
    ease: "power2.out",
    overwrite: "auto",
}) as unknown as (value: string) => void;

    let raf = 0;
    const loop = () => {
      raf = 0;
      const v = Math.min(1, viewport.scrollTop / 24);
      const shadow =
        v > 0 ? "0 1px 0 0 hsl(var(--border))" : "0 0 0 0 rgba(0,0,0,0)";
      setShadow(shadow);
    };

    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(loop);
    };

    viewport.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => {
      viewport.removeEventListener("scroll", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [containerRef, headerRef, _collapsed]);
}
