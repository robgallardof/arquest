"use client";

import * as React from "react";
import type { HttpMethod } from "@/types/http";

/**
 * MethodSelector
 * --------------
 * Modern, responsive HTTP method selector (pill buttons).
 * - Horizontal scroll on narrow screens
 * - Clear color coding per method
 * - Keyboard support (Left/Right arrows)
 */
export function MethodSelector(props: {
  value: HttpMethod;
  onChange: (m: HttpMethod) => void;
}) {
  const { value, onChange } = props;

  const METHODS = React.useMemo(
    () =>
      [
        "GET",
        "POST",
        "PUT",
        "PATCH",
        "DELETE"
      ] as HttpMethod[],
    []
  );

  const tone: Record<string, string> = {
    GET: "text-emerald-500 ring-emerald-500/30 bg-emerald-500/10",
    POST: "text-sky-500 ring-sky-500/30 bg-sky-500/10",
    PUT: "text-amber-500 ring-amber-500/30 bg-amber-500/10",
    PATCH: "text-violet-500 ring-violet-500/30 bg-violet-500/10",
    DELETE: "text-rose-500 ring-rose-500/30 bg-rose-500/10",
    HEAD: "text-slate-400 ring-slate-400/30 bg-slate-400/10",
    OPTIONS: "text-slate-400 ring-slate-400/30 bg-slate-400/10",
  };

  const onKey = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
    e.preventDefault();
    const idx = METHODS.indexOf(value);
    const next =
      e.key === "ArrowRight"
        ? METHODS[(idx + 1) % METHODS.length]
        : METHODS[(idx - 1 + METHODS.length) % METHODS.length];
    onChange(next);
  };

  return (
    <div
      role="tablist"
      aria-label="HTTP method"
      className="flex items-center gap-1 overflow-x-auto rounded-md border bg-background p-1"
      onKeyDown={onKey}
    >
      {METHODS.map((m) => {
        const active = m === value;
        return (
          <button
            key={m}
            role="tab"
            aria-selected={active}
            onClick={() => onChange(m)}
            className={[
              "whitespace-nowrap rounded-md px-2.5 py-1 text-[13px] font-semibold tracking-tight ring-1 transition",
              active
                ? `${tone[m]}`
                : "text-foreground/80 ring-border hover:bg-accent",
            ].join(" ")}
            title={m}
          >
            {m}
          </button>
        );
      })}
    </div>
  );
}
