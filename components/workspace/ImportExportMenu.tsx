"use client";

import * as React from "react";
import { useRef, useState, useCallback, useEffect, JSX } from "react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { FiUpload, FiDownload } from "react-icons/fi";
import { useStore } from "@/lib/state/store";
import { importPostman, exportPostman } from "@/lib/collections/postman";
import { importThunder, exportThunder } from "@/lib/collections/thunder";
import type { RequestModel } from "@/lib/domain/models";

/**
 * ImportExportMenu
 * ----------------
 * Compact Import/Export controls with lightweight popover menus.
 * - Import: Postman or Thunder (JSON)
 * - Export: Postman or Thunder (JSON)
 * - Click-outside and Esc to close
 */
export function ImportExportMenu(): JSX.Element {
  type Collection = { id: string; name: string; requests: RequestModel[] };

  const { upsertCollection } = useStore() as {
    upsertCollection: (c: Collection) => void;
  };

  const rootRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState<"import" | "export" | null>(null);
  const [importKind, setImportKind] = useState<"postman" | "thunder" | null>(
    null
  );

  const closeAll = useCallback(() => setOpen(null), []);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!rootRef.current) return;
      if (!rootRef.current.contains(e.target as Node)) closeAll();
    };
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeAll();
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onEsc);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onEsc);
    };
  }, [closeAll]);

  const importFromFile = useCallback(
    (kind: "postman" | "thunder") => {
      const input = fileRef.current;
      if (!input) return;

      const handler = async () => {
        const file = input.files?.[0];
        input.value = "";
        if (!file) return;
        try {
          const text = await file.text();
          const json = JSON.parse(text) as unknown;
          const col =
            kind === "postman"
              ? (importPostman(json) as Collection)
              : (importThunder(json) as Collection);
          upsertCollection(col);
          alert(`Collection imported: ${col.name}`);
        } catch {
          alert("Invalid JSON file.");
        }
      };

      input.onchange = () => void handler();
      input.click();
    },
    [upsertCollection]
  );

  const exportActive = useCallback((kind: "postman" | "thunder") => {
    const { collections, activeCollectionId } = useStore.getState() as {
      collections: Record<string, Collection>;
      activeCollectionId?: string;
    };
    const c = activeCollectionId ? collections[activeCollectionId] : undefined;
    if (!c) {
      alert("Select a collection to export.");
      return;
    }

    const data =
      kind === "postman"
        ? JSON.stringify(exportPostman(c), null, 2)
        : JSON.stringify(exportThunder(c), null, 2);

    const ext =
      kind === "postman" ? "postman_collection.json" : "thunder_collection.json";
    const filename = `${c.name.replace(/\s+/g, "_")}.${ext}`;

    const blob = new Blob([data], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }, []);

  return (
    <div ref={rootRef} className="flex items-center gap-1.5">
      <input
        ref={fileRef}
        type="file"
        accept=".json,application/json"
        className="hidden"
      />

      <div className="relative">
        <Button
          size="sm"
          variant="outline"
          className="text-[13px] gap-1.5"
          onClick={() => setOpen((v) => (v === "import" ? null : "import"))}
          aria-haspopup="menu"
          aria-expanded={open === "import"}
          aria-controls="import-menu"
          title="Import collection"
        >
          <FiUpload size={14} />
          Import
        </Button>

        {open === "import" && (
          <div
            id="import-menu"
            role="menu"
            className="absolute right-0 z-50 mt-2 w-48 rounded-md border bg-popover/95 p-1 text-[13px] shadow-popover backdrop-blur-sm"
          >
            <button
              className="w-full rounded px-3 py-2 text-left hover:bg-accent"
              onClick={() => {
                setImportKind("postman");
                importFromFile("postman");
                closeAll();
              }}
            >
              From Postman (JSON)
            </button>
            <button
              className="w-full rounded px-3 py-2 text-left hover:bg-accent"
              onClick={() => {
                setImportKind("thunder");
                importFromFile("thunder");
                closeAll();
              }}
            >
              From Thunder (JSON)
            </button>
          </div>
        )}
      </div>

      <div className="relative">
        <Button
          size="sm"
          className="text-[13px] gap-1.5"
          onClick={() => setOpen((v) => (v === "export" ? null : "export"))}
          aria-haspopup="menu"
          aria-expanded={open === "export"}
          aria-controls="export-menu"
          title="Export collection"
        >
          <FiDownload size={14} />
          Export
        </Button>

        {open === "export" && (
          <div
            id="export-menu"
            role="menu"
            className="absolute right-0 z-50 mt-2 w-56 rounded-md border bg-popover/95 p-1 text-[13px] shadow-popover backdrop-blur-sm"
          >
            <button
              className="w-full rounded px-3 py-2 text-left hover:bg-accent"
              onClick={() => {
                exportActive("postman");
                closeAll();
              }}
            >
              As Postman collection (JSON)
            </button>
            <Separator className="my-1" />
            <button
              className="w-full rounded px-3 py-2 text-left hover:bg-accent"
              onClick={() => {
                exportActive("thunder");
                closeAll();
              }}
            >
              As Thunder collection (JSON)
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
