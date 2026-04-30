"use client";

import { create } from "zustand";
import {
  createStore,
  set as kvSet,
  get as kvGet,
  del as kvDel,
  keys as kvKeys,
} from "idb-keyval";
import type { RequestModel } from "@/lib/domain/models";
import type { Collection as UiCollection } from "@/types/collections";

/**
 * Global app state.
 * Uses the UI Collection shape, which includes optional `iconColor`.
 */
type State = {
  /** In-memory map of collections keyed by collection id. */
  collections: Record<string, UiCollection>;
  /** Currently active collection id (used to drive the UI). */
  activeCollectionId?: string;
  /** Currently opened request id within the active collection. */
  openRequestId?: string;

  /**
   * Creates or updates a collection in state and persists it to IndexedDB.
   * @param c The collection to upsert.
   */
  upsertCollection: (c: UiCollection) => void;

  /**
   * Removes a collection from state and IndexedDB.
   * @param id Collection id.
   */
  removeCollection: (id: string) => void;

  /**
   * Sets the active collection id (does not persist anything by itself).
   * @param id Optional collection id; when omitted, clears the active selection.
   */
  setActiveCollection: (id?: string) => void;

  /**
   * Sets the opened request id (does not persist anything by itself).
   * @param id Optional request id; when omitted, clears the opened request.
   */
  setOpenRequest: (id?: string) => void;

  /**
   * Creates or updates a request inside the given collection and persists the collection.
   * Also sets the opened request id to the provided request.
   * @param cId Collection id.
   * @param r   Request to upsert.
   */
  upsertRequest: (cId: string, r: RequestModel) => void;
};

/** Legacy key prefix used when migrating from the default idb-keyval store. */
const PREFIX = "tp_col_";

/** Dedicated IndexedDB store. */
const KV = createStore("tp-db", "collections");

/** Guard to avoid multiple hydrations under HMR. */
let didHydrate = false;

/** Scoped idb helpers (persist the full UI collection shape). */
export const idb = {
  /** Saves a collection by id into the dedicated store. */
  async save(c: UiCollection): Promise<void> {
    await kvSet(c.id, c, KV);
  },

  /** Loads all collections currently stored in the dedicated store. */
  async loadAll(): Promise<Record<string, UiCollection>> {
    const out: Record<string, UiCollection> = {};
    const allKeys = await kvKeys(KV);
    for (const k of allKeys) {
      const id = String(k);
      const v = (await kvGet(id, KV)) as UiCollection | undefined;
      if (v) out[id] = v;
    }
    return out;
  },

  /** Removes a single collection by id. */
  async remove(id: string): Promise<void> {
    await kvDel(id, KV);
  },

  /**
   * One-time migration:
   * moves prefixed keys from the default store into the dedicated store (KV).
   */
  async migrateFromDefault(): Promise<void> {
    const defaultKeys = await kvKeys();
    for (const k of defaultKeys) {
      if (typeof k === "string" && k.startsWith(PREFIX)) {
        const data = (await kvGet(k)) as Partial<UiCollection> | undefined;
        if (data && data.id && data.name && Array.isArray(data.requests)) {
          const normalized: UiCollection = {
            id: data.id,
            name: data.name,
            requests: data.requests,
            iconColor: data.iconColor,
          };
          await kvSet(normalized.id, normalized, KV);
        }
        await kvDel(k);
      }
    }
  },
};

/** Global Zustand store (mirrors collection mutations into IndexedDB). */
export const useStore = create<State>()((set, get) => ({
  collections: {},
  activeCollectionId: undefined,
  openRequestId: undefined,

  /** Upserts a collection and persists it. */
  upsertCollection: (c) => {
    set((s) => ({ collections: { ...s.collections, [c.id]: c } }));
    void idb.save(c);
  },

  /** Removes a collection and deletes it from IndexedDB. */
  removeCollection: (id) => {
    set((s) => {
      const { [id]: _removed, ...rest } = s.collections;
      return { collections: rest };
    });
    void idb.remove(id);
  },

  /** Sets the active collection id. */
  setActiveCollection: (id) => set({ activeCollectionId: id }),

  /** Sets the opened request id. */
  setOpenRequest: (id) => set({ openRequestId: id }),

  /** Upserts a request inside a collection and persists the updated collection. */
  upsertRequest: (cId, r) => {
    const c = get().collections[cId];
    if (!c) return;
    const idx = c.requests.findIndex((x) => x.id === r.id);
    const reqs = [...c.requests];
    if (idx >= 0) reqs[idx] = r;
    else reqs.push(r);
    const updated: UiCollection = { ...c, requests: reqs };
    set((s) => ({
      collections: { ...s.collections, [cId]: updated },
      openRequestId: r.id,
    }));
    void idb.save(updated);
  },
}));

// ---- One-time client hydration ----
if (typeof window !== "undefined" && !didHydrate) {
  didHydrate = true;
  (async () => {
    let loaded = await idb.loadAll();

    if (Object.keys(loaded).length === 0) {
      await idb.migrateFromDefault();
      loaded = await idb.loadAll();
    }

    const ids = Object.keys(loaded);
    const active = ids[0];
    useStore.setState({
      collections: loaded,
      activeCollectionId: active,
      openRequestId: active ? loaded[active]?.requests[0]?.id : undefined,
    });
  })();
}
