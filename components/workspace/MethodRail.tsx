"use client";

import { useEffect, useRef } from "react";
import { gsap } from "gsap";
import { HTTP_METHODS, type HttpMethod, isHttpMethod } from "@/types/http";

/**
 * MethodRail
 * ----------
 * Horizontal selector for HTTP methods (GET, POST, PUT, etc).
 *
 * Features:
 * - Renders all supported HTTP methods from a shared constant (`HTTP_METHODS`).
 * - Responsive horizontal scroll with overflow handling.
 * - Animates underline using GSAP to selected tab.
 * - Accessible: keyboard + screen reader.
 *
 * @param value The currently selected HTTP method (e.g. "GET").
 * @param onChange Callback when a new method is selected.
 * @returns A horizontally scrollable method selector.
 */
export function MethodRail({
  value,
  onChange,
}: {
  value: HttpMethod | string;
  onChange: (method: HttpMethod) => void;
}) {
  const railRef = useRef<HTMLDivElement>(null);
  const underlineRef = useRef<HTMLDivElement>(null);

  const METHODS: readonly HttpMethod[] = HTTP_METHODS;
  const active: HttpMethod = isHttpMethod(value)
    ? (value as HttpMethod)
    : "GET";

  useEffect(() => {
    const el = railRef.current?.querySelector<HTMLButtonElement>(
      `button[data-method="${active}"]`
    );
    if (el && underlineRef.current && railRef.current) {
      const { offsetLeft, offsetWidth } = el;
      gsap.to(underlineRef.current, {
        x: offsetLeft,
        width: offsetWidth,
        duration: 0.25,
        ease: "power2.out",
      });

      el.scrollIntoView({ block: "nearest", inline: "nearest" });
    }
  }, [active]);

  return (
    <div
      ref={railRef}
      role="tablist"
      aria-label="HTTP Method"
      className="relative flex gap-1 overflow-x-auto pb-1"
    >
      <div
        ref={underlineRef}
        className="rail-underline absolute bottom-0 h-0.5 rounded bg-primary"
        style={{ width: 0, transform: "translateX(0px)" }}
        aria-hidden
      />

      {METHODS.map((m) => {
        const selected = active === m;
        return (
          <button
            key={m}
            data-method={m}
            role="tab"
            aria-selected={selected}
            className={[
              "px-2 py-1 rounded text-xs font-medium ring-1 transition-colors whitespace-nowrap",
              selected
                ? "bg-primary/10 text-primary ring-primary/30"
                : "bg-muted text-foreground ring-border hover:bg-accent",
            ].join(" ")}
            onClick={() => onChange(m)}
          >
            {m}
          </button>
        );
      })}
    </div>
  );
}
