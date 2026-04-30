"use client";

import * as React from "react";
import { useEffect, useRef } from "react";
import { gsap } from "gsap";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import type { RequestModel } from "@/lib/domain/models";
import { useStore } from "@/lib/state/store";
import { FiPlus, FiTrash2 } from "react-icons/fi";

/**
 * HeaderEditor
 * ------------
 * Responsive header key/value editor with top-right actions and bottom title.
 *
 * Layout (sticky):
 *  - Row 1: actions top-right (Add header)
 *  - Row 2: section title (left-aligned)
 *  - Separator: visual division from the list
 *
 * UX:
 *  - Add/remove/toggle headers with subtle GSAP animations.
 *  - Enter on last "Value" adds a new row.
 *  - Delete key on a row removes it.
 *  - Newly added row focuses "Key".
 *
 * Props:
 * @param req     Active request model (expects `headers` array).
 * @param colId   Collection id where the request lives.
 * @param title   Optional section title (defaults to "Headers").
 */
export function HeaderEditor({
  req,
  colId,
  title = "Headers",
}: {
  req: RequestModel;
  colId: string;
  title?: string;
}) {
  const { upsertRequest } = useStore();
  const headers = req.headers ?? [];

  const firstRowRef = useRef<HTMLDivElement | null>(null);
  const keyFocusRef = useRef<HTMLInputElement>(null);
  const rowRefs = useRef<Map<number, HTMLDivElement | null>>(new Map());

  function update(
    i: number,
    field: "key" | "value" | "enabled",
    value: string | boolean
  ) {
    const next = [...headers];
    if (field === "enabled") next[i].enabled = value as boolean;
    else next[i][field] = value as string;
    upsertRequest(colId, { ...req, headers: next });
  }

  function add() {
    const next = [{ key: "", value: "", enabled: true }, ...headers];
    upsertRequest(colId, { ...req, headers: next });
    requestAnimationFrame(() => {
      if (firstRowRef.current) {
        gsap.fromTo(
          firstRowRef.current,
          { scale: 0.98, opacity: 0, y: 4 },
          { scale: 1, opacity: 1, y: 0, duration: 0.22, ease: "power2.out" }
        );
      }
      keyFocusRef.current?.focus();
    });
  }

  function del(i: number) {
    const row = rowRefs.current.get(i);
    if (row) {
      gsap.to(row, {
        opacity: 0,
        scale: 0.96,
        y: 2,
        duration: 0.18,
        ease: "power2.inOut",
        onComplete: () => {
          const next = headers.filter((_, idx) => idx !== i);
          upsertRequest(colId, { ...req, headers: next });
        },
      });
    } else {
      const next = headers.filter((_, idx) => idx !== i);
      upsertRequest(colId, { ...req, headers: next });
    }
  }

  useEffect(() => {
    if (headers.length === 0) {
      document.getElementById("add-header-btn")?.focus();
    }
  }, [headers.length]);

  return (
    <div className="space-y-2 min-h-0">
      {/* Sticky header: actions (top-right) + title (bottom-left) */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/75">
        {/* Row 1: actions at top-right */}
        <div className="flex items-center justify-end px-2 sm:px-0 py-2">
          <Button id="add-header-btn" variant="ghost" onClick={add} className="gap-1.5">
            <FiPlus size={16} />
            <span className="hidden sm:inline">Header</span>
          </Button>
        </div>
        {/* Row 2: title at bottom-left */}
        <div className="px-2 sm:px-0 pb-2">
          <h2 className="text-sm font-semibold tracking-tight">{title}</h2>
        </div>
        <Separator />
      </div>

      {/* Rows */}
      <div className="space-y-1">
        {headers.map((h, i) => {
          const isFirst = i === 0;
          const isLast = i === headers.length - 1;
          const rowKey = `hdr-${i}`;

          return (
            <div
              key={rowKey}
              ref={(el) => {
                if (isFirst) firstRowRef.current = el;
                rowRefs.current.set(i, el);
              }}
              className={[
                "group grid grid-cols-1",
                "sm:grid-cols-8",
                "md:grid-cols-12",
                "gap-2 p-2 rounded transition-colors",
                "hover:bg-accent/50",
              ].join(" ")}
              onKeyDown={(e) => {
                if (e.key === "Delete") del(i);
              }}
            >
              {/* Key */}
              <div className="col-span-1 sm:col-span-4 md:col-span-5 min-w-0">
                <label className="sr-only" htmlFor={`hdr-key-${i}`}>
                  Header key
                </label>
                <Input
                  id={`hdr-key-${i}`}
                  ref={isFirst ? keyFocusRef : undefined}
                  placeholder="Key"
                  value={h.key}
                  onChange={(e) => update(i, "key", e.target.value)}
                  className="h-9"
                  title={h.key}
                />
              </div>

              {/* Value */}
              <div className="col-span-1 sm:col-span-4 md:col-span-5 min-w-0">
                <label className="sr-only" htmlFor={`hdr-val-${i}`}>
                  Header value
                </label>
                <Input
                  id={`hdr-val-${i}`}
                  placeholder="Value"
                  value={h.value}
                  onChange={(e) => update(i, "value", e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && isLast) add();
                  }}
                  className="h-9"
                  title={h.value}
                />
              </div>

              {/* Enabled toggle */}
              <div className="col-span-1 sm:col-span-3 md:col-span-1 order-last sm:order-none flex items-center">
                <label className="text-xs inline-flex items-center gap-2 px-1 select-none">
                  <input
                    type="checkbox"
                    checked={h.enabled}
                    onChange={(e) => update(i, "enabled", e.target.checked)}
                    className="h-4 w-4 accent-primary"
                    aria-label={`Enable header ${h.key || i + 1}`}
                  />
                  on
                </label>
              </div>

              {/* Delete button */}
              <div className="col-span-1 sm:col-span-1 md:col-span-1 order-last sm:order-none flex items-center justify-end">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => del(i)}
                  aria-label="Delete header"
                  title="Delete header"
                  className="opacity-100 sm:opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity"
                >
                  <FiTrash2 size={16} />
                </Button>
              </div>
            </div>
          );
        })}

        {headers.length === 0 && (
          <div className="text-xs text-muted-foreground px-1 py-2">
            No headers yet. Add your first one.
          </div>
        )}
      </div>
    </div>
  );
}
