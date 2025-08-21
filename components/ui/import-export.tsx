"use client";

import * as React from "react";
import { useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { useStore } from "@/lib/state/store";
import { importPostman, exportPostman } from "@/lib/collections/postman";
import { importThunder, exportThunder } from "@/lib/collections/thunder";
import type { RequestModel } from "@/lib/domain/models";

/** Matches Sidebar's record structure to persist consistently. */
interface Collection {
  id: string;
  name: string;
  requests: RequestModel[];
}

const LS_KEY = "collections";

/** Persists current collections to localStorage. */
function persistNow(): void {
  try {
    const { collections } = useStore.getState() as {
      collections: Record<string, Collection>;
    };
    localStorage.setItem(LS_KEY, JSON.stringify(collections));
  } catch {
    // ignore
  }
}

/**
 * Import/Export controls for Postman/Thunder formats.
 * - No `any` types.
 * - Persists after successful import.
 */
export function ImportExport(): JSX.Element {
  const fileRef = useRef<HTMLInputElement>(null);
  const { upsertCollection } = useStore() as {
    upsertCollection: (c: Collection) => void;
  };

  /** Opens a file picker and imports a collection in the chosen format. */
  const onPick = useCallback(
    (type: "postman" | "thunder"): void => {
      const input = fileRef.current;
      if (!input) return;

      const handleChange = async (): Promise<void> => {
        const file = input.files?.[0];
        if (!file) return;
        try {
          const text = await file.text();
          const json = JSON.parse(text) as unknown;
          const col =
            type === "postman" ? importPostman(json) : importThunder(json);
          upsertCollection(col as Collection);
          persistNow();
          alert("Colección importada: " + (col as Collection).name);
        } catch {
          alert("Archivo inválido.");
        } finally {
          input.value = "";
          input.removeEventListener("change", handler);
        }
      };

      // keep a stable ref to remove listener
      const handler = (): void => {
        void handleChange();
      };

      input.addEventListener("change", handler, { once: true });
      input.click();
    },
    [upsertCollection]
  );

  /**
   * Exports the active collection to the selected format (Postman/Thunder).
   * @param format - Desired export format.
   */
  const onExport = useCallback((format: "postman" | "thunder"): void => {
    const { collections, activeCollectionId } = useStore.getState() as {
      collections: Record<string, Collection>;
      activeCollectionId?: string;
    };
    const c = activeCollectionId ? collections[activeCollectionId] : undefined;
    if (!c) {
      alert("Selecciona una colección");
      return;
    }
    const data =
      format === "postman"
        ? JSON.stringify(exportPostman(c), null, 2)
        : JSON.stringify(exportThunder(c), null, 2);

    const ext =
      format === "postman"
        ? "postman_collection.json"
        : "thunder_collection.json";
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
    <div
      className="flex items-center gap-2"
      aria-label="Import export controls"
    >
      <input
        type="file"
        ref={fileRef}
        className="hidden"
        accept=".json,application/json"
      />
      <Button
        size="sm"
        variant="outline"
        onClick={() => onPick("postman")}
      >
        Import Postman
      </Button>
      <Button
        size="sm"
        variant="outline"
        onClick={() => onPick("thunder")}
      >
        Import Thunder
      </Button>
      <span className="mx-2 text-muted-foreground" aria-hidden="true">
        |
      </span>
      <Button size="sm" onClick={() => onExport("postman")}>
        Export Postman
      </Button>
      <Button size="sm" onClick={() => onExport("thunder")}>
        Export Thunder
      </Button>
    </div>
  );
}
