"use client";

import * as React from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { Collection } from "@/types/collections";
import { FiFolder } from "react-icons/fi";
import { gsap } from "gsap";
import { JSX } from "react";
import { Refish } from "./utils";

/**
 * Props interface for the CollapsedRail component
 * @interface CollapsedRailProps
 */
interface CollapsedRailProps {
  /** Reference to the rail list element for external manipulation */
  railRef: Refish<HTMLUListElement>;
  /** Array of collections to display in the rail */
  collections: Collection[];
  /** ID of the currently active/selected collection */
  activeId?: string | null;
  /** Callback function triggered when a collection is selected */
  onSelect: (id: string) => void;
  /** Callback function triggered when right-click context menu is opened */
  onContext: (e: React.MouseEvent<HTMLButtonElement>, id: string) => void;
}

/**
 * Configuration constants
 * @constant
 */
const CONFIG = {
  DEFAULT_COLOR: "#3b82f6",
  ICON_SIZE: 14, // Estandarizado con otros componentes
  SWATCH_SIZE: 24,
  POPOVER_WIDTH: "calc(100vw-2rem)",
  POPOVER_MAX_WIDTH: "22rem",
  GRID_COLUMNS: 7,
  ANIMATION: {
    HOVER_SCALE: 1.08,
    DURATION: 0.15,
    EASE: "power2.out",
    DEFAULT_SCALE: 1,
  },
} as const;

/**
 * CSS class constants for consistent styling
 * @constant
 */
const STYLES = {
  RAIL_ITEM_BASE: `
    js-rail-item group relative 
    flex h-10 w-10 items-center justify-center 
    rounded-lg transition-all duration-150
    outline-none focus-visible:ring-2 focus-visible:ring-ring
  `,
  ACTIVE_STATE: "bg-accent shadow-sm ring-1 ring-primary/20",
  INACTIVE_STATE: "hover:bg-accent/60",
  ACTIVE_INDICATOR: `
    absolute -left-1 top-1/2 -translate-y-1/2 
    w-1 h-6 bg-primary rounded-r
  `,
  TOOLTIP_CONTENT: "text-xs font-medium",
  REQUEST_COUNT: "ml-2 text-muted-foreground",
} as const;

/**
 * Individual rail item component with memoization for performance
 * @component
 */
const RailItem = React.memo<{
  collection: Collection;
  isActive: boolean;
  onSelect: (id: string) => void;
  onContext: (e: React.MouseEvent<HTMLButtonElement>, id: string) => void;
}>(({ collection, isActive, onSelect, onContext }) => {
  /**
   * Handles mouse enter animation
   * @param {React.MouseEvent<HTMLButtonElement>} e - Mouse event
   */
  const handleMouseEnter = React.useCallback(
    (e: React.MouseEvent<HTMLButtonElement>) => {
      if (!isActive) {
        gsap.to(e.currentTarget, {
          scale: CONFIG.ANIMATION.HOVER_SCALE,
          duration: CONFIG.ANIMATION.DURATION,
          ease: CONFIG.ANIMATION.EASE,
        });
      }
    },
    [isActive]
  );

  /**
   * Handles mouse leave animation
   * @param {React.MouseEvent<HTMLButtonElement>} e - Mouse event
   */
  const handleMouseLeave = React.useCallback(
    (e: React.MouseEvent<HTMLButtonElement>) => {
      if (!isActive) {
        gsap.to(e.currentTarget, {
          scale: CONFIG.ANIMATION.DEFAULT_SCALE,
          duration: CONFIG.ANIMATION.DURATION,
          ease: CONFIG.ANIMATION.EASE,
        });
      }
    },
    [isActive]
  );

  /**
   * Handles collection selection
   */
  const handleClick = React.useCallback(() => {
    onSelect(collection.id);
  }, [collection.id, onSelect]);

  /**
   * Handles context menu
   * @param {React.MouseEvent<HTMLButtonElement>} e - Mouse event
   */
  const handleContextMenu = React.useCallback(
    (e: React.MouseEvent<HTMLButtonElement>) => {
      onContext(e, collection.id);
    },
    [collection.id, onContext]
  );

  // Compute derived values
  const requestCount = collection.requests?.length;
  const hasRequests = Boolean(requestCount && requestCount > 0);
  const ariaLabel = hasRequests
    ? `${collection.name} (${requestCount} requests)`
    : collection.name;

  // Compute icon styles
  const iconStyles = React.useMemo(
    () => ({
      color: collection.iconColor || undefined,
      fill:
        isActive && collection.iconColor
          ? `${collection.iconColor}20`
          : undefined,
    }),
    [collection.iconColor, isActive]
  );

  return (
    <li role="listitem">
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            className={`${STYLES.RAIL_ITEM_BASE} ${
              isActive ? STYLES.ACTIVE_STATE : STYLES.INACTIVE_STATE
            }`}
            aria-label={ariaLabel}
            aria-current={isActive ? "page" : undefined}
            onClick={handleClick}
            onContextMenu={handleContextMenu}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            type="button"
          >
            {/* Active state indicator */}
            {isActive && (
              <div className={STYLES.ACTIVE_INDICATOR} aria-hidden="true" />
            )}

            {/* Collection icon - Estandarizado con react-icons/fi */}
            <FiFolder
              size={CONFIG.ICON_SIZE}
              style={iconStyles}
              aria-hidden="true"
            />
          </button>
        </TooltipTrigger>

        <TooltipContent
          side="right"
          sideOffset={12}
          className={STYLES.TOOLTIP_CONTENT}
        >
          <span>{collection.name}</span>
          {hasRequests && (
            <span className={STYLES.REQUEST_COUNT}>({requestCount})</span>
          )}
        </TooltipContent>
      </Tooltip>
    </li>
  );
});

RailItem.displayName = "RailItem";

/**
 * CollapsedRail Component
 *
 * A minimal vertical navigation component designed for collapsed sidebar states.
 * Displays collections as interactive icon buttons with hover animations and tooltips.
 *
 * @component
 * @example
 * ```tsx
 * <CollapsedRail
 *   railRef={railRef}
 *   collections={collections}
 *   activeId={selectedId}
 *   onSelect={handleCollectionSelect}
 *   onContext={handleContextMenu}
 * />
 * ```
 *
 * @param {CollapsedRailProps} props - Component props
 * @returns {React.JSX.Element} Rendered collapsed rail navigation
 *
 * @features
 * - Smooth GSAP animations on hover interactions
 * - Clear visual indicators for active states
 * - Accessible keyboard navigation support
 * - Context menu integration
 * - Responsive tooltip information
 * - Optimized performance with memoization
 *
 * @accessibility
 * - ARIA labels for screen readers
 * - Proper semantic HTML structure
 * - Focus management with visible indicators
 * - Role attributes for navigation context
 *
 * @performance
 * - Memoized child components prevent unnecessary re-renders
 * - Optimized event handlers with useCallback
 * - Efficient style computations
 */
export function CollapsedRail({
  railRef,
  collections,
  activeId,
  onSelect,
  onContext,
}: CollapsedRailProps): React.JSX.Element {
  // Memoize collections to prevent unnecessary re-renders
  const memoizedCollections = React.useMemo(() => collections, [collections]);

  return (
    <TooltipProvider delayDuration={100}>
      <nav
        className="flex-1 min-h-0"
        aria-label="Collections navigation (collapsed view)"
        role="navigation"
      >
        <ScrollArea className="h-full">
          <ul
            ref={railRef}
            className="py-2 flex flex-col items-center gap-1"
            role="list"
            aria-label="Collection items"
          >
            {memoizedCollections.map((collection) => (
              <RailItem
                key={collection.id}
                collection={collection}
                isActive={activeId === collection.id}
                onSelect={onSelect}
                onContext={onContext}
              />
            ))}
          </ul>
        </ScrollArea>
      </nav>
    </TooltipProvider>
  );
}

// Set display name for debugging
CollapsedRail.displayName = "CollapsedRail";
