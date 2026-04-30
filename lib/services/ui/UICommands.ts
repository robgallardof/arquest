"use client";
import { UIRepo } from "@/lib/idb/uiRepo";

/**
 * UI Commands
 * Write operations for UI state persisted in IndexedDB.
 */
export const UICommands = {
  /** Sets the sidebar width (clamped by caller). */
  setSidebarWidth(px: number): Promise<void> {
    return UIRepo.setNumber("sidebar:width", px);
  },
  /** Sets the sidebar collapsed flag. */
  setSidebarCollapsed(collapsed: boolean): Promise<void> {
    return UIRepo.setBoolean("sidebar:collapsed", collapsed);
  },
  /** Sets the request pane width (clamped by caller). */
  setRequestPaneWidth(px: number): Promise<void> {
    return UIRepo.setNumber("requestpane:width", px);
  },
  setLanguage(lang: "es" | "en"): Promise<void> {
    return UIRepo.setString("ui:language", lang);
  },
  setEnvVars(vars: Record<string, string>): Promise<void> {
    return UIRepo.setString("ui:envvars", JSON.stringify(vars));
  },
};
