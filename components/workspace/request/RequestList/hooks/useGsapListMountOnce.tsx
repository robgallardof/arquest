"use client";
import * as React from "react";
import { gsap } from "gsap";

type Options = {
  y?: number; // default 4
  stagger?: number; // default 0.02
  duration?: number; // default 0.18
  selector?: string; // default ":scope > li"
  ease?: string; // default "power1.out"
};

/**
 * Mount-only enter animation for direct children.
 * Animates only items that haven't been marked as mounted.
 */
export function useGsapListMountOnce(
  refish:
    | React.RefObject<HTMLUListElement>
    | React.MutableRefObject<HTMLUListElement | null>
    | null
    | undefined,
  count: number,
  opts: Options = {}
) {
  const {
    y = 4,
    stagger = 0.02,
    duration = 0.18,
    selector = ":scope > li",
    ease = "power1.out",
  } = opts;

  React.useEffect(() => {
    if (!refish || typeof refish !== "object" || !("current" in refish)) return;
    const ul = (refish as React.RefObject<HTMLUListElement>).current;
    if (!ul) return;

    const prefersReduced = window.matchMedia?.(
      "(prefers-reduced-motion: reduce)"
    )?.matches;
    if (prefersReduced) return;

    const ctx = gsap.context(() => {
      const fresh = Array.from(
        ul.querySelectorAll<HTMLElement>(selector)
      ).filter((el) => el.dataset.mounted !== "true");

      if (!fresh.length) return;

      gsap.fromTo(
        fresh,
        { opacity: 0, y },
        { opacity: 1, y: 0, stagger, duration, ease }
      );

      fresh.forEach((el) => (el.dataset.mounted = "true"));
    }, ul);

    return () => ctx.revert();
  }, [refish, count, y, stagger, duration, selector, ease]);
}
