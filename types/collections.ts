import type { RequestModel } from "@/lib/domain/models";

/**
 * A named set of API requests.
 * Optionally includes a hex `iconColor` to tint its icon.
 */
export interface Collection {
  id: string;
  name: string;
  requests: RequestModel[];
  /** Optional hex color used to tint the collection icon (e.g. #6b7280). */
  iconColor?: string;
}

/** Allowed actions in the contextual menu. */
export type MenuActionId = "rename" | "duplicate" | "export" | "delete";

/** Contextual menu item descriptor. */
export interface MenuItem {
  id: MenuActionId;
  label: string;
  destructive?: boolean;
  onSelect: () => void;
}
