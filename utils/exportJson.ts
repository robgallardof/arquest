import type { Collection } from "@/types/collections";

/**
 * Triggers a client-side download of the provided collection as a JSON file.
 * @param col The collection to serialize and download.
 */
export function exportCollectionToJson(col: Collection): void {
  try {
    const data = JSON.stringify(col, null, 2);
    const blob = new Blob([data], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${(col.name || "collection")
      .trim()
      .replace(/\s+/g, "_")}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  } catch {}
}
