"use client";
import { UIRepo, type UIKey } from "@/lib/idb/uiRepo";

/**
 * UI Queries
 * Read-only operations for UI state persisted in IndexedDB.
 */
export const UIQueries = {
  /** Returns the sidebar width if present. */
  getSidebarWidth(): Promise<number | undefined> {
    return UIRepo.getNumber("sidebar:width");
  },
  /** Returns whether the sidebar is collapsed if present. */
  isSidebarCollapsed(): Promise<boolean | undefined> {
    return UIRepo.getBoolean("sidebar:collapsed");
  },
  /** Returns the request pane width if present. */
  getRequestPaneWidth(): Promise<number | undefined> {
    return UIRepo.getNumber("requestpane:width");
  },
  getLanguage(): Promise<string | undefined> {
    return UIRepo.getString("ui:language");
  },
  async getEnvVars(): Promise<Record<string, string>> {
    const raw = await UIRepo.getString("ui:envvars");
    if (!raw) return {};
    try {
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== "object") return {};
      return Object.fromEntries(
        Object.entries(parsed).filter(
          ([k, v]) => typeof k === "string" && typeof v === "string"
        )
      );
    } catch {
      return {};
    }
  },
};
