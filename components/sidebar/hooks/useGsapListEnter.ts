"use client";
import * as React from "react";
import { gsap } from "gsap";

type Options = {
  /** Y offset in px for the enter slide. Default: 4 */
  y?: number;
  /** Stagger between siblings. Default: 0.02 */
  stagger?: number;
  /** Duration for each item. Default: 0.18 */
  duration?: number;
  /** CSS selector for direct children to animate. Default: ":scope > li" */
  selector?: string;
};

/**
 * Fade/slide-in for direct children when list length changes.
 * - Scopes animations to the UL via gsap.context
 * - Respects prefers-reduced-motion
 * - Lets you tweak y, stagger, duration, selector
 */
export function useGsapListEnter(
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
  } = opts;

  React.useEffect(() => {
    const hasObjCurrent =
      refish && typeof refish === "object" && "current" in refish;
    if (!hasObjCurrent) return;

    const ul = (refish as React.RefObject<HTMLUListElement>).current;
    if (!ul) return;

    const prefersReduced = window.matchMedia?.(
      "(prefers-reduced-motion: reduce)"
    )?.matches;
    if (prefersReduced) return;

    const ctx = gsap.context(() => {
      const items = ul.querySelectorAll(selector);
      if (!items.length) return;

      gsap.fromTo(
        items,
        { opacity: 0, y },
        { opacity: 1, y: 0, stagger, duration, ease: "power1.out" }
      );
    }, ul);

    return () => ctx.revert();
  }, [refish, count, y, stagger, duration, selector]);
}
