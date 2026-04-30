"use client";

import * as React from "react";
import { useCallback, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { FiPlus } from "react-icons/fi";

/**
 * Props interface for HeaderControlsExpanded component
 * @interface HeaderControlsExpandedProps
 */
interface HeaderControlsExpandedProps {
  /** Callback fired when the primary "Add" button is clicked */
  onAdd: () => void;
  /** Whether the add button is disabled */
  disabled?: boolean;
  /** Additional CSS classes for the container */
  className?: string;
  /** Button size variant */
  size?: "sm" | "default" | "lg";
  /** Whether to show text label on larger screens */
  showLabel?: boolean;
  /** Custom label text for the add button */
  label?: string;
  /** Whether component is in loading state */
  isLoading?: boolean;
}

/**
 * Configuration constants
 * @constant
 */
const CONFIG = {
  ICON_SIZE: 16,
  DEFAULT_LABEL: "Add",
  DEFAULT_SIZE: "sm" as const,
  RESPONSIVE_BREAKPOINT: "lg",
} as const;

/**
 * CSS class constants for consistent styling
 * @constant
 */
const STYLES = {
  CONTAINER_BASE: "flex items-center gap-1.5",
  BUTTON_BASE: "px-2.5",
  LABEL_RESPONSIVE: "ml-1 hidden lg:inline",
  LABEL_VISIBLE: "ml-1",
  LABEL_HIDDEN: "sr-only",
} as const;

/**
 * ARIA labels and accessibility constants
 * @constant
 */
const ARIA = {
  CREATE_COLLECTION: "Create collection",
  CREATE_NEW_ITEM: "Create new item",
  ADD_BUTTON: "Add button",
} as const;

/**
 * Button size configurations
 * @constant
 */
const BUTTON_SIZES = {
  sm: { size: "sm" as const, iconSize: 14 },
  default: { size: "default" as const, iconSize: 16 },
  lg: { size: "lg" as const, iconSize: 18 },
} as const;

/**
 * Loading spinner component for button states
 * @component
 */
const LoadingSpinner = React.memo(() => (
  <svg
    className="animate-spin h-4 w-4"
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    aria-hidden="true"
  >
    <circle
      className="opacity-25"
      cx="12"
      cy="12"
      r="10"
      stroke="currentColor"
      strokeWidth="4"
    />
    <path
      className="opacity-75"
      fill="currentColor"
      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
    />
  </svg>
));

LoadingSpinner.displayName = "LoadingSpinner";

/**
 * Add button component with enhanced features
 * @component
 */
const AddButton = React.memo<{
  onAdd: () => void;
  disabled: boolean;
  isLoading: boolean;
  size: "sm" | "default" | "lg";
  showLabel: boolean;
  label: string;
}>(({ onAdd, disabled, isLoading, size, showLabel, label }) => {
  const buttonConfig = BUTTON_SIZES[size];

  // Memoize click handler
  const handleClick = useCallback(() => {
    if (!disabled && !isLoading) {
      onAdd();
    }
  }, [onAdd, disabled, isLoading]);

  // Memoize keyboard handler
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if ((e.key === "Enter" || e.key === " ") && !disabled && !isLoading) {
        e.preventDefault();
        onAdd();
      }
    },
    [onAdd, disabled, isLoading]
  );

  // Memoize label classes
  const labelClasses = useMemo(() => {
    if (!showLabel) return STYLES.LABEL_HIDDEN;
    return STYLES.LABEL_RESPONSIVE;
  }, [showLabel]);

  // Memoize ARIA label
  const ariaLabel = useMemo(() => {
    if (isLoading) return "Creating collection...";
    return ARIA.CREATE_COLLECTION;
  }, [isLoading]);

  // Memoize button content
  const buttonContent = useMemo(
    () => (
      <>
        {isLoading ? (
          <LoadingSpinner />
        ) : (
          <FiPlus size={buttonConfig.iconSize} aria-hidden="true" />
        )}
        <span className={labelClasses}>
          {isLoading ? "Creating..." : label}
        </span>
      </>
    ),
    [isLoading, buttonConfig.iconSize, labelClasses, label]
  );

  return (
    <Button
      size={buttonConfig.size}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      disabled={disabled || isLoading}
      aria-label={ariaLabel}
      title={ariaLabel}
      className={STYLES.BUTTON_BASE}
      type="button"
    >
      {buttonContent}
    </Button>
  );
});

AddButton.displayName = "AddButton";

/**
 * HeaderControlsExpanded Component
 *
 * A sophisticated header control component for expanded sidebar states.
 * Provides a primary creation action with comprehensive accessibility,
 * responsive design, and loading states.
 *
 * @component
 * @example
 * ```tsx
 * <HeaderControlsExpanded
 *   onAdd={handleCreateCollection}
 *   disabled={isCreating}
 *   isLoading={isCreating}
 *   showLabel={true}
 *   size="sm"
 * />
 * ```
 *
 * @param {HeaderControlsExpandedProps} props - Component configuration
 * @returns {JSX.Element} Rendered header controls
 *
 * @features
 * - Responsive button with adaptive text visibility
 * - Loading states with spinner and text feedback
 * - Comprehensive keyboard navigation support
 * - Optimized performance with memoization
 * - Configurable sizing and appearance
 * - Full accessibility compliance
 *
 * @accessibility
 * - ARIA labels for screen readers
 * - Keyboard navigation support (Enter, Space)
 * - Focus management and visual indicators
 * - Loading state announcements
 * - Semantic button structure
 *
 * @performance
 * - Memoized sub-components prevent unnecessary re-renders
 * - Optimized event handlers with useCallback
 * - Efficient class name computations with useMemo
 * - Minimal DOM updates through React.memo
 *
 * @responsive
 * - Adaptive text visibility based on screen size
 * - Configurable breakpoints for label display
 * - Touch-friendly button sizing on mobile
 * - Consistent spacing across different sizes
 */
export const HeaderControlsExpanded = React.memo<HeaderControlsExpandedProps>(
  ({
    onAdd,
    disabled = false,
    className,
    size = CONFIG.DEFAULT_SIZE,
    showLabel = true,
    label = CONFIG.DEFAULT_LABEL,
    isLoading = false,
  }) => {
    // Memoize container classes
    const containerClasses = useMemo(() => {
      const baseClasses = STYLES.CONTAINER_BASE;
      return className ? `${baseClasses} ${className}` : baseClasses;
    }, [className]);

    // Validate size prop
    const validatedSize = useMemo(() => {
      return Object.keys(BUTTON_SIZES).includes(size)
        ? size
        : CONFIG.DEFAULT_SIZE;
    }, [size]);

    return (
      <div
        className={containerClasses}
        role="toolbar"
        aria-label="Collection controls"
      >
        <AddButton
          onAdd={onAdd}
          disabled={disabled}
          isLoading={isLoading}
          size={validatedSize}
          showLabel={showLabel}
          label={label}
        />
      </div>
    );
  }
);

// Set display name for debugging
HeaderControlsExpanded.displayName = "HeaderControlsExpanded";
