"use client";
import { CollectionsRepo, type Collection } from "@/lib/idb/collectionsRepo";

/**
 * Collections Commands
 * Write operations for collections persisted in IndexedDB.
 */
export const CollectionsCommands = {
  /**
   * Replaces the entire "collections" store with the provided snapshot.
   * Use after imports or bulk structural changes.
   */
  replaceAllSnapshot(map: Record<string, Collection>): Promise<void> {
    return CollectionsRepo.replaceAllAtomic(map);
  },
};
