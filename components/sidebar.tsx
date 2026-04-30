"use client";

import * as React from "react";
import {
  useCallback,
  useDeferredValue,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { useShallow } from "zustand/react/shallow";
import { useStore } from "@/lib/state/store";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Plus, Search } from "lucide-react";
import type { RequestModel } from "@/lib/domain/models";

/** Represents a collection of API requests. */
interface Collection {
  id: string;
  name: string;
  requests: RequestModel[];
}

/** Context menu item descriptor. */
interface MenuItem {
  id: "rename" | "duplicate" | "export" | "delete";
  label: string;
  destructive?: boolean;
  onSelect: () => void;
}

/**
 * Lightweight context menu rendered via a portal.
 * Closes on outside click / Escape / viewport changes.
 */
function ContextMenuLite({
  x,
  y,
  items,
  onClose,
}: {
  x: number;
  y: number;
  items: MenuItem[];
  onClose: () => void;
}): React.JSX.Element | null {
  const menuRef = useRef<HTMLDivElement>(null);
  const [activeIdx, setActiveIdx] = useState<number>(0);

  React.useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node))
        onClose();
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    const handleViewport = () => onClose();
    window.addEventListener("mousedown", handleClick);
    window.addEventListener("keydown", handleKey);
    window.addEventListener("scroll", handleViewport, { passive: true });
    window.addEventListener("resize", handleViewport);
    return () => {
      window.removeEventListener("mousedown", handleClick);
      window.removeEventListener("keydown", handleKey);
      window.removeEventListener("scroll", handleViewport);
      window.removeEventListener("resize", handleViewport);
    };
  }, [onClose]);

  const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIdx((p) => (p + 1) % items.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIdx((p) => (p - 1 + items.length) % items.length);
    } else if (e.key === "Enter") {
      e.preventDefault();
      items[activeIdx]?.onSelect();
      onClose();
    } else if (e.key === "Escape") {
      e.preventDefault();
      onClose();
    }
  };

  const style: React.CSSProperties = {
    position: "fixed",
    left: x,
    top: y,
    zIndex: 50,
    minWidth: 176,
  };

  const node = (
    <div
      ref={menuRef}
      role="menu"
      tabIndex={-1}
      onKeyDown={onKeyDown}
      className="rounded-md border border-border bg-background shadow-popover focus:outline-none"
      style={style}
    >
      <ul>
        {items.map((it, i) => (
          <li key={it.id}>
            <button
              role="menuitem"
              className={[
                "w-full text-left px-3 py-2 text-sm transition-colors",
                i === activeIdx
                  ? "bg-accent text-accent-foreground"
                  : "hover:bg-accent",
                it.destructive ? "text-destructive" : "",
              ].join(" ")}
              onMouseEnter={() => setActiveIdx(i)}
              onClick={() => {
                it.onSelect();
                onClose();
              }}
            >
              {it.label}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );

  const backdrop = (
    <div aria-hidden className="fixed inset-0 z-40" onClick={onClose} />
  );
  if (typeof document === "undefined") return null;
  return createPortal(
    <>
      {backdrop}
      {node}
    </>,
    document.body
  );
}

/**
 * Sidebar with fixed toolbar (New + Search) and a scrollable list below.
 * - Only the list scrolls (header and search are fixed).
 * - Responsive: full width on small screens, 18rem on md+.
 * - Strong truncation rules with min-w-0 to avoid invisible text.
 */
export function Sidebar(): React.JSX.Element {
  const {
    collections,
    activeCollectionId,
    setActiveCollection,
    upsertCollection,
    removeCollection,
  } = useStore(
    useShallow((s) => ({
      collections: s.collections as Record<string, Collection>,
      activeCollectionId: s.activeCollectionId as string | undefined,
      setActiveCollection: s.setActiveCollection as (id: string) => void,
      upsertCollection: s.upsertCollection as (c: Collection) => void,
      removeCollection: s.removeCollection as (id: string) => void,
    }))
  );

  // UI state
  const [query, setQuery] = useState<string>("");
  const deferredQuery = useDeferredValue(query);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState<string>("");

  // Context menu state
  const [menuOpen, setMenuOpen] = useState<boolean>(false);
  const [menuX, setMenuX] = useState<number>(0);
  const [menuY, setMenuY] = useState<number>(0);
  const [menuForId, setMenuForId] = useState<string | null>(null);

  // Derived list
  const list: Collection[] = useMemo(() => {
    const all = Object.values(collections);
    if (!deferredQuery) return all;
    const q = deferredQuery.toLowerCase();
    return all.filter((c) => c.name.toLowerCase().includes(q));
  }, [collections, deferredQuery]);

  /** Create a new collection and start inline rename. */
  const addCollection = useCallback((): void => {
    const id = crypto.randomUUID();
    const col: Collection = { id, name: "Nueva colección", requests: [] };
    upsertCollection(col);
    setActiveCollection(id);
    setEditingId(id);
    setEditingName(col.name);
  }, [setActiveCollection, upsertCollection]);

  /** Begin rename. */
  const startRename = useCallback((col: Collection): void => {
    setEditingId(col.id);
    setEditingName(col.name);
  }, []);

  /** Commit rename. */
  const commitRename = useCallback((): void => {
    if (!editingId) return;
    const trimmed = editingName.trim();
    if (!trimmed) {
      setEditingId(null);
      return;
    }
    const current = collections[editingId];
    if (current && current.name !== trimmed)
      upsertCollection({ ...current, name: trimmed });
    setEditingId(null);
  }, [collections, editingId, editingName, upsertCollection]);

  /** Cancel rename. */
  const cancelRename = useCallback((): void => {
    setEditingId(null);
  }, []);

  /** Duplicate. */
  const duplicate = useCallback(
    (col: Collection): void => {
      const id = crypto.randomUUID();
      const copy: Collection = {
        id,
        name: `${col.name} (copy)`,
        requests: JSON.parse(JSON.stringify(col.requests)) as RequestModel[],
      };
      upsertCollection(copy);
      setActiveCollection(id);
    },
    [setActiveCollection, upsertCollection]
  );

  /** Export JSON. */
  const exportJson = useCallback((col: Collection): void => {
    try {
      const data = JSON.stringify(col, null, 2);
      const blob = new Blob([data], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${col.name.replace(/\s+/g, "_")}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch {
      /* ignore */
    }
  }, []);

  /** Remove. */
  const remove = useCallback(
    (col: Collection): void => {
      if (confirm(`Eliminar "${col.name}"?`)) removeCollection(col.id);
    },
    [removeCollection]
  );

  /** Open context menu (pointer). */
  const openMenu = useCallback(
    (e: React.MouseEvent<HTMLButtonElement>, col: Collection): void => {
      e.preventDefault();
      setMenuForId(col.id);
      setMenuX(e.clientX);
      setMenuY(e.clientY);
      setMenuOpen(true);
    },
    []
  );

  /** Open context menu (keyboard). */
  const openMenuFromKey = useCallback(
    (e: React.KeyboardEvent<HTMLButtonElement>, col: Collection): void => {
      if ((e.shiftKey && e.key === "F10") || e.key === "ContextMenu") {
        e.preventDefault();
        const rect = (
          e.currentTarget as HTMLButtonElement
        ).getBoundingClientRect();
        setMenuForId(col.id);
        setMenuX(rect.left + rect.width / 2);
        setMenuY(rect.top + rect.height);
        setMenuOpen(true);
      }
    },
    []
  );

  const currentForMenu: Collection | undefined = menuForId
    ? collections[menuForId]
    : undefined;
  const menuItems: MenuItem[] = React.useMemo(() => {
    if (!currentForMenu) return [];
    return [
      {
        id: "rename",
        label: "Renombrar",
        onSelect: () => startRename(currentForMenu),
      },
      {
        id: "duplicate",
        label: "Duplicar",
        onSelect: () => duplicate(currentForMenu),
      },
      {
        id: "export",
        label: "Exportar (.json)",
        onSelect: () => exportJson(currentForMenu),
      },
      {
        id: "delete",
        label: "Eliminar",
        destructive: true,
        onSelect: () => remove(currentForMenu),
      },
    ];
  }, [currentForMenu, duplicate, exportJson, remove, startRename]);

  return (
    <aside
      className="h-full w-full md:w-72 border-r bg-background flex flex-col min-h-0"
      aria-label="Sidebar"
    >
      {/* Fixed toolbar: title + New + search (does not scroll) */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/75">
        <header className="p-3 flex items-center justify-between">
          <h2
            id="collections-heading"
            className="font-semibold text-sm text-foreground"
          >
            Colecciones
          </h2>
          <Button
            size="sm"
            onClick={addCollection}
            aria-label="Crear colección"
          >
            <Plus className="h-4 w-4" />
          </Button>
        </header>
        <Separator />
        <div className="px-3 py-2 flex items-center gap-2">
          <label htmlFor="collections-search" className="sr-only">
            Buscar colección
          </label>
          <Search
            className="h-4 w-4 text-muted-foreground"
            aria-hidden="true"
          />
          <Input
            id="collections-search"
            value={query}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              setQuery(e.target.value)
            }
            placeholder="Buscar colección..."
            className="h-8 text-sm"
            aria-label="Buscar colección"
          />
        </div>
        <Separator />
      </div>

      {/* Scrollable list only */}
      <nav aria-labelledby="collections-heading" className="flex-1 min-h-0">
        <ScrollArea className="h-full">
          {list.length === 0 ? (
            <p className="text-xs text-muted-foreground p-4">
              {query
                ? "No hay colecciones que coincidan."
                : "No hay colecciones."}
            </p>
          ) : (
            <ul className="p-2 space-y-1">
              {list.map((col) => {
                const active = activeCollectionId === col.id;
                const isEditing = editingId === col.id;
                return (
                  <li key={col.id} className="min-w-0">
                    <button
                      onClick={() => setActiveCollection(col.id)}
                      onContextMenu={(e) => openMenu(e, col)}
                      onKeyDown={(e) => {
                        if (e.key === "F2") {
                          e.preventDefault();
                          startRename(col);
                        }
                        if (e.key === "Delete") {
                          e.preventDefault();
                          remove(col);
                        }
                        openMenuFromKey(e, col);
                      }}
                      className={[
                        "w-full text-left px-2 py-2 rounded transition-colors group",
                        active
                          ? "bg-primary/10 ring-1 ring-primary/30"
                          : "hover:bg-accent",
                      ].join(" ")}
                      aria-current={active ? "true" : undefined}
                      title={col.name}
                    >
                      {isEditing ? (
                        <input
                          autoFocus
                          value={editingName}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                            setEditingName(e.target.value)
                          }
                          onBlur={commitRename}
                          onKeyDown={(
                            e: React.KeyboardEvent<HTMLInputElement>
                          ) => {
                            if (e.key === "Enter") commitRename();
                            if (e.key === "Escape") cancelRename();
                          }}
                          className="w-full bg-background text-sm px-2 py-1 rounded border border-input focus:outline-none focus:ring-2 focus:ring-ring"
                          aria-label="Editar nombre de colección"
                        />
                      ) : (
                        <div className="flex items-center justify-between min-w-0">
                          <span className="text-sm font-medium truncate text-foreground">
                            {col.name.trim() || "(sin nombre)"}
                          </span>
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground shrink-0">
                            {col.requests.length}
                          </span>
                        </div>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </ScrollArea>
      </nav>

      {menuOpen && currentForMenu && (
        <ContextMenuLite
          x={menuX}
          y={menuY}
          items={menuItems}
          onClose={() => setMenuOpen(false)}
        />
      )}
    </aside>
  );
}
