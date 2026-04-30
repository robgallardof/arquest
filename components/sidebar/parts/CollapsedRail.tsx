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
import { FiFolder } from "react-icons/fi"; // ⬅️ react-icons
import { gsap } from "gsap";
import type { Refish } from "../utils";
import { JSX } from "react";

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

/** Sorting mode for collapsed rail. */
type SortMode = "name" | "most-used";

/**
 * Animation configuration constants
 * @constant
 */
const ANIMATION_CONFIG = {
  HOVER_SCALE: 1.08,
  DURATION: 0.15,
  EASE: "power2.out",
  DEFAULT_SCALE: 1,
  ICON_SIZE: 16, // ⬅️ tamaño del FiFolder
} as const;

/** IndexedDB persistence (shared with the rest of the app). */
const IDB_DB_NAME = "arquest";
const IDB_VERSION = 1;
const IDB_STORE_USAGE = "collectionUsage";
const IDB_STORE_PREFS = "prefs";
const PREF_SORT_KEY = "collectionRail:sortMode";

/** Minimal IndexedDB helpers (no deps). */
function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(IDB_DB_NAME, IDB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(IDB_STORE_USAGE))
        db.createObjectStore(IDB_STORE_USAGE);
      if (!db.objectStoreNames.contains(IDB_STORE_PREFS))
        db.createObjectStore(IDB_STORE_PREFS);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}
async function idbGet<T = unknown>(
  store: string,
  key: string
): Promise<T | undefined> {
  const db = await openDb();
  return new Promise<T | undefined>((resolve, reject) => {
    const tx = db.transaction(store, "readonly");
    const r = tx.objectStore(store).get(key);
    r.onsuccess = () => resolve(r.result as T | undefined);
    r.onerror = () => reject(r.error);
    tx.oncomplete = () => db.close();
  });
}
async function idbSet(
  store: string,
  key: string,
  value: unknown
): Promise<void> {
  const db = await openDb();
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction(store, "readwrite");
    tx.objectStore(store).put(value, key);
    tx.oncomplete = () => {
      db.close();
      resolve();
    };
    tx.onerror = () => {
      db.close();
      reject(tx.error);
    };
  });
}
async function idbMGetCounts(ids: string[]): Promise<Record<string, number>> {
  const out: Record<string, number> = {};
  await Promise.all(
    ids.map(async (id) => {
      try {
        const v = await idbGet<number>(IDB_STORE_USAGE, id);
        out[id] = typeof v === "number" ? v : 0;
      } catch {
        out[id] = 0;
      }
    })
  );
  return out;
}

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

/** Case-insensitive, locale-aware comparison for names (fallback to ID). */
function compareByName(a: Collection, b: Collection): number {
  const an = (a.name ?? "").toString();
  const bn = (b.name ?? "").toString();
  const c = an.localeCompare(bn, undefined, { sensitivity: "base" });
  return c !== 0 ? c : (a.id ?? "").localeCompare(b.id ?? "");
}

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
  /** Handles mouse enter animation */
  const handleMouseEnter = React.useCallback(
    (e: React.MouseEvent<HTMLButtonElement>) => {
      if (!isActive) {
        gsap.to(e.currentTarget, {
          scale: ANIMATION_CONFIG.HOVER_SCALE,
          duration: ANIMATION_CONFIG.DURATION,
          ease: ANIMATION_CONFIG.EASE,
        });
      }
    },
    [isActive]
  );

  /** Handles mouse leave animation */
  const handleMouseLeave = React.useCallback(
    (e: React.MouseEvent<HTMLButtonElement>) => {
      if (!isActive) {
        gsap.to(e.currentTarget, {
          scale: ANIMATION_CONFIG.DEFAULT_SCALE,
          duration: ANIMATION_CONFIG.DURATION,
          ease: ANIMATION_CONFIG.EASE,
        });
      }
    },
    [isActive]
  );

  /** Handles collection selection */
  const handleClick = React.useCallback(() => {
    onSelect(collection.id);
  }, [collection.id, onSelect]);

  /** Handles context menu */
  const handleContextMenu = React.useCallback(
    (e: React.MouseEvent<HTMLButtonElement>) => {
      onContext(e, collection.id);
    },
    [collection.id, onContext]
  );

  // Derived values
  const requestCount = collection.requests?.length;
  const hasRequests = Boolean(requestCount && requestCount > 0);
  const ariaLabel = hasRequests
    ? `${collection.name} (${requestCount} requests)`
    : collection.name;

  // Icon styles (FiFolder usa stroke con currentColor)
  const iconStyles = React.useMemo(
    () => ({
      color: collection.iconColor || undefined,
    }),
    [collection.iconColor]
  );

  return (
    <li role="listitem">
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            className={`${STYLES.RAIL_ITEM_BASE} ${isActive ? STYLES.ACTIVE_STATE : STYLES.INACTIVE_STATE}`}
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

            {/* Collection icon (react-icons) */}
            <FiFolder
              size={ANIMATION_CONFIG.ICON_SIZE}
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
 * Minimal vertical navigation for collapsed sidebar.
 * Adds sorting + persistence:
 * - Sort by "name" or "most-used" (persisted in IndexedDB: prefs.collectionRail:sortMode).
 * - Usage counters increase on selection and are stored per collection ID.
 *
 * @component
 */
export function CollapsedRail({
  railRef,
  collections,
  activeId,
  onSelect,
  onContext,
}: CollapsedRailProps): React.JSX.Element {
  // Input memo
  const memoizedCollections = React.useMemo(
    () => collections ?? [],
    [collections]
  );

  // Persisted sort and usage map
  const [sortMode, setSortMode] = React.useState<SortMode>("name");
  const [usage, setUsage] = React.useState<Record<string, number>>({});

  // Load sort preference
  React.useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const pref = await idbGet<SortMode>(IDB_STORE_PREFS, PREF_SORT_KEY);
        if (mounted && (pref === "name" || pref === "most-used")) {
          setSortMode(pref);
        }
      } catch {
        /* ignore */
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  // Load usage counts for current collections
  React.useEffect(() => {
    let mounted = true;
    (async () => {
      const ids = memoizedCollections.map((c) => c.id).filter(Boolean);
      if (!ids.length) {
        if (mounted) setUsage({});
        return;
      }
      try {
        const counts = await idbMGetCounts(ids as string[]);
        if (mounted) setUsage(counts);
      } catch {
        /* ignore */
      }
    })();
    return () => {
      mounted = false;
    };
  }, [memoizedCollections]);

  // Sorted list based on preference
  const sortedCollections = React.useMemo(() => {
    const list = memoizedCollections.slice();
    if (sortMode === "name") {
      list.sort(compareByName);
    } else {
      // most-used: higher count first; tie-break by name
      list.sort((a, b) => {
        const ua = usage[a.id] ?? 0;
        const ub = usage[b.id] ?? 0;
        if (ub !== ua) return ub - ua;
        return compareByName(a, b);
      });
    }
    return list;
  }, [memoizedCollections, sortMode, usage]);

  // onSelect wrapper to bump usage and persist
  const handleSelect = React.useCallback(
    async (id: string) => {
      onSelect(id);
      setUsage((prev) => {
        const nextVal = (prev[id] ?? 0) + 1;
        const next = { ...prev, [id]: nextVal };
        // Fire-and-forget persistence
        idbSet(IDB_STORE_USAGE, id, nextVal).catch(() => {});
        return next;
      });
    },
    [onSelect]
  );

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
            {sortedCollections.map((collection) => (
              <RailItem
                key={collection.id}
                collection={collection}
                isActive={activeId === collection.id}
                onSelect={handleSelect}
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
