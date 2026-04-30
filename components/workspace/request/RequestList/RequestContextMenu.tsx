"use client";

import * as React from "react";
import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useCallback,
  memo,
} from "react";
import { createPortal } from "react-dom";
import { Separator } from "@/components/ui/separator";
import { FiEdit2, FiTrash2 } from "react-icons/fi";

/**
 * RequestContextMenuProps
 * -----------------------
 * Lightweight context menu rendered at viewport (x, y).
 */
export type RequestContextMenuProps = {
  /** Whether the menu is visible. */
  open: boolean;
  /** Client X where the menu should appear. */
  x: number;
  /** Client Y where the menu should appear. */
  y: number;
  /** Whether the delete action is enabled. */
  canDelete: boolean;
  /** Handler for rename action. */
  onRename: () => void;
  /** Handler for delete action. */
  onDelete: () => void;
  /** Close callback (outside click, ESC, or after action). */
  onClose: () => void;
};

/** Layout constants. */
const CONFIG = {
  PADDING: 8, // viewport padding when clamping
  GAP: 8, // offset from cursor
} as const;

/** Tailwind class tokens. */
const STYLES = {
  WRAP:
    "fixed z-50 rounded-md border bg-popover/95 p-1 shadow-lg backdrop-blur-sm ring-1 ring-border w-44 sm:w-48 max-w-[calc(100vw-16px)]",
  ITEM:
    "flex w-full items-center gap-2 rounded px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
  ITEM_DANGER:
    "text-destructive hover:bg-destructive/10 focus-visible:ring-destructive/40",
} as const;

/** ARIA strings. */
const ARIA = {
  MENU: "Request actions",
  RENAME: "Rename request",
  DELETE: "Delete request",
} as const;

/**
 * RequestContextMenu
 * ------------------
 * - Clamped to viewport (no overflow off-screen).
 * - Closes on outside click and ESC.
 * - Keyboard support: ArrowUp/Down, Home/End, Enter, Escape.
 * - Hooks are **never** called conditionally.
 */
export const RequestContextMenu = memo(function RequestContextMenu({
  open,
  x,
  y,
  canDelete,
  onRename,
  onDelete,
  onClose,
}: RequestContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  const firstItemRef = useRef<HTMLButtonElement>(null);

  // Portal target (set after mount to avoid SSR/document access during render)
  const [portalTarget, setPortalTarget] = React.useState<HTMLElement | null>(
    null
  );
  useEffect(() => {
    if (typeof document !== "undefined") {
      setPortalTarget(document.body);
    }
  }, []);

  // Position state (updated & clamped when open/coords change)
  const [pos, setPos] = React.useState<{ left: number; top: number }>({
    left: x,
    top: y,
  });

  useLayoutEffect(() => {
    if (!open) return;

    const targetLeft = x + CONFIG.GAP;
    const targetTop = y + CONFIG.GAP;

    const raf = requestAnimationFrame(() => {
      const el = menuRef.current;
      const vw = typeof window !== "undefined" ? window.innerWidth : 0;
      const vh = typeof window !== "undefined" ? window.innerHeight : 0;

      if (!el || !vw || !vh) {
        setPos({ left: targetLeft, top: targetTop });
        return;
      }

      const rect = el.getBoundingClientRect();
      const maxLeft = vw - rect.width - CONFIG.PADDING;
      const maxTop = vh - rect.height - CONFIG.PADDING;

      setPos({
        left: Math.min(
          Math.max(CONFIG.PADDING, targetLeft),
          Math.max(CONFIG.PADDING, maxLeft)
        ),
        top: Math.min(
          Math.max(CONFIG.PADDING, targetTop),
          Math.max(CONFIG.PADDING, maxTop)
        ),
      });
    });

    return () => cancelAnimationFrame(raf);
  }, [open, x, y]);

  // Close on outside click / right click elsewhere / ESC
  useEffect(() => {
    if (!open) return;

    const onDocMouseDown = (e: MouseEvent) => {
      const root = menuRef.current;
      if (root && !root.contains(e.target as Node)) onClose();
    };
    const onDocContext = (e: MouseEvent) => {
      const root = menuRef.current;
      if (root && !root.contains(e.target as Node)) onClose();
    };
    const onDocKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };

    document.addEventListener("mousedown", onDocMouseDown);
    document.addEventListener("contextmenu", onDocContext);
    document.addEventListener("keydown", onDocKey);
    return () => {
      document.removeEventListener("mousedown", onDocMouseDown);
      document.removeEventListener("contextmenu", onDocContext);
      document.removeEventListener("keydown", onDocKey);
    };
  }, [open, onClose]);

  // Focus first item when opening
  useEffect(() => {
    if (!open) return;
    const id = requestAnimationFrame(() =>
      firstItemRef.current?.focus({ preventScroll: true })
    );
    return () => cancelAnimationFrame(id);
  }, [open]);

  // Keyboard navigation within the menu
  const onMenuKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      const root = menuRef.current;
      if (!root) return;

      const items = Array.from(
        root.querySelectorAll<HTMLButtonElement>(
          "[data-menu-item]:not(:disabled)"
        )
      );
      if (!items.length) return;

      const idx = items.findIndex((el) => el === document.activeElement);

      if (e.key === "ArrowDown") {
        e.preventDefault();
        items[(idx + 1 + items.length) % items.length]?.focus();
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        items[(idx - 1 + items.length) % items.length]?.focus();
      } else if (e.key === "Home") {
        e.preventDefault();
        items[0]?.focus();
      } else if (e.key === "End") {
        e.preventDefault();
        items[items.length - 1]?.focus();
      }
    },
    []
  );

  // After all hooks: allow early return safely
  if (!open || !portalTarget) return null;

  return createPortal(
    <div
      ref={menuRef}
      role="menu"
      aria-label={ARIA.MENU}
      className={STYLES.WRAP}
      style={{ left: pos.left, top: pos.top }}
      onContextMenu={(e) => e.preventDefault()}
      onMouseDown={(e) => e.stopPropagation()}
      onKeyDown={onMenuKeyDown}
    >
      <button
        ref={firstItemRef}
        type="button"
        role="menuitem"
        data-menu-item
        aria-label={ARIA.RENAME}
        className={STYLES.ITEM}
        onClick={() => {
          onRename();
          onClose();
        }}
      >
        <FiEdit2 size={16} />
        <span>Rename</span>
      </button>

      <Separator className="my-1" />

      <button
        type="button"
        role="menuitem"
        data-menu-item
        aria-label={ARIA.DELETE}
        disabled={!canDelete}
        className={[
          STYLES.ITEM,
          STYLES.ITEM_DANGER,
          !canDelete ? "opacity-50 cursor-not-allowed" : "",
        ].join(" ")}
        onClick={() => {
          if (!canDelete) return;
          onDelete();
          onClose();
        }}
      >
        <FiTrash2 size={16} />
        <span>Delete</span>
      </button>
    </div>,
    portalTarget
  );
});
