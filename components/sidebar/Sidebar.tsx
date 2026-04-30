"use client";

import * as React from "react";
import {
  useCallback,
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useShallow } from "zustand/react/shallow";
import { useStore } from "@/lib/state/store";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { FiSearch, FiX } from "react-icons/fi"; // ✅ Estandarizado a react-icons/fi
import { Button } from "@/components/ui/button";
import type { Collection, MenuItem } from "@/types/collections";
import { exportCollectionToJson } from "../../utils/exportJson";
import { useContextMenu } from "./hooks/useContextMenu";
import { filterCollections, buildMenuItems, safeHex, Refish } from "./utils";
import { useGsapListEnter } from "./hooks/useGsapListEnter";
import { useGsapCollapse } from "./hooks/useGsapCollapse";
import { useHeaderShadowOnScroll } from "./hooks/useHeaderShadowOnScroll";

import { HeaderControlsExpanded } from "./parts/HeaderControlsExpanded";
import { HeaderControlsCollapsed } from "./parts/HeaderControlsCollapsed";
import { CollectionListView } from "./parts/CollectionListView";
import { CollapsedRail } from "./parts/CollapsedRail";
import { ContextMenuLite } from "./ContextMenuLite";

/**
 * Props interface for the Sidebar component
 * @interface SidebarProps
 */
interface SidebarProps {
  /** Current width in pixels (for layout hints only; the parent drives it) */
  width: number;
  /** Whether the sidebar is collapsed (icon rail) */
  collapsed: boolean;
  /** Callback to request collapse state change from parent */
  onCollapsedChange: (collapsed: boolean) => void;
  /** Optional extra className for the container */
  className?: string;
  /** Optional: mobile overlay state for responsive design */
  mobileOpen?: boolean;
  /** Optional: callback for mobile overlay toggle */
  onMobileOpenChange?: (open: boolean) => void;
}

/**
 * Configuration constants
 * @constant
 */
const CONFIG = {
  NARROW_BREAKPOINT: 280,
  ICON_SIZE: 14, // Estandarizado con otros componentes
  BACKDROP_BLUR: "backdrop-blur",
  ANIMATION_DURATION: 300,
  SEARCH_MIN_HEIGHT: 32,
  SEARCH_COMPACT_HEIGHT: 28,
} as const;

/**
 * CSS class constants for consistent styling
 * @constant
 */
const STYLES = {
  CONTAINER_BASE: `
    relative h-full border-r bg-background flex flex-col min-h-0 
    overflow-hidden select-none
  `,
  HEADER_BACKDROP: `
    sticky top-0 z-10 bg-background/95 backdrop-blur 
    supports-[backdrop-filter]:bg-background/75
  `,
  HEADER_CONTENT: "flex items-center justify-between gap-2",
  TITLE_BASE: "font-semibold text-foreground truncate",
  TITLE_NORMAL: "text-sm",
  TITLE_NARROW: "text-xs",
  SEARCH_CONTAINER: "flex items-center gap-2",
  SEARCH_INPUT_NORMAL: "text-sm h-8",
  SEARCH_INPUT_NARROW: "h-7 text-xs",
  NAV_CONTENT: "flex-1 min-h-0 overflow-auto",
  PADDING_NORMAL: "p-3",
  PADDING_NARROW: "p-2",
  SEARCH_PADDING_NORMAL: "px-3 py-2",
  SEARCH_PADDING_NARROW: "px-2 py-1.5",
  FADE_ELEMENT: "data-collapse-fade='1'",
} as const;

/**
 * ARIA labels for accessibility
 * @constant
 */
const ARIA_LABELS = {
  SIDEBAR: "Collections sidebar",
  HEADING: "collections-heading",
  SEARCH_LABEL: "Search collections",
  SEARCH_INPUT: "Search collections",
  SEARCH_PLACEHOLDER_NORMAL: "Search collections…",
  SEARCH_PLACEHOLDER_NARROW: "Search…",
  TOGGLE_TOOLTIP: "Double-click to toggle collapse",
} as const;

/**
 * Custom hook to determine if sidebar should use narrow layout
 * @param {number} width - Current sidebar width
 * @returns {boolean} Whether sidebar should use narrow layout
 */
const useIsNarrow = (width: number): boolean => {
  const [narrow, setNarrow] = useState(width < CONFIG.NARROW_BREAKPOINT);
  
  useEffect(() => {
    setNarrow(width < CONFIG.NARROW_BREAKPOINT);
  }, [width]);
  
  return narrow;
};

/**
 * Search icon component with memoization
 * @component
 */
const SearchIcon = React.memo(() => (
  <FiSearch
    size={CONFIG.ICON_SIZE}
    className="text-muted-foreground shrink-0"
    aria-hidden="true"
  />
));

SearchIcon.displayName = "SearchIcon";

/**
 * Clear search button component
 * @component
 */
const ClearSearchButton = React.memo<{
  onClear: () => void;
  hasQuery: boolean;
}>(({ onClear, hasQuery }) => {
  if (!hasQuery) return null;

  return (
    <Button
      variant="ghost"
      size="icon"
      className="h-4 w-4 p-0 hover:bg-transparent"
      onClick={onClear}
      aria-label="Clear search"
    >
      <FiX size={CONFIG.ICON_SIZE - 2} className="text-muted-foreground" />
    </Button>
  );
});

ClearSearchButton.displayName = "ClearSearchButton";

/**
 * Sidebar header component with memoization
 * @component
 */
const SidebarHeader = React.memo<{
  collapsed: boolean;
  isNarrow: boolean;
  onToggleCollapsed: () => void;
  onAdd: () => void;
}>(({ collapsed, isNarrow, onToggleCollapsed, onAdd }) => {
  const headerPadding = isNarrow ? STYLES.PADDING_NARROW : STYLES.PADDING_NORMAL;
  const titleClasses = `${STYLES.TITLE_BASE} ${isNarrow ? STYLES.TITLE_NARROW : STYLES.TITLE_NORMAL}`;

  return (
    <header
      className={`${headerPadding} ${STYLES.HEADER_CONTENT}`}
      onDoubleClick={onToggleCollapsed}
      title={ARIA_LABELS.TOGGLE_TOOLTIP}
    >
      {!collapsed ? (
        <>
          <h2
            id={ARIA_LABELS.HEADING}
            className={titleClasses}
            data-collapse-fade="1"
          >
            Collections
          </h2>
          <div data-collapse-fade="1">
            <HeaderControlsExpanded onAdd={onAdd} />
          </div>
        </>
      ) : (
        <HeaderControlsCollapsed onExpand={onToggleCollapsed} />
      )}
    </header>
  );
});

SidebarHeader.displayName = "SidebarHeader";

/**
 * Search section component with memoization
 * @component
 */
const SearchSection = React.memo<{
  collapsed: boolean;
  isNarrow: boolean;
  query: string;
  onQueryChange: (query: string) => void;
}>(({ collapsed, isNarrow, query, onQueryChange }) => {
  const searchPadding = isNarrow ? STYLES.SEARCH_PADDING_NARROW : STYLES.SEARCH_PADDING_NORMAL;
  const inputClasses = isNarrow ? STYLES.SEARCH_INPUT_NARROW : STYLES.SEARCH_INPUT_NORMAL;
  const placeholder = isNarrow ? ARIA_LABELS.SEARCH_PLACEHOLDER_NARROW : ARIA_LABELS.SEARCH_PLACEHOLDER_NORMAL;

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    onQueryChange(e.target.value);
  }, [onQueryChange]);

  const handleClearSearch = useCallback(() => {
    onQueryChange("");
  }, [onQueryChange]);

  if (collapsed) return null;

  return (
    <>
      <Separator data-collapse-fade="1" />
      <div
        className={`${searchPadding} ${STYLES.SEARCH_CONTAINER}`}
        data-collapse-fade="1"
      >
        <label htmlFor="collections-search" className="sr-only">
          {ARIA_LABELS.SEARCH_LABEL}
        </label>
        {!isNarrow && <SearchIcon />}
        <div className="relative flex-1">
          <Input
            id="collections-search"
            value={query}
            onChange={handleInputChange}
            placeholder={placeholder}
            className={inputClasses}
            aria-label={ARIA_LABELS.SEARCH_INPUT}
          />
          <div className="absolute right-2 top-1/2 -translate-y-1/2">
            <ClearSearchButton 
              onClear={handleClearSearch}
              hasQuery={Boolean(query)}
            />
          </div>
        </div>
      </div>
      <Separator data-collapse-fade="1" />
    </>
  );
});

SearchSection.displayName = "SearchSection";

/**
 * Sidebar Component
 * 
 * A sophisticated, responsive sidebar component for managing collections.
 * Features search functionality, context menus, drag-and-drop support,
 * and smooth animations with GSAP integration.
 * 
 * @component
 * @example
 * ```tsx
 * <Sidebar
 *   width={320}
 *   collapsed={false}
 *   onCollapsedChange={setCollapsed}
 *   className="custom-sidebar"
 * />
 * ```
 * 
 * @param {SidebarProps} props - Component configuration
 * @returns {React.JSX.Element} Rendered sidebar component
 * 
 * @features
 * - Responsive design with narrow layout for smaller widths
 * - Real-time search with deferred value optimization
 * - Context menu integration with keyboard support
 * - Smooth collapse/expand animations with GSAP
 * - Collection CRUD operations (create, rename, delete)
 * - Export functionality for collections
 * - Keyboard navigation and accessibility support
 * - Mobile overlay support for responsive layouts
 * 
 * @accessibility
 * - ARIA labels and semantic HTML structure
 * - Keyboard navigation support
 * - Screen reader compatible
 * - Focus management during interactions
 * - High contrast mode support
 * 
 * @performance
 * - Deferred search value prevents excessive filtering
 * - Memoized components prevent unnecessary re-renders
 * - Optimized event handlers with useCallback
 * - Efficient state management with Zustand shallow selection
 * 
 * @responsive
 * - Adaptive padding and typography based on width
 * - Mobile overlay support for small screens  
 * - Touch-friendly interaction areas
 * - Optimized search experience on narrow layouts
 */
export const Sidebar = React.memo<SidebarProps>(({
  width,
  collapsed,
  onCollapsedChange,
  className = "",
  mobileOpen = false,
  onMobileOpenChange,
}) => {
  // ===== Store integration with shallow selection =====
  const {
    collections,
    activeCollectionId,
    setActiveCollection,
    upsertCollection,
    removeCollection,
  } = useStore(
    useShallow((s) => ({
      collections: s.collections as Record<string, Collection>,
      activeCollectionId: s.activeCollectionId,
      setActiveCollection: s.setActiveCollection,
      upsertCollection: s.upsertCollection,
      removeCollection: s.removeCollection,
    }))
  );

  // ===== Local UI state =====
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");

  // ===== Refs and hooks =====
  const menu = useContextMenu<string | null>();
  const asideRef = useRef<HTMLElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  const listRef: Refish<HTMLUListElement> = useRef<HTMLUListElement>(null);
  const railRef = useRef<HTMLUListElement>(null);

  // ===== Computed values =====
  const isNarrow = useIsNarrow(width);
  const currentForMenu = menu.targetId ? collections[menu.targetId] : undefined;

  const filtered = useMemo(
    () => filterCollections(collections, deferredQuery),
    [collections, deferredQuery]
  );

  const menuItems: MenuItem[] = useMemo(() => {
    if (!currentForMenu) return [];
    return buildMenuItems(currentForMenu, {
      startRename: (c: Collection) => {
        setEditingId(c.id);
        setEditingName(c.name);
      },
      duplicate: (c: Collection) => {
        const id = crypto.randomUUID();
        const copy: Collection = {
          id,
          name: `${c.name} (copy)`,
          requests: JSON.parse(JSON.stringify(c.requests)),
        };
        upsertCollection(copy);
        setActiveCollection(id);
      },
      remove: (c: Collection) => {
        if (confirm(`Delete "${c.name}"?`)) removeCollection(c.id);
      },
      exportJson: (c: Collection) => exportCollectionToJson(c),
    });
  }, [currentForMenu, removeCollection, setActiveCollection, upsertCollection]);

  // ===== Event handlers =====
  const addCollection = useCallback(() => {
    const id = crypto.randomUUID();
    const col: Collection = { id, name: "New collection", requests: [] };
    upsertCollection(col);
    setActiveCollection(id);
    setEditingId(id);
    setEditingName(col.name);
  }, [setActiveCollection, upsertCollection]);

  const commitRename = useCallback(() => {
    if (!editingId) return;
    const trimmed = editingName.trim();
    const current = collections[editingId];
    if (current && trimmed && current.name !== trimmed) {
      upsertCollection({ ...current, name: trimmed });
    }
    setEditingId(null);
  }, [collections, editingId, editingName, upsertCollection]);

  const cancelRename = useCallback(() => {
    setEditingId(null);
  }, []);

  const setCollectionIconColor = useCallback(
    (id: string, hex: string) => {
      const current = collections[id];
      if (!current) return;
      const iconColor = safeHex(hex);
      if (current.iconColor === iconColor) return;
      upsertCollection({ ...current, iconColor });
    },
    [collections, upsertCollection]
  );

  const handleOpenMenuFromKey = useCallback(
    (e: React.KeyboardEvent<HTMLElement>, id: string) => {
      menu.openFromKey(e, id);
    },
    [menu]
  );

  const handleCollectionSelect = useCallback(
    (id: string) => {
      setActiveCollection(id);
      onMobileOpenChange?.(false);
    },
    [setActiveCollection, onMobileOpenChange]
  );

  const toggleCollapsed = useCallback(
    () => onCollapsedChange(!collapsed),
    [collapsed, onCollapsedChange]
  );

  const handleDeleteCollection = useCallback(
    (c: Collection) => {
      if (confirm(`Delete "${c.name}"?`)) {
        removeCollection(c.id);
      }
    },
    [removeCollection]
  );

  const handleEnterRename = useCallback((c: Collection) => {
    setEditingId(c.id);
    setEditingName(c.name);
  }, []);

  // ===== Animation hooks =====
  useGsapListEnter(listRef, filtered.length);
  useGsapCollapse(asideRef, collapsed);
  useHeaderShadowOnScroll(asideRef, headerRef, collapsed);

  // ===== Memoized container classes =====
  const containerClasses = useMemo(() => {
    return `${STYLES.CONTAINER_BASE} ${className}`;
  }, [className]);

  // ===== Render =====
  return (
    <aside
      ref={asideRef}
      className={containerClasses}
      style={{ width: collapsed ? undefined : width }}
      aria-label={ARIA_LABELS.SIDEBAR}
      data-collapsed={collapsed ? "true" : "false"}
    >
      {/* Header */}
      <div
        ref={headerRef}
        className={STYLES.HEADER_BACKDROP}
      >
        <SidebarHeader
          collapsed={collapsed}
          isNarrow={isNarrow}
          onToggleCollapsed={toggleCollapsed}
          onAdd={addCollection}
        />

        <SearchSection
          collapsed={collapsed}
          isNarrow={isNarrow}
          query={query}
          onQueryChange={setQuery}
        />
      </div>

      {/* Content */}
      {!collapsed ? (
        <nav
          aria-labelledby={ARIA_LABELS.HEADING}
          className={STYLES.NAV_CONTENT}
          data-collapse-fade="1"
        >
          <CollectionListView
            ref={listRef}
            collections={filtered}
            activeId={activeCollectionId}
            editingId={editingId}
            editingName={editingName}
            setEditingName={setEditingName}
            onEnterRename={handleEnterRename}
            onCommitRename={commitRename}
            onCancelRename={cancelRename}
            onSelect={handleCollectionSelect}
            onDelete={handleDeleteCollection}
            onOpenMenuFromMouse={(e, id) => menu.openFromMouse(e, id)}
            onOpenMenuFromKey={handleOpenMenuFromKey}
            onChangeColor={setCollectionIconColor}
          />
        </nav>
      ) : (
        <CollapsedRail
          railRef={railRef}
          collections={Object.values(collections)}
          activeId={activeCollectionId}
          onSelect={handleCollectionSelect}
          onContext={(e, id) => menu.openFromMouse(e, id)}
        />
      )}

      {/* Context menu */}
      {menu.open && currentForMenu && (
        <ContextMenuLite
          x={menu.x}
          y={menu.y}
          items={menuItems}
          onClose={menu.close}
        />
      )}
    </aside>
  );
});

// Set display name for debugging
Sidebar.displayName = "Sidebar";