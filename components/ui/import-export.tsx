"use client";

import * as React from "react";
import { useRef, useCallback, JSX } from "react";
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

/** Single-key KV used in IndexedDB. */
const KV_KEY = "collections";

/** IDB config (single database with a 'kv' object store). */
const IDB = {
  name: "app-store",
  version: 1,
  store: "kv",
} as const;

/**
 * Opens (or creates) the IndexedDB database and object store.
 * Ensures a simple KV store with keyPath 'k'.
 */
async function openDb(): Promise<IDBDatabase> {
  if (typeof indexedDB === "undefined") {
    throw new Error("IndexedDB not available");
  }
  return await new Promise((resolve, reject) => {
    const req = indexedDB.open(IDB.name, IDB.version);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(IDB.store)) {
        db.createObjectStore(IDB.store, { keyPath: "k" });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

/**
 * Puts a value into the KV store, under the provided key.
 * Uses structured clone (safe for plain JS objects/arrays).
 */
async function idbSet<T>(key: string, value: T): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(IDB.store, "readwrite");
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    const store = tx.objectStore(IDB.store);
    store.put({ k: key, v: value });
  });
  db.close?.();
}

/**
 * Reads a value from the KV store.
 */
async function idbGet<T>(key: string): Promise<T | undefined> {
  const db = await openDb();
  const value = await new Promise<T | undefined>((resolve, reject) => {
    const tx = db.transaction(IDB.store, "readonly");
    tx.onerror = () => reject(tx.error);
    const store = tx.objectStore(IDB.store);
    const getReq = store.get(key);
    getReq.onsuccess = () => resolve(getReq.result?.v as T | undefined);
    getReq.onerror = () => reject(getReq.error);
  });
  db.close?.();
  return value;
}

/**
 * Persists current collections to IndexedDB.
 * Falls back to localStorage if IDB is not available.
 */
async function persistNow(): Promise<void> {
  try {
    const { collections } = useStore.getState() as {
      collections: Record<string, Collection>;
    };
    await idbSet(KV_KEY, collections);
  } catch {
    // Fallback (rare/no-IDB environments)
    try {
      const { collections } = useStore.getState() as {
        collections: Record<string, Collection>;
      };
      localStorage.setItem(KV_KEY, JSON.stringify(collections));
    } catch {
      // ignore
    }
  }
}

/**
 * Import/Export controls for Postman/Thunder formats.
 * - No `any` types.
 * - Persists after successful import (IndexedDB first, localStorage as fallback).
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
          void persistNow();
          alert("Colección importada: " + (col as Collection).name);
        } catch {
          alert("Archivo inválido.");
        } finally {
          input.value = "";
          input.removeEventListener("change", handler);
        }
      };

      // stable handler ref for removal
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
      <Button size="sm" variant="outline" onClick={() => onPick("postman")}>
        Import Postman
      </Button>
      <Button size="sm" variant="outline" onClick={() => onPick("thunder")}>
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
