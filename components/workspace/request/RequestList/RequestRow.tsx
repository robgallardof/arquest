"use client";

import * as React from "react";
import { useLayoutEffect, useRef, useEffect } from "react";
import { gsap } from "gsap";
import { FiEdit2, FiTrash2, FiCheck, FiX } from "react-icons/fi";
import type { HttpMethod } from "@/types/http";

const ICON = 14;

type Props = {
  id: string;
  name: string;
  url: string;
  method: HttpMethod;
  headerCount?: number;
  paramCount?: number;

  active: boolean;
  isEditing: boolean;
  editingName: string;

  onChangeEditingName: (v: string) => void;
  onCommitRename: () => void;
  onCancelRename: () => void;

  onSelect: (id: string) => void;
  onStartRename: (id: string, currentName: string) => void;
  onDelete?: (id: string) => void;

  onOpenContextMenuMouse: (id: string, e: React.MouseEvent) => void;
  onOpenContextMenuKey: (
    id: string,
    e: React.KeyboardEvent<HTMLElement>
  ) => void;
};

/** Pill: span that accepts native span props (title, className, etc.). */
type PillProps = React.ComponentPropsWithoutRef<"span">;
const Pill = React.forwardRef<HTMLSpanElement, PillProps>(function Pill(
  { className, children, ...rest },
  ref
) {
  return (
    <span
      ref={ref}
      {...rest}
      className={[
        "inline-flex items-center rounded-full bg-muted px-1.5 py-0.5",
        "text-[10px] font-medium text-muted-foreground",
        className ?? "",
      ].join(" ")}
    >
      {children}
    </span>
  );
});

/**
 * Returns a hard-truncated string:
 * - If length <= limit, returns as-is.
 * - If length > limit, returns first `limit` chars + "…".
 * Use this for deterministic ellipsis (not width-based).
 */
function hardEllipsis(input: string, limit = 10): string {
  if (!input) return "";
  return input.length > limit ? input.slice(0, limit) + "…" : input;
}

/** Small icon button with focus ring and hover states. */
function IconButton(props: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const { className = "", ...rest } = props;
  return (
    <button
      type="button"
      className={[
        "inline-flex h-6 w-6 items-center justify-center rounded-md",
        "text-foreground/75 hover:text-foreground",
        "hover:bg-black/5 dark:hover:bg-white/5",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
        className,
      ].join(" ")}
      {...rest}
    />
  );
}

/**
 * RequestRow
 * ----------
 * - Mount-only entrance animation (opacity/translate).
 * - Name on top, URL below (deterministic ellipsis).
 * - Tool icons on the right, always visible.
 * - Inline rename with confirm/cancel buttons.
 * - **No color animations in GSAP** (avoids splitColor errors with CSS vars).
 */
export function RequestRow({
  id,
  name,
  url,
  method,
  headerCount = 0,
  paramCount = 0,
  active,
  isEditing,
  editingName,
  onChangeEditingName,
  onCommitRename,
  onCancelRename,
  onSelect,
  onStartRename,
  onDelete,
  onOpenContextMenuMouse,
  onOpenContextMenuKey,
}: Props) {
  const rowRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  /** Mount-only entrance animation (safe: transform/opacity only). */
  useLayoutEffect(() => {
    if (!rowRef.current) return;
    const prefersReduced = window.matchMedia?.(
      "(prefers-reduced-motion: reduce)"
    )?.matches;
    if (prefersReduced) return;

    const ctx = gsap.context(() => {
      gsap.fromTo(
        rowRef.current,
        { opacity: 0, y: 4 },
        { opacity: 1, y: 0, duration: 0.18, ease: "power1.out" }
      );
    }, rowRef);
    return () => ctx.revert();
  }, []);

  /**
   * On enter edit mode:
   * - Focus the input
   * - Micro-motion (transform/opacity), rely on Tailwind for the focus ring.
   */
  useEffect(() => {
    if (!isEditing || !inputRef.current) return;

    const el = inputRef.current;
    el.focus();

    const prefersReduced = window.matchMedia?.(
      "(prefers-reduced-motion: reduce)"
    )?.matches;
    if (prefersReduced) return;

    const ctx = gsap.context(() => {
      gsap.fromTo(
        el,
        { opacity: 0.95, y: -2, scale: 0.995 },
        { opacity: 1, y: 0, scale: 1, duration: 0.18, ease: "power1.out" }
      );
    }, inputRef);
    return () => ctx.revert();
  }, [isEditing]);

  return (
    <div
      ref={rowRef}
      role="button"
      tabIndex={0}
      onClick={() => onSelect(id)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect(id);
        } else if (e.key === "ContextMenu" || (e.shiftKey && e.key === "F10")) {
          onOpenContextMenuKey(id, e);
        } else if (e.key === "F2" && !isEditing) {
          e.preventDefault();
          onStartRename(id, name);
        }
      }}
      onContextMenu={(e) => onOpenContextMenuMouse(id, e)}
      className={[
        "w-full rounded-md outline-none px-2 py-1.5",
        "flex items-center justify-between gap-2",
        "hover:bg-accent focus-visible:ring-2 focus-visible:ring-primary/40",
        "text-[13px] md:text-sm",
        active ? "bg-primary/10 ring-1 ring-primary/30" : "",
      ].join(" ")}
      aria-current={active ? "true" : undefined}
      aria-pressed={active ? "true" : "false"}
    >
      {/* Left: method + name (top) + url (bottom) */}
      <div className="min-w-0 flex-1">
        <div className="flex items-start gap-2 min-w-0">
          <Pill>{method}</Pill>

          {isEditing ? (
            <div className="flex items-center gap-1.5 min-w-0">
              <input
                ref={inputRef}
                value={editingName}
                onChange={(e) => onChangeEditingName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") onCommitRename();
                  if (e.key === "Escape") onCancelRename();
                }}
                onBlur={onCommitRename}
                aria-label="Rename request"
                className="w-full bg-transparent outline-none text-[13px] md:text-sm px-1 py-0.5 rounded-[4px] ring-1 ring-border focus:ring-2 focus:ring-primary/40"
              />
              <IconButton
                aria-label="Confirm rename"
                title="Confirm"
                onClick={(e) => {
                  e.stopPropagation();
                  onCommitRename();
                }}
              >
                <FiCheck size={ICON} />
              </IconButton>
              <IconButton
                aria-label="Cancel rename"
                title="Cancel"
                onClick={(e) => {
                  e.stopPropagation();
                  onCancelRename();
                }}
              >
                <FiX size={ICON} />
              </IconButton>
            </div>
          ) : (
            <div className="min-w-0 flex flex-col">
              {/* Name on top */}
              <span className="truncate">{name || "(unnamed request)"}</span>

              {/* URL below — hard ellipsis, full value in title */}
              <span
                className="text-muted-foreground break-all"
                title={url}
                aria-label={url}
              >
                {hardEllipsis(url, 25)}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Right: counts + tools */}
      {!isEditing && (
        <div className="shrink-0 inline-flex items-center gap-2">
          {headerCount > 0 && (
            <Pill title="Enabled headers">{headerCount}H</Pill>
          )}
          {paramCount > 0 && <Pill title="Enabled params">{paramCount}P</Pill>}

          <IconButton
            aria-label="Rename"
            title="Rename (F2)"
            onClick={(e) => {
              e.stopPropagation();
              onStartRename(id, name);
            }}
          >
            <FiEdit2 size={ICON} />
          </IconButton>

          {onDelete && (
            <IconButton
              aria-label="Delete"
              title="Delete"
              onClick={(e) => {
                e.stopPropagation();
                onDelete(id);
              }}
              className="text-red-500 hover:bg-red-500/10 focus-visible:ring-red-400/40"
            >
              <FiTrash2 size={ICON} />
            </IconButton>
          )}
        </div>
      )}
    </div>
  );
}
