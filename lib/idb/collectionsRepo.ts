"use client";
import { openAppDB, txDone } from "./core";
import type { RequestModel } from "@/lib/domain/models";

/**
 * Collections Repository
 * Stores full collection snapshots in "collections" (keyPath: "id").
 */

export interface Collection {
  id: string;
  name: string;
  requests: RequestModel[];
}

export const CollectionsRepo = {
  /**
   * Atomically replaces the "collections" store with the provided map
   * using a single readwrite transaction.
   */
  async replaceAllAtomic(map: Record<string, Collection>) {
    const db = await openAppDB();
    const tx = db.transaction("collections", "readwrite");
    const st = tx.objectStore("collections");

    st.clear();
    for (const col of Object.values(map)) {
      st.put(col as any);
    }
    await txDone(tx);
  },

  /**
   * Reads all collections and returns a record keyed by id.
   */
  async getAllAsMap(): Promise<Record<string, Collection>> {
    const db = await openAppDB();
    const tx = db.transaction("collections", "readonly");
    const st = tx.objectStore("collections");

    const req = st.getAll();
    const arr = (await new Promise<Collection[]>((resolve, reject) => {
      req.onsuccess = () => resolve((req.result as Collection[]) ?? []);
      req.onerror = () => reject(req.error);
    })) as Collection[];

    const out: Record<string, Collection> = {};
    for (const c of arr) out[c.id] = c;
    return out;
  },
};
