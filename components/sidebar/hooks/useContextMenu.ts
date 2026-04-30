"use client";

import * as React from "react";

/**
 * Manages the state and positioning for a context menu bound to an item id.
 * @returns Helpers and state to open/close the menu from mouse or keyboard.
 */
export function useContextMenu<TId extends string | null>() {
  const [open, setOpen] = React.useState(false);
  const [x, setX] = React.useState(0);
  const [y, setY] = React.useState(0);
  const [targetId, setTargetId] = React.useState<TId | null>(null);

  const openFromMouse = React.useCallback((e: React.MouseEvent, id: TId) => {
    e.preventDefault();
    setTargetId(id);
    setX(e.clientX);
    setY(e.clientY);
    setOpen(true);
  }, []);

  const openFromKey = React.useCallback(
    (e: React.KeyboardEvent<HTMLElement>, id: TId) => {
      if ((e.shiftKey && e.key === "F10") || e.key === "ContextMenu") {
        e.preventDefault();
        const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
        setTargetId(id);
        setX(rect.left + rect.width / 2);
        setY(rect.top + rect.height);
        setOpen(true);
      }
    },
    []
  );

  const close = React.useCallback(() => setOpen(false), []);

  return {
    open,
    x,
    y,
    targetId,
    openFromMouse,
    openFromKey,
    close,
    setTargetId,
  };
}
