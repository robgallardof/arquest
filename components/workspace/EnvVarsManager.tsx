"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

type Pair = { key: string; value: string };

export function EnvVarsManager({
  value,
  onSave,
}: {
  value: Record<string, string>;
  onSave: (next: Record<string, string>) => void;
}) {
  const [rows, setRows] = React.useState<Pair[]>([]);

  React.useEffect(() => {
    setRows(Object.entries(value).map(([key, value]) => ({ key, value })));
  }, [value]);

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button type="button" variant="outline" size="sm" className="h-8 text-xs">
          Variables
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Variables de entorno</SheetTitle>
          <SheetDescription>
            Usa variables como {"{{baseUrl}}"} en URL, headers y body.
          </SheetDescription>
        </SheetHeader>

        <div className="px-4 space-y-2 overflow-y-auto">
          {rows.map((r, i) => (
            <div key={i} className="grid grid-cols-[1fr_1fr_auto] gap-2">
              <Input
                placeholder="key (ej. baseUrl)"
                value={r.key}
                onChange={(e) =>
                  setRows((prev) =>
                    prev.map((x, idx) => (idx === i ? { ...x, key: e.target.value } : x))
                  )
                }
              />
              <Input
                placeholder="value"
                value={r.value}
                onChange={(e) =>
                  setRows((prev) =>
                    prev.map((x, idx) => (idx === i ? { ...x, value: e.target.value } : x))
                  )
                }
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setRows((prev) => prev.filter((_, idx) => idx !== i))}
              >
                ✕
              </Button>
            </div>
          ))}
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => setRows((prev) => [...prev, { key: "", value: "" }])}
          >
            + Agregar variable
          </Button>
        </div>

        <div className="mt-auto p-4">
          <Button
            type="button"
            className="w-full"
            onClick={() => {
              const next = Object.fromEntries(
                rows
                  .map((x) => [x.key.trim(), x.value] as const)
                  .filter(([k]) => k.length > 0)
              );
              onSave(next);
            }}
          >
            Guardar variables
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
