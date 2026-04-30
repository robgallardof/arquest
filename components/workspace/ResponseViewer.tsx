"use client";

import * as React from "react";
import { useMemo, useState, useRef, useEffect, JSX } from "react";
import dynamic from "next/dynamic";
import { Button } from "@/components/ui/button";
import { Copy } from "lucide-react";
import { prettyMaybe } from "@/utils/json";
import { gsap } from "gsap";
import { MonacoView } from "@/components/code/MonacoView";
import { detectLanguage, looksLikeJson } from "@/lib/monaco/setup";

/** Dynamically loaded JSON graph (React Flow). */
const JsonGraphFlow = dynamic(
  () =>
    import("@/components/json-graph/JsonGraphFlow").then((m) => m.JsonGraphFlow),
  { ssr: false }
);

/** Plain textarea fallback for very large payloads. */
function TextAreaFallback({ value }: { value: string }) {
  return (
    <textarea
      className="absolute inset-0 w-full h-full p-3 border rounded-md bg-background font-mono text-xs resize-none"
      readOnly
      value={value}
      aria-label="HTTP response body"
    />
  );
}

/** requestIdleCallback (with setTimeout fallback) to avoid blocking UI. */
const rIC = (cb: () => void) =>
  (window as any).requestIdleCallback
    ? (window as any).requestIdleCallback(cb, { timeout: 600 })
    : setTimeout(cb, 0);
const cRIC = (id: any) =>
  (window as any).cancelIdleCallback
    ? (window as any).cancelIdleCallback(id)
    : clearTimeout(id);

/**
 * ResponseViewer
 * --------------
 * Pretty | Graph viewer for HTTP responses.
 * - Graph uses JsonGraphFlow (search, copy, expand/collapse, zoom, shortcuts).
 * - Pretty uses MonacoView or textarea fallback for huge payloads.
 * - Copy overlay always available.
 */
export function ResponseViewer({
  status,
  statusCode,
  body,
  contentType,
}: {
  status: string;
  statusCode: number | null;
  body: string;
  contentType?: string;
}): React.JSX.Element {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (containerRef.current) {
      gsap.fromTo(
        containerRef.current,
        { opacity: 0, y: 8 },
        { opacity: 1, y: 0, duration: 0.4, ease: "power2.out" }
      );
    }
  }, []);

  const prettyBody = useMemo(() => prettyMaybe(body), [body]);
  const isJsonLike = useMemo(
    () => looksLikeJson(prettyBody ?? body ?? "", contentType),
    [prettyBody, body, contentType]
  );

  const [viewMode, setViewMode] = useState<"pretty" | "graph">("pretty");
  useEffect(() => {
    if (!isJsonLike && viewMode !== "pretty") setViewMode("pretty");
  }, [isJsonLike, viewMode]);

  // Prepare graph JSON on demand (idle)
  const [graphData, setGraphData] = useState<string | null>(null);
  const [graphErr, setGraphErr] = useState<string | null>(null);
  useEffect(() => {
    let cancelled = false;
    setGraphData(null);
    setGraphErr(null);
    if (!(isJsonLike && viewMode === "graph")) return;

    const jsonText = (prettyBody ?? body ?? "").trim();
    const id = rIC(() => {
      if (cancelled) return;
      try {
        JSON.parse(jsonText);
        if (!cancelled) setGraphData(jsonText);
      } catch (e: any) {
        if (!cancelled) setGraphErr(e?.message || "Invalid JSON");
      }
    });

    return () => {
      cancelled = true;
      cRIC(id);
    };
  }, [isJsonLike, viewMode, prettyBody, body]);

  const language = useMemo(
    () => detectLanguage(prettyBody ?? "", contentType),
    [prettyBody, contentType]
  );

  const tooLarge = (prettyBody?.length ?? 0) > 2_000_000;

  const statusTone =
    statusCode == null
      ? "bg-muted text-foreground/70 ring-border/50"
      : statusCode >= 200 && statusCode < 300
        ? "bg-emerald-500/15 text-emerald-700 ring-emerald-500/20"
        : statusCode >= 300 && statusCode < 400
          ? "bg-amber-500/15 text-amber-700 ring-amber-500/20"
          : "bg-rose-500/15 text-rose-700 ring-rose-500/20";
  const sendTone =
    statusCode != null && statusCode >= 200 && statusCode < 300
      ? "text-emerald-700"
      : statusCode != null && statusCode >= 400
        ? "text-rose-700"
        : "text-foreground";

  // Global shortcuts for view toggle
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === "g" && !e.ctrlKey && !e.metaKey) {
        if (isJsonLike) setViewMode("graph");
      }
      if (e.key.toLowerCase() === "p" && !e.ctrlKey && !e.metaKey) {
        setViewMode("pretty");
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isJsonLike]);

  return (
    <div ref={containerRef}>
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 mb-2 text-xs">
        <span className={`rounded-full px-2.5 py-1 ring-1 font-medium ${statusTone}`}>
          {statusCode ?? "-"} · {status || "Sin estado"}
        </span>

        <div className="flex items-center gap-2">
          {contentType && (
            <span className="text-muted-foreground">· {contentType}</span>
          )}

          {isJsonLike && (
            <div className="inline-flex items-center rounded-md border bg-muted/30 p-0.5">
              <button
                type="button"
                aria-label="Pretty view"
                className={[
                  "px-2 py-1 rounded-[4px]",
                  "text-[11px] md:text-[12px]",
                  viewMode === "pretty"
                    ? "bg-background shadow-sm ring-1 ring-border"
                    : "text-muted-foreground hover:text-foreground",
                ].join(" ")}
                onClick={() => setViewMode("pretty")}
              >
                Pretty
              </button>
              <button
                type="button"
                aria-label="Graph view"
                className={[
                  "px-2 py-1 rounded-[4px]",
                  "text-[11px] md:text-[12px]",
                  viewMode === "graph"
                    ? "bg-background shadow-sm ring-1 ring-border"
                    : "text-muted-foreground hover:text-foreground",
                ].join(" ")}
                onClick={() => setViewMode("graph")}
              >
                Graph
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Viewer */}
      <div className="relative rounded-md border h-[42vh] sm:h-[48vh] md:h-[56vh] lg:h-[62vh]">
        {isJsonLike && viewMode === "graph" ? (
          graphErr ? (
            <div className="flex items-center justify-center h-full text-sm text-rose-400">
              Failed to parse JSON: {graphErr}
            </div>
          ) : graphData ? (
            <JsonGraphFlow
              data={graphData}
              className="w-full h-full"
              height="100%"
            />
          ) : (
            <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
              Preparing graph…
            </div>
          )
        ) : tooLarge ? (
          <>
            <TextAreaFallback value={prettyBody ?? ""} />
            {/* Copy overlay (fallback) */}
            <Button
              type="button"
              size="sm"
              variant="secondary"
              aria-label="Copy response"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(prettyBody ?? "");
                } catch {
                  const ta = document.createElement("textarea");
                  ta.value = prettyBody ?? "";
                  ta.style.position = "fixed";
                  ta.style.opacity = "0";
                  document.body.appendChild(ta);
                  ta.select();
                  document.execCommand("copy");
                  document.body.removeChild(ta);
                }
              }}
              className={`absolute right-2 bottom-2 sm:top-2 sm:bottom-auto gap-1.5 shadow-sm ring-1 ring-border/60 hover:ring-border bg-background/90 backdrop-blur ${sendTone}`}
            >
              <Copy className="h-4 w-4" />
              <span className="hidden md:inline">Copiar respuesta</span>
            </Button>
          </>
        ) : (
          <>
            <MonacoView
              language={language}
              value={prettyBody ?? ""}
              readOnly
              height="100%"
              className="h-full"
              // extra options merged with MonacoView defaults
              options={{
                contextmenu: true,
              }}
              fallback={<TextAreaFallback value={prettyBody ?? ""} />}
            />
            {/* Copy overlay (Monaco) */}
            <Button
              type="button"
              size="sm"
              variant="secondary"
              aria-label="Copy response"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(prettyBody ?? "");
                } catch {
                  const ta = document.createElement("textarea");
                  ta.value = prettyBody ?? "";
                  ta.style.position = "fixed";
                  ta.style.opacity = "0";
                  document.body.appendChild(ta);
                  ta.select();
                  document.execCommand("copy");
                  document.body.removeChild(ta);
                }
              }}
              className={`absolute right-2 bottom-2 sm:top-2 sm:bottom-auto gap-1.5 shadow-sm ring-1 ring-border/60 hover:ring-border bg-background/90 backdrop-blur ${sendTone}`}
            >
              <Copy className="h-4 w-4" />
              <span className="hidden md:inline">Copiar respuesta</span>
            </Button>
          </>
        )}
      </div>

      <div className="sr-only" aria-live="polite">
        {status}
      </div>
    </div>
  );
}
