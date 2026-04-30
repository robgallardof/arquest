"use client";

import { Button } from "@/components/ui/button";
import { FiChevronsRight } from "react-icons/fi";

/**
 * Props for the HeaderControlsCollapsed component.
 */
type CollapsedProps = {
  /**
   * Fired when the "Expand" button is clicked.
   * This should toggle your `collapsed` state to false.
   * (No imperative resize needed; Allotment handles the layout.)
   */
  onExpand: () => void;
};

/**
 * HeaderControlsCollapsed
 *
 * Minimal controls for a collapsed sidebar.
 * We keep a single prominent "Expand" action to restore the pane.
 * All width-related controls were removed because the resizable behavior
 * is managed by Allotment (drag the sash, double-click to reset).
 *
 * Accessibility:
 * - Button exposes aria-label and title.
 */
export function HeaderControlsCollapsed({ onExpand }: CollapsedProps) {
  return (
    <div className="flex items-center gap-1.5">
      <Button
        size="sm"
        onClick={onExpand}
        aria-label="Expand sidebar"
        title="Expand"
        className="px-2.5"
      >
        <FiChevronsRight size={16} />
      </Button>
    </div>
  );
}
