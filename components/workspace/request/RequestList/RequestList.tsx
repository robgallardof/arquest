"use client";

import * as React from "react";
import {
  useDeferredValue,
  useMemo,
  useState,
  useCallback,
  useRef,
  memo,
  useEffect,
} from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { FiSearch, FiPlus } from "react-icons/fi";
import type { RequestModel } from "@/lib/domain/models";
import { RequestRow } from "./RequestRow";
import { RequestListHeader } from "./RequestListHeader";
import { useGsapListMountOnce } from "./hooks/useGsapListMountOnce";
import { RequestContextMenu } from "./RequestContextMenu";

/** Sorting mode for the request list. */
type SortMode = "name" | "most-used";

/** Persisted keys (IndexedDB stores). */
const IDB_DB_NAME = "arquest";
const IDB_VERSION = 1;
const IDB_STORE_USAGE = "requestUsage";
const IDB_STORE_PREFS = "prefs";
const PREF_SORT_KEY = "requestList:sortMode";

/** IndexedDB helpers (minimal, no deps). */
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
 * Props interface for RequestList component
 * @interface RequestListProps
 */
interface RequestListProps {
  /** Array of request models to display */
  requests: RequestModel[] | null | undefined;
  /** ID of the currently active request */
  activeId?: string;
  /** Callback to create a new request */
  onCreate: () => void;
  /** Callback when a request is selected */
  onSelect: (id: string) => void;
  /** Callback when a request is renamed */
  onRename: (id: string, nextName: string) => void;
  /** Optional callback when a request is deleted */
  onDelete?: (id: string) => void;
  /** Optional className for the container */
  containerClassName?: string;
}

/**
 * Menu state interface
 * @interface MenuState
 */
interface MenuState {
  /** ID of request with open context menu */
  id: string | null;
  /** X coordinate for menu position */
  x: number;
  /** Y coordinate for menu position */
  y: number;
}

/**
 * Configuration constants
 * @constant
 */
const CONFIG = {
  ICON_SIZE: 14,
  EMPTY_ICON_SIZE: 24,
  SEARCH_DEBOUNCE: 0,
  ANIMATION_STAGGER: 0.05,
  CONTEXT_MENU_OFFSET: 8,
} as const;

/**
 * CSS class constants for consistent styling
 * @constant
 */
const STYLES = {
  CONTAINER_BASE:
    "flex h-full min-h-0 w-full flex-col overflow-hidden border-r bg-background",
  LIST_CONTAINER: "min-w-0 space-y-2 p-2 md:p-3",
  EMPTY_STATE: "text-center text-sm text-muted-foreground md:text-base",
  EMPTY_CONTENT: "flex flex-col items-center gap-3",
  EMPTY_ICON_CONTAINER:
    "mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-muted/50 opacity-60",
  EMPTY_TEXT: "font-medium",
  CREATE_BUTTON:
    "inline-flex items-center gap-2 rounded-md border px-3 py-1.5 mt-1 text-xs md:text-sm bg-background hover:bg-accent transition-colors",
  SCROLL_AREA: "flex-1 min-h-0",
  EMPTY_WRAPPER: "h-full grid place-items-center p-3",
  /** Small toolbar under header for sort controls */
  SORT_BAR:
    "flex items-center justify-between px-2 md:px-3 py-1.5 border-b text-xs text-muted-foreground",
  SORT_BTNS:
    "inline-flex items-center gap-1 rounded-md border px-2 py-1 bg-background hover:bg-accent transition-colors",
  SORT_BTNS_ACTIVE: "bg-accent border-accent",
} as const;

/**
 * ARIA labels for accessibility
 * @constant
 */
const ARIA_LABELS = {
  REQUEST_LIST: "Request list",
  EMPTY_STATE: "No requests available",
  CREATE_FIRST: "Create your first request",
  NO_MATCHES: "No matching requests found",
} as const;

/**
 * Search icon component with memoization
 * @component
 */
const SearchEmptyIcon = memo(() => (
  <FiSearch
    size={CONFIG.EMPTY_ICON_SIZE}
    className="opacity-70"
    aria-hidden="true"
  />
));
SearchEmptyIcon.displayName = "SearchEmptyIcon";

/**
 * Plus icon component for create button
 * @component
 */
const PlusIcon = memo(() => (
  <FiPlus size={CONFIG.ICON_SIZE} className="mr-1" aria-hidden="true" />
));
PlusIcon.displayName = "PlusIcon";

/**
 * Empty state component with memoization
 * @component
 */
const EmptyState = memo<{
  hasQuery: boolean;
  query: string;
  onCreate: () => void;
}>(({ hasQuery, query, onCreate }) => {
  const handleCreateClick = useCallback(() => {
    onCreate();
  }, [onCreate]);

  const emptyText = hasQuery ? ARIA_LABELS.NO_MATCHES : "No requests yet";

  return (
    <div
      className={STYLES.EMPTY_STATE}
      role="status"
      aria-label={hasQuery ? ARIA_LABELS.NO_MATCHES : ARIA_LABELS.EMPTY_STATE}
    >
      <div className={STYLES.EMPTY_CONTENT}>
        <div className={STYLES.EMPTY_ICON_CONTAINER}>
          <SearchEmptyIcon />
        </div>
        <div className={STYLES.EMPTY_TEXT}>{emptyText}</div>
        {!hasQuery && (
          <button
            onClick={handleCreateClick}
            className={STYLES.CREATE_BUTTON}
            type="button"
            aria-label={ARIA_LABELS.CREATE_FIRST}
          >
            <PlusIcon />
            {ARIA_LABELS.CREATE_FIRST}
          </button>
        )}
      </div>
    </div>
  );
});
EmptyState.displayName = "EmptyState";

/**
 * Individual request list item with memoization
 * @component
 */
const RequestListItem = memo<{
  request: RequestModel;
  active: boolean;
  isEditing: boolean;
  editingName: string;
  onChangeEditingName: (name: string) => void;
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
}>(
  ({
    request,
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
  }) => {
    const headerCount = useMemo(
      () => request.headers?.filter?.((h) => h.enabled !== false)?.length ?? 0,
      [request.headers]
    );
    const paramCount = useMemo(
      () => request.params?.filter?.((p) => p.enabled !== false)?.length ?? 0,
      [request.params]
    );

    return (
      <li>
        <RequestRow
          id={request.id}
          name={request.name ?? ""}
          url={request.url ?? ""}
          method={request.method}
          headerCount={headerCount}
          paramCount={paramCount}
          active={active}
          isEditing={isEditing}
          editingName={editingName}
          onChangeEditingName={onChangeEditingName}
          onCommitRename={onCommitRename}
          onCancelRename={onCancelRename}
          onSelect={onSelect}
          onStartRename={onStartRename}
          onDelete={onDelete}
          onOpenContextMenuMouse={onOpenContextMenuMouse}
          onOpenContextMenuKey={onOpenContextMenuKey}
        />
      </li>
    );
  }
);
RequestListItem.displayName = "RequestListItem";

/**
 * Request filtering logic
 */
const useRequestFiltering = (
  requests: RequestModel[] | null | undefined,
  query: string
) => {
  return useMemo(() => {
    const list = Array.isArray(requests) ? requests : [];
    if (!query) return list;

    const normalizedQuery = query.toLowerCase();
    return list.filter((request) => {
      const name = (request.name || "").toLowerCase();
      const url = (request.url || "").toLowerCase();
      return name.includes(normalizedQuery) || url.includes(normalizedQuery);
    });
  }, [requests, query]);
};

/**
 * Context menu management hook
 */
const useContextMenu = () => {
  const [menu, setMenu] = useState<MenuState>({
    id: null,
    x: 0,
    y: 0,
  });

  const openMenuMouse = useCallback((id: string, e: React.MouseEvent) => {
    e.preventDefault();
    setMenu({
      id,
      x: e.clientX + CONFIG.CONTEXT_MENU_OFFSET,
      y: e.clientY + CONFIG.CONTEXT_MENU_OFFSET,
    });
  }, []);

  const openMenuKey = useCallback(
    (id: string, e: React.KeyboardEvent<HTMLElement>) => {
      const isContextMenuKey =
        e.key === "ContextMenu" || (e.shiftKey && e.key === "F10");
      if (!isContextMenuKey) return;

      e.preventDefault();
      const rect = (e.target as HTMLElement)?.getBoundingClientRect?.();
      const x = rect ? rect.left + rect.width / 2 : window.innerWidth / 2;
      const y = rect ? rect.top + rect.height : window.innerHeight / 2;
      setMenu({ id, x, y });
    },
    []
  );

  const closeMenu = useCallback(() => {
    setMenu((prevMenu) => ({ ...prevMenu, id: null }));
  }, []);

  return { menu, openMenuMouse, openMenuKey, closeMenu };
};

/**
 * Inline rename management hook
 */
const useInlineRename = (
  requests: RequestModel[],
  onRename: (id: string, name: string) => void
) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");

  const startRename = useCallback((id: string, currentName: string) => {
    setEditingId(id);
    setEditingName(currentName ?? "");
  }, []);

  const commitRename = useCallback(() => {
    if (!editingId) return;

    const trimmedName = editingName.trim();
    const currentRequest = requests.find((r) => r.id === editingId);
    const currentName = currentRequest?.name ?? "";

    setEditingId(null);
    if (!trimmedName || trimmedName === currentName) return;
    onRename(editingId, trimmedName);
  }, [editingId, editingName, onRename, requests]);

  const cancelRename = useCallback(() => {
    setEditingId(null);
    setEditingName("");
  }, []);

  return {
    editingId,
    editingName,
    setEditingName,
    startRename,
    commitRename,
    cancelRename,
  };
};

/** Case-insensitive, locale-aware comparison for names (fallback to URL). */
function compareByName(a: RequestModel, b: RequestModel): number {
  const an = (a.name ?? a.url ?? "").toString();
  const bn = (b.name ?? b.url ?? "").toString();
  return an.localeCompare(bn, undefined, { sensitivity: "base" });
}

/**
 * RequestList Component — with sorting + IndexedDB persistence
 */
export const RequestList = memo<RequestListProps>(
  ({
    requests,
    activeId,
    onCreate,
    onSelect,
    onRename,
    onDelete,
    containerClassName,
  }) => {
    /** Normalize requests to a safe array to avoid runtime errors */
    const safeRequests = useMemo<RequestModel[]>(
      () => (Array.isArray(requests) ? requests : []),
      [requests]
    );

    // Search with deferred value
    const [query, setQuery] = useState("");
    const deferredQuery = useDeferredValue(query);

    // Sort mode + usage counts
    const [sortMode, setSortMode] = useState<SortMode>("name");
    const [usage, setUsage] = useState<Record<string, number>>({});

    // Load persisted sort and usage counts
    useEffect(() => {
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

    useEffect(() => {
      let mounted = true;
      (async () => {
        const ids = safeRequests.map((r) => r.id).filter(Boolean);
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
    }, [safeRequests]);

    // Custom hooks for complex state management
    const {
      editingId,
      editingName,
      setEditingName,
      startRename,
      commitRename,
      cancelRename,
    } = useInlineRename(safeRequests, onRename);

    const { menu, openMenuMouse, openMenuKey, closeMenu } = useContextMenu();

    // Filtering
    const filteredRequests = useRequestFiltering(safeRequests, deferredQuery);

    // Sorting (applies on filtered list)
    const sortedRequests = useMemo(() => {
      const list = filteredRequests.slice();
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
    }, [filteredRequests, sortMode, usage]);

    // GSAP animation
    const ulRef = useRef<HTMLUListElement>(null);
    useGsapListMountOnce(ulRef, sortedRequests.length);

    // Memoize container classes
    const containerClasses = useMemo(() => {
      const baseClasses = STYLES.CONTAINER_BASE;
      return containerClassName
        ? `${baseClasses} ${containerClassName}`
        : baseClasses;
    }, [containerClassName]);

    // Persist sort preference
    const changeSort = useCallback(async (next: SortMode) => {
      setSortMode(next);
      try {
        await idbSet(IDB_STORE_PREFS, PREF_SORT_KEY, next);
      } catch {
        /* ignore */
      }
    }, []);

    // Wrap onSelect to bump usage counter and persist
    const handleSelect = useCallback(
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

    // Context menu handlers
    const handleContextMenuRename = useCallback(() => {
      const request = safeRequests.find((r) => r.id === menu.id);
      if (request) {
        closeMenu();
        startRename(request.id, request.name ?? "");
      }
    }, [safeRequests, menu.id, closeMenu, startRename]);

    const handleContextMenuDelete = useCallback(() => {
      if (menu.id && onDelete) {
        onDelete(menu.id);
      }
      closeMenu();
    }, [menu.id, onDelete, closeMenu]);

    // Render items
    const requestItems = useMemo(() => {
      return sortedRequests.map((request) => (
        <RequestListItem
          key={request.id}
          request={request}
          active={activeId === request.id}
          isEditing={editingId === request.id}
          editingName={editingName}
          onChangeEditingName={setEditingName}
          onCommitRename={commitRename}
          onCancelRename={cancelRename}
          onSelect={handleSelect}
          onStartRename={startRename}
          onDelete={onDelete}
          onOpenContextMenuMouse={openMenuMouse}
          onOpenContextMenuKey={openMenuKey}
        />
      ));
    }, [
      sortedRequests,
      activeId,
      editingId,
      editingName,
      setEditingName,
      commitRename,
      cancelRename,
      handleSelect,
      startRename,
      onDelete,
      openMenuMouse,
      openMenuKey,
    ]);

    return (
      <aside
        className={containerClasses}
        role="complementary"
        aria-label={ARIA_LABELS.REQUEST_LIST}
      >
        <RequestListHeader
          total={safeRequests.length}
          query={query}
          onChangeQuery={setQuery}
          onCreate={onCreate}
        />

        {/* Small sort toolbar (no external deps) */}
        <div className={STYLES.SORT_BAR}>
          <span>Sort by</span>
          <div className="flex gap-1">
            <button
              type="button"
              className={`${STYLES.SORT_BTNS} ${sortMode === "name" ? STYLES.SORT_BTNS_ACTIVE : ""}`}
              aria-pressed={sortMode === "name"}
              onClick={() => changeSort("name")}
            >
              Name (A–Z)
            </button>
            <button
              type="button"
              className={`${STYLES.SORT_BTNS} ${sortMode === "most-used" ? STYLES.SORT_BTNS_ACTIVE : ""}`}
              aria-pressed={sortMode === "most-used"}
              onClick={() => changeSort("most-used")}
              title="Put most used on top"
            >
              Most used
            </button>
          </div>
        </div>

        <ScrollArea className={STYLES.SCROLL_AREA}>
          {sortedRequests.length === 0 ? (
            <div className={STYLES.EMPTY_WRAPPER}>
              <EmptyState
                hasQuery={Boolean(query)}
                query={query}
                onCreate={onCreate}
              />
            </div>
          ) : (
            <ul
              ref={ulRef}
              className={STYLES.LIST_CONTAINER}
              role="list"
              aria-label="Requests"
            >
              {requestItems}
            </ul>
          )}
        </ScrollArea>

        <RequestContextMenu
          open={Boolean(menu.id)}
          x={menu.x}
          y={menu.y}
          canDelete={Boolean(onDelete)}
          onRename={handleContextMenuRename}
          onDelete={handleContextMenuDelete}
          onClose={closeMenu}
        />
      </aside>
    );
  }
);

// Set display name for debugging
RequestList.displayName = "RequestList";
