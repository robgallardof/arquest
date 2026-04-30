"use client";
import { CollectionsRepo, type Collection } from "@/lib/idb/collectionsRepo";

/**
 * Collections Queries
 * Read-only operations for collections persisted in IndexedDB.
 */
export const CollectionsQueries = {
  /** Loads all collections as a record keyed by id. */
  getAll(): Promise<Record<string, Collection>> {
    return CollectionsRepo.getAllAsMap();
  },
};
