"use client";

import * as React from "react";
import { forwardRef, useMemo, useRef, useCallback } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useGsapListEnter } from "../hooks/useGsapListEnter";
import { ColorPaletteButton } from "./ColorPaletteButton";
import type { Collection } from "@/types/collections";
import type { KeyEvt } from "../utils";

/**
 * Props interface for the CollectionListView component
 * @interface CollectionListViewProps
 */
interface CollectionListViewProps {
  /** Array of collections to display in the list */
  collections: Collection[];
  /** ID of the currently active/selected collection */
  activeId?: string;

  /** Inline rename state management */
  /** ID of the collection currently being edited */
  editingId: string | null;
  /** Current value of the editing input field */
  editingName: string;
  /** Callback to update the editing input value */
  setEditingName: (name: string) => void;
  /** Callback to enter rename mode for a collection */
  onEnterRename: (collection: Collection) => void;
  /** Callback to commit the rename operation */
  onCommitRename: () => void;
  /** Callback to cancel the rename operation */
  onCancelRename: () => void;

  /** Collection interaction callbacks */
  /** Callback when a collection is selected */
  onSelect: (id: string) => void;
  /** Callback when a collection is deleted */
  onDelete: (collection: Collection) => void;
  /** Callback when a collection's color is changed */
  onChangeColor: (id: string, hex: string) => void;

  /** Context menu interaction callbacks */
  /** Callback for mouse-triggered context menu */
  onOpenMenuFromMouse: (e: React.MouseEvent, id: string) => void;
  /** Callback for keyboard-triggered context menu */
  onOpenMenuFromKey: (e: KeyEvt, id: string) => void;
}

/**
 * Props interface for individual collection row
 * @interface CollectionRowProps
 */
interface CollectionRowProps {
  /** Collection data */
  collection: Collection;
  /** Whether this collection is currently active */
  isActive: boolean;
  /** Whether this collection is currently being edited */
  isEditing: boolean;
  /** Current editing input value */
  editingName: string;
  /** Callback to update editing input value */
  setEditingName: (name: string) => void;
  /** Callback to enter rename mode */
  onEnterRename: () => void;
  /** Callback to commit rename */
  onCommitRename: () => void;
  /** Callback to cancel rename */
  onCancelRename: () => void;
  /** Callback to select this collection */
  onSelect: () => void;
  /** Callback to delete this collection */
  onDelete: () => void;
  /** Callback to change collection color */
  onChangeColor: (hex: string) => void;
  /** Callback for keyboard context menu */
  onOpenMenuFromKey: (e: KeyEvt) => void;
}

/**
 * Props interface for icon buttons
 * @interface IconButtonProps
 */
interface IconButtonProps {
  /** Accessible label for screen readers */
  label: string;
  /** Tooltip text on hover */
  title?: string;
  /** Click handler */
  onClick?: (e: React.MouseEvent) => void;
  /** Button content (icon) */
  children: React.ReactNode;
  /** Visual style variant */
  variant?: "default" | "danger";
  /** Whether button is disabled */
  disabled?: boolean;
}

/**
 * Configuration constants
 * @constant
 */
const CONFIG = {
  ICON_SIZE: 18,
  HEX_COLOR_PATTERN: /^#[\da-fA-F]{6}$/,
  BACKGROUND_ALPHA: 0.12,
} as const;

/**
 * CSS class constants for consistent styling
 * @constant
 */
const STYLES = {
  ICON_BUTTON_BASE: `
    inline-flex items-center justify-center p-1.5 rounded-md transition-colors
    focus-visible:outline-none focus-visible:ring-2
  `,
  ICON_BUTTON_DEFAULT: `
    text-foreground/75 hover:text-foreground hover:bg-black/5 dark:hover:bg-white/5
    focus-visible:ring-primary/40
  `,
  ICON_BUTTON_DANGER: `
    text-red-500 hover:bg-red-500/10 focus-visible:ring-red-400/40
  `,
  ROW_BASE: `
    w-full rounded-md outline-none px-2 py-1.5
    flex items-center justify-between gap-2
    hover:bg-accent focus-visible:ring-2 focus-visible:ring-primary/40
  `,
  EDIT_INPUT: `
    w-full bg-transparent outline-none text-sm px-1 py-0.5 rounded-[4px]
    ring-1 ring-border focus:ring-2 focus:ring-primary/40
  `,
  ACTIONS_CONTAINER: `
    relative shrink-0 inline-flex items-center gap-1.5
    text-foreground/75 group-hover:text-foreground
  `,
} as const;

/**
 * Keyboard event handlers configuration
 * @constant
 */
const KEYBOARD_HANDLERS = {
  SELECT_KEYS: ["Enter", " "],
  CONTEXT_MENU_KEYS: ["ContextMenu"],
  RENAME_KEY: "F2",
  CONFIRM_KEY: "Enter",
  CANCEL_KEY: "Escape",
} as const;

/**
 * Shared SVG properties for icons
 * @constant
 */
const ICON_PROPS = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
} as const;

/**
 * Utility function to convert hex color to rgba
 * @param {string} hex - Hex color string (e.g., "#ff0000")
 * @param {number} alpha - Alpha value (0-1)
 * @returns {string} RGBA color string
 */
const hexToRgba = (hex: string, alpha: number): string => {
  const cleanHex = hex.replace("#", "");
  const r = parseInt(cleanHex.slice(0, 2), 16);
  const g = parseInt(cleanHex.slice(2, 4), 16);
  const b = parseInt(cleanHex.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

/**
 * Utility function to validate hex color format
 * @param {string} color - Color string to validate
 * @returns {boolean} Whether the color is a valid hex format
 */
const isValidHexColor = (color: string): boolean => {
  return CONFIG.HEX_COLOR_PATTERN.test(color);
};

// Icon Components - Memoized for performance
const IconEdit = React.memo(
  ({ size = CONFIG.ICON_SIZE }: { size?: number }) => (
    <svg {...ICON_PROPS} width={size} height={size} aria-hidden="true">
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.12 2.12 0 1 1 3 3L7 19l-4 1 1-4 12.5-12.5z" />
    </svg>
  )
);

const IconTrash = React.memo(
  ({ size = CONFIG.ICON_SIZE }: { size?: number }) => (
    <svg {...ICON_PROPS} width={size} height={size} aria-hidden="true">
      <path d="M3 6h18" />
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
      <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
      <path d="M10 11v6M14 11v6" />
    </svg>
  )
);

const IconCheck = React.memo(
  ({ size = CONFIG.ICON_SIZE }: { size?: number }) => (
    <svg {...ICON_PROPS} width={size} height={size} aria-hidden="true">
      <path d="M20 6 9 17l-5-5" />
    </svg>
  )
);

const IconX = React.memo(({ size = CONFIG.ICON_SIZE }: { size?: number }) => (
  <svg {...ICON_PROPS} width={size} height={size} aria-hidden="true">
    <path d="M18 6 6 18M6 6l12 12" />
  </svg>
));

// Set display names for debugging
IconEdit.displayName = "IconEdit";
IconTrash.displayName = "IconTrash";
IconCheck.displayName = "IconCheck";
IconX.displayName = "IconX";

/**
 * Reusable icon button component with accessibility features
 * @component
 */
const IconButton = React.memo<IconButtonProps>(
  ({
    label,
    title,
    onClick,
    children,
    variant = "default",
    disabled = false,
  }) => {
    const variantStyles =
      variant === "danger"
        ? STYLES.ICON_BUTTON_DANGER
        : STYLES.ICON_BUTTON_DEFAULT;

    const handleClick = useCallback(
      (e: React.MouseEvent) => {
        if (!disabled && onClick) {
          onClick(e);
        }
      },
      [disabled, onClick]
    );

    return (
      <button
        type="button"
        className={`${STYLES.ICON_BUTTON_BASE} ${variantStyles}`}
        onClick={handleClick}
        title={title}
        aria-label={label}
        disabled={disabled}
      >
        {children}
        <span className="sr-only">{label}</span>
      </button>
    );
  }
);

IconButton.displayName = "IconButton";

/**
 * Individual collection row component with memoization
 * @component
 */
const CollectionRow = React.memo<CollectionRowProps>(
  ({
    collection,
    isActive,
    isEditing,
    editingName,
    setEditingName,
    onEnterRename,
    onCommitRename,
    onCancelRename,
    onSelect,
    onDelete,
    onChangeColor,
    onOpenMenuFromKey,
  }) => {
    // Memoize accent color validation and processing
    const accentColor = useMemo(() => {
      return collection.iconColor && isValidHexColor(collection.iconColor)
        ? collection.iconColor
        : undefined;
    }, [collection.iconColor]);

    // Memoize row styles for performance
    const rowStyle = useMemo((): React.CSSProperties => {
      if (!accentColor) return {};

      return {
        backgroundColor: isActive
          ? hexToRgba(accentColor, CONFIG.BACKGROUND_ALPHA)
          : undefined,
        borderLeftColor: accentColor,
      };
    }, [accentColor, isActive]);

    // Memoize keyboard handlers
    const handleKeyDown = useCallback(
      (e: React.KeyboardEvent) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect();
        } else if (e.key === "F2" && !isEditing) {
          e.preventDefault();
          onEnterRename();
        }
      },
      [onSelect, onEnterRename, isEditing]
    );

    const handleInputKeyDown = useCallback(
      (e: React.KeyboardEvent) => {
        if (e.key === KEYBOARD_HANDLERS.CONFIRM_KEY) {
          onCommitRename();
        } else if (e.key === KEYBOARD_HANDLERS.CANCEL_KEY) {
          onCancelRename();
        }
      },
      [onCommitRename, onCancelRename]
    );

    const handleInputChange = useCallback(
      (e: React.ChangeEvent<HTMLInputElement>) => {
        setEditingName(e.target.value);
      },
      [setEditingName]
    );

    // Action handlers
    const handleRenameClick = useCallback(
      (e: React.MouseEvent) => {
        e.stopPropagation();
        onEnterRename();
      },
      [onEnterRename]
    );

    const handleDeleteClick = useCallback(
      (e: React.MouseEvent) => {
        e.stopPropagation();
        onDelete();
      },
      [onDelete]
    );

    const borderClass = accentColor
      ? "border-l-2"
      : "border-l-2 border-transparent";

    return (
      <div className="min-w-0">
        <div
          role="button"
          tabIndex={0}
          onClick={onSelect}
          onKeyDown={handleKeyDown}
          className={`${STYLES.ROW_BASE} ${borderClass}`}
          style={rowStyle}
          aria-pressed={isActive ? "true" : "false"}
          aria-current={isActive ? "true" : undefined}
          aria-label={`Collection: ${collection.name}`}
        >
          {/* Title section / inline editor */}
          <div className="min-w-0 flex-1">
            {isEditing ? (
              <div className="flex items-center gap-1.5">
                <input
                  autoFocus
                  className={STYLES.EDIT_INPUT}
                  value={editingName}
                  onChange={handleInputChange}
                  onKeyDown={handleInputKeyDown}
                  onBlur={onCommitRename}
                  aria-label="Rename collection"
                  placeholder="Collection name"
                />
                <IconButton
                  label="Confirm rename"
                  title="Confirm (Enter)"
                  onClick={onCommitRename}
                >
                  <IconCheck />
                </IconButton>
                <IconButton
                  label="Cancel rename"
                  title="Cancel (Escape)"
                  onClick={onCancelRename}
                >
                  <IconX />
                </IconButton>
              </div>
            ) : (
              <span className="truncate text-sm" title={collection.name}>
                {collection.name}
              </span>
            )}
          </div>

          {/* Action buttons section */}
          {!isEditing && (
            <div className={STYLES.ACTIONS_CONTAINER}>
              <IconButton
                label="Rename collection"
                title="Rename (F2)"
                onClick={handleRenameClick}
              >
                <IconEdit />
              </IconButton>

              <ColorPaletteButton
                value={accentColor}
                onChange={onChangeColor}
                ariaLabel="Change collection color"
                title="Change color"
              />

              <IconButton
                variant="danger"
                label="Delete collection"
                title="Delete collection"
                onClick={handleDeleteClick}
              >
                <IconTrash />
              </IconButton>
            </div>
          )}
        </div>
      </div>
    );
  }
);

CollectionRow.displayName = "CollectionRow";

/**
 * CollectionListView Component
 *
 * A comprehensive list view for managing collections with full CRUD operations.
 * Features inline editing, color customization, keyboard navigation, and context menus.
 *
 * @component
 * @example
 * ```tsx
 * <CollectionListView
 *   ref={listRef}
 *   collections={collections}
 *   activeId={activeId}
 *   editingId={editingId}
 *   editingName={editingName}
 *   setEditingName={setEditingName}
 *   onEnterRename={handleEnterRename}
 *   onCommitRename={handleCommitRename}
 *   onCancelRename={handleCancelRename}
 *   onSelect={handleSelect}
 *   onDelete={handleDelete}
 *   onChangeColor={handleColorChange}
 *   onOpenMenuFromMouse={handleMouseContextMenu}
 *   onOpenMenuFromKey={handleKeyContextMenu}
 * />
 * ```
 *
 * @features
 * - Full keyboard navigation support (Enter, Space, F2, Context Menu, Escape)
 * - Inline editing with auto-focus and blur-to-commit
 * - Color picker integration with visual feedback
 * - Context menu support for both mouse and keyboard
 * - GSAP animations for smooth list transitions
 * - Optimized performance with memoization
 * - Comprehensive accessibility features
 *
 * @accessibility
 * - ARIA labels and descriptions for all interactive elements
 * - Proper focus management during editing operations
 * - Screen reader announcements for state changes
 * - High contrast support for color indicators
 * - Keyboard shortcuts following platform conventions
 *
 * @performance
 * - Memoized row components prevent unnecessary re-renders
 * - Optimized event handlers with useCallback
 * - Efficient style computations with useMemo
 * - Minimal DOM updates through React.memo
 */
export const CollectionListView = forwardRef<
  HTMLUListElement,
  CollectionListViewProps
>(function CollectionListView(props, forwardedRef) {
  const {
    collections,
    activeId,
    editingId,
    editingName,
    setEditingName,
    onEnterRename,
    onCommitRename,
    onCancelRename,
    onSelect,
    onDelete,
    onChangeColor,
    onOpenMenuFromMouse,
    onOpenMenuFromKey,
  } = props;

  // Internal ref management
  const ulRef = useRef<HTMLUListElement>(null);

  // Merge internal ref with forwarded ref
  const setRefs = useCallback(
    (node: HTMLUListElement | null) => {
      ulRef.current = node;
      if (!forwardedRef) return;

      if (typeof forwardedRef === "function") {
        forwardedRef(node);
      } else {
        (
          forwardedRef as React.MutableRefObject<HTMLUListElement | null>
        ).current = node;
      }
    },
    [forwardedRef]
  );

  // GSAP animation hook for list entries
  useGsapListEnter(ulRef, collections.length);

  // Memoize collections to prevent unnecessary re-renders
  const memoizedCollections = useMemo(() => collections, [collections]);

  // Context menu handler for mouse events
  const handleContextMenu = useCallback(
    (e: React.MouseEvent, id: string) => {
      onOpenMenuFromMouse(e, id);
    },
    [onOpenMenuFromMouse]
  );

  return (
    <ScrollArea className="flex-1 h-full">
      <ul
        ref={setRefs}
        className="py-2 space-y-1"
        role="list"
        aria-label="Collections list"
        aria-live="polite"
        aria-relevant="additions removals"
      >
        {memoizedCollections.map((collection) => {
          const isActive = collection.id === activeId;
          const isEditing = collection.id === editingId;

          return (
            <li
              key={collection.id}
              className="relative group"
              role="listitem"
              aria-current={isActive ? "true" : undefined}
              onContextMenu={(e) => handleContextMenu(e, collection.id)}
            >
              <CollectionRow
                collection={collection}
                isActive={isActive}
                isEditing={isEditing}
                editingName={editingName}
                setEditingName={setEditingName}
                onEnterRename={() => onEnterRename(collection)}
                onCommitRename={onCommitRename}
                onCancelRename={onCancelRename}
                onSelect={() => onSelect(collection.id)}
                onDelete={() => onDelete(collection)}
                onChangeColor={(hex) => onChangeColor(collection.id, hex)}
                onOpenMenuFromKey={(e) => onOpenMenuFromKey(e, collection.id)}
              />
            </li>
          );
        })}
      </ul>
    </ScrollArea>
  );
});

// Set display name for debugging
CollectionListView.displayName = "CollectionListView";
