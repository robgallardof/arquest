"use client";
import * as React from "react";
import { gsap } from "gsap";
import type { Refish } from "../utils";

/** Animates collapse/expand; only [data-collapse-fade="1"] are faded/slid. */
export function useGsapCollapse(
  containerRef: Refish<HTMLElement>,
  collapsed: boolean
) {
  React.useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const tl = gsap.timeline({
      defaults: { ease: "power1.out", duration: 0.18 },
    });
    const fading = container.querySelectorAll('[data-collapse-fade="1"]');

    if (collapsed) {
      tl.to(fading, { opacity: 0, x: -4, stagger: 0.01 }, 0).fromTo(
        container.querySelectorAll(".js-rail-item"),
        { opacity: 0, x: -6, scale: 0.96 },
        { opacity: 1, x: 0, scale: 1, stagger: 0.03 },
        0.05
      );
    } else {
      tl.fromTo(
        fading,
        { opacity: 0, x: -6 },
        { opacity: 1, x: 0, stagger: 0.01 }
      );
    }

    return () => {
      tl.kill();
    };
  }, [containerRef, collapsed]);
}
