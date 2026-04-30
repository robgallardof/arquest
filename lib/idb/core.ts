"use client";

/**
 * Core IndexedDB helpers (no external deps).
 * Safe for SSR: call only in client-side code (e.g. inside effects/handlers).
 */

type StoreName = "ui" | "collections";

let dbPromise: Promise<IDBDatabase> | null = null;

/**
 * Opens (or creates) the application database and object stores.
 * Schema v1:
 *  - "ui": keyPath "key" (KV store), e.g. { key: "sidebar:width", value: 288 }
 *  - "collections": keyPath "id" (full collection snapshot)
 */
export function openAppDB(): Promise<IDBDatabase> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("IndexedDB is not available during SSR."));
  }
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    const req = window.indexedDB.open("arquest-db", 1);

    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains("ui")) {
        db.createObjectStore("ui", { keyPath: "key" });
      }
      if (!db.objectStoreNames.contains("collections")) {
        db.createObjectStore("collections", { keyPath: "id" });
      }
    };

    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });

  return dbPromise;
}

/** Promisifies a single IDBRequest. */
function promisify<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result as T);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Resolves when a transaction completes.
 * Use after write operations (put/delete/clear) to ensure the commit.
 */
export function txDone(tx: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onabort = () => reject(tx.error ?? new Error("IDB transaction aborted"));
    tx.onerror = () => reject(tx.error ?? new Error("IDB transaction error"));
  });
}

/**
 * Reads a single record by key from the given store.
 */
export async function idbGet<T>(
  store: StoreName,
  key: IDBValidKey
): Promise<T | undefined> {
  const db = await openAppDB();
  const tx = db.transaction(store, "readonly");
  const st = tx.objectStore(store);
  const res = await promisify<T | undefined>(st.get(key));
  return res;
}

/**
 * Inserts or updates a record in the given store.
 * NOTE: the generic no longer requires an index signature.
 */
export async function idbSet<T extends object>(
  store: StoreName,
  value: T
): Promise<void> {
  const db = await openAppDB();
  const tx = db.transaction(store, "readwrite");
  const st = tx.objectStore(store);
  await promisify(st.put(value as any));
  await txDone(tx);
}

/** Deletes a record by key. */
export async function idbDelete(store: StoreName, key: IDBValidKey) {
  const db = await openAppDB();
  const tx = db.transaction(store, "readwrite");
  const st = tx.objectStore(store);
  await promisify(st.delete(key));
  await txDone(tx);
}

/** Clears all records in a store. */
export async function idbClear(store: StoreName) {
  const db = await openAppDB();
  const tx = db.transaction(store, "readwrite");
  const st = tx.objectStore(store);
  await promisify(st.clear());
  await txDone(tx);
}

/** Returns all records in a store as an array. */
export async function idbGetAll<T>(store: StoreName): Promise<T[]> {
  const db = await openAppDB();
  const tx = db.transaction(store, "readonly");
  const st = tx.objectStore(store);
  const res = await promisify<T[]>(st.getAll());
  return res ?? [];
}
