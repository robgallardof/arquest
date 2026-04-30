"use client";

import * as React from "react";
import { useRef, useCallback, JSX } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { FiUpload, FiDownload, FiChevronDown } from "react-icons/fi";
import { useStore } from "@/lib/state/store";
import { importPostman, exportPostman } from "@/lib/collections/postman";
import { importThunder, exportThunder } from "@/lib/collections/thunder";
import type { RequestModel } from "@/lib/domain/models";
import { toast } from "sonner";

/** Internal collection shape used by import/export actions. */
type Collection = { id: string; name: string; requests: RequestModel[] };

/**
 * Trigger a browser JSON download with a safe file name.
 * @param filename The final file name.
 * @param jsonData JSON payload already stringified.
 */
function downloadJson(filename: string, jsonData: string): void {
  const blob = new Blob([jsonData], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/**
 * Import/export controls with compact dropdown UX.
 * - Import: Postman/Thunder JSON files.
 * - Export: Postman/Thunder JSON files.
 * - Keeps dark-mode visual consistency using shared shadcn menu styles.
 */
export function ImportExportMenu(): React.JSX.Element {
  const { upsertCollection } = useStore() as {
    upsertCollection: (c: Collection) => void;
  };

  const fileRef = useRef<HTMLInputElement>(null);

  /**
   * Open file picker, parse JSON, and insert a collection into store.
   * @param kind Source format to parse.
   */
  const importFromFile = useCallback(
    (kind: "postman" | "thunder") => {
      const input = fileRef.current;
      if (!input) return;

      const handler = async () => {
        const file = input.files?.[0];
        input.value = "";
        if (!file) return;

        try {
          const text = await file.text();
          const json = JSON.parse(text) as unknown;
          const col =
            kind === "postman"
              ? (importPostman(json) as Collection)
              : (importThunder(json) as Collection);
          upsertCollection(col);
          toast.success(`Imported: ${col.name}`);
        } catch {
          toast.error("Invalid JSON file.");
        }
      };

      input.onchange = () => void handler();
      input.click();
    },
    [upsertCollection]
  );

  /**
   * Export currently active collection in selected format.
   * @param kind Target format.
   */
  const exportActive = useCallback((kind: "postman" | "thunder") => {
    const { collections, activeCollectionId } = useStore.getState() as {
      collections: Record<string, Collection>;
      activeCollectionId?: string;
    };
    const c = activeCollectionId ? collections[activeCollectionId] : undefined;

    if (!c) {
      toast.error("Select a collection to export.");
      return;
    }

    const data =
      kind === "postman"
        ? JSON.stringify(exportPostman(c), null, 2)
        : JSON.stringify(exportThunder(c), null, 2);

    const ext =
      kind === "postman" ? "postman_collection.json" : "thunder_collection.json";
    const filename = `${c.name.replace(/\s+/g, "_")}.${ext}`;
    downloadJson(filename, data);
    toast.success(`Exported: ${filename}`);
  }, []);

  return (
    <div className="flex items-center gap-1.5">
      <input
        ref={fileRef}
        type="file"
        accept=".json,application/json"
        className="hidden"
      />

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button size="sm" variant="outline" className="text-[13px] gap-1.5">
            <FiUpload size={14} /> Import <FiChevronDown size={12} />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel>Import Collections</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => importFromFile("postman")}>
            From Postman (JSON)
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => importFromFile("thunder")}>
            From Thunder (JSON)
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button size="sm" className="text-[13px] gap-1.5">
            <FiDownload size={14} /> Export <FiChevronDown size={12} />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-64">
          <DropdownMenuLabel>Export Current Collection</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => exportActive("postman")}>
            As Postman Collection (JSON)
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => exportActive("thunder")}>
            As Thunder Collection (JSON)
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
