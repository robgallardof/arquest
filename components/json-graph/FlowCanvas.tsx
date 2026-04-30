"use client";
import * as React from "react";
import {
  Background,
  Controls,
  MiniMap,
  ReactFlow,
  useReactFlow,
  MarkerType,
  type Edge,
  type Node,
} from "reactflow";
import "reactflow/dist/style.css";
import { TOKENS, TYPE_COLORS, hslv } from "./constants";
import type { BuildOpts, Built, JsonNodeData, Kind } from "./types";
import { buildConceptual } from "./flow/buildConceptual";
import { layoutWithElk } from "./flow/layout";
import { Toolbar } from "./ui/Toolbar";
import { PreviewDialog } from "./ui/PreviewDialog";
import { jsonPathBracket, kindOf, pathKey } from "./json-utils";
import { nodeTypes } from "./nodes/JsonNode";

/** Default styles applied to all edges. */
const DEFAULT_EDGE_OPTIONS = {
  type: "step",
  markerEnd: {
    type: MarkerType.ArrowClosed,
    width: 16,
    height: 16,
    color: TOKENS.edge,
  },
  style: { strokeWidth: 1.8, stroke: TOKENS.edgeDim },
  labelStyle: {
    fontSize: 11,
    fill: TOKENS.text,
    fontFamily: "ui-sans-serif, system-ui",
  },
  labelBgPadding: [4, 6] as [number, number],
  labelBgBorderRadius: 6,
  labelBgStyle: { fill: TOKENS.labelBg, stroke: TOKENS.labelBgStroke },
} as const;

/**
 * Utility: robust clipboard write with a DOM fallback.
 */
function copyText(txt: string) {
  const fallback = () => {
    const ta = document.createElement("textarea");
    ta.value = txt;
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.focus();
    ta.select();
    try {
      document.execCommand("copy");
    } finally {
      document.body.removeChild(ta);
    }
  };
  if (navigator.clipboard?.writeText)
    navigator.clipboard.writeText(txt).catch(fallback);
  else fallback();
}

/**
 * React Flow canvas that renders the JSON graph, manages layout, search,
 * zoom/navigation, collapsed state, and preview dialog.
 */
export function FlowCanvas({
  json,
  collapsed,
  setCollapsed,
  initialCollapseDepth,
  collapseChildCountOver,
  maxNodes,
}: {
  /** Raw JSON string to render. */
  json: string;
  /** Collapsed path set. */
  collapsed: Set<string>;
  /** Setter for collapsed set. */
  setCollapsed: React.Dispatch<React.SetStateAction<Set<string>>>;
  /** Initial collapse depth for containers. */
  initialCollapseDepth: number;
  /** Collapse threshold by number of items/keys. */
  collapseChildCountOver: number;
  /** Safety limit for node creation. */
  maxNodes: number;
}) {
  const [query, setQuery] = React.useState("");
  const opts = React.useMemo<BuildOpts>(
    () => ({
      initialCollapseDepth,
      collapseChildCountOver,
      maxNodes,
      query: query.trim().toLowerCase(),
    }),
    [initialCollapseDepth, collapseChildCountOver, maxNodes, query]
  );

  const [hint, setHint] = React.useState<string | undefined>(undefined);
  const [nodes, setNodes] = React.useState<Node<JsonNodeData>[]>([]);
  const [edges, setEdges] = React.useState<Edge[]>([]);
  const [sizes, setSizes] = React.useState<
    Record<string, { w: number; h: number }>
  >({});

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      setHint("laying out…");
      const base = buildConceptual(json, collapsed, opts);
      const laid = await layoutWithElk(base);
      if (!cancelled) {
        setNodes(laid.nodes);
        setEdges(laid.edges);
        setSizes(laid.sizes);
        setHint(undefined);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [json, collapsed, opts]);

  const rf = useReactFlow();

  const resolvePath = React.useCallback(
    (parts: string[]): any => {
      let cur: any;
      try {
        cur = JSON.parse(json || "null");
      } catch {
        return null;
      }
      for (let i = 0; i < parts.length; i++) {
        const raw = parts[i];
        if (raw === "*:object") {
          cur = Array.isArray(cur)
            ? cur.flatMap((x: any) =>
                x && !Array.isArray(x) && typeof x === "object" ? [x] : []
              )
            : [];
          continue;
        }
        if (raw === "*:array") {
          cur = Array.isArray(cur)
            ? cur.flatMap((x: any) => (Array.isArray(x) ? x : []))
            : [];
          continue;
        }
        if (Array.isArray(cur)) {
          if (/^\d+$/.test(raw)) cur = cur[Number(raw)];
          else
            cur = cur.map((it: any) =>
              it && typeof it === "object" && !Array.isArray(it)
                ? it[raw]
                : undefined
            );
        } else if (cur && typeof cur === "object") {
          cur = /^\d+$/.test(raw)
            ? (cur as any)[Number(raw)]
            : (cur as any)[raw];
        } else {
          return cur;
        }
      }
      return cur;
    },
    [json]
  );

  const onCopy = React.useCallback(
    (parts: string[]) => {
      const v = resolvePath(parts);
      const t = kindOf(v);
      if (t === "object" || t === "array") {
        try {
          copyText(JSON.stringify(v, null, 2));
        } catch {
          copyText(String(v));
        }
      } else {
        copyText(String(v));
      }
    },
    [resolvePath]
  );

  const [preview, setPreview] = React.useState<{
    open: boolean;
    title: string;
    text: string;
  }>({
    open: false,
    title: "",
    text: "",
  });

  const onPreview = React.useCallback(
    (parts: string[]) => {
      const v = resolvePath(parts);
      let text = "";
      try {
        if (
          typeof v === "string" ||
          typeof v === "number" ||
          typeof v === "boolean" ||
          v === null
        )
          text = JSON.stringify(v);
        else text = JSON.stringify(v, null, 2);
      } catch {
        text = String(v);
      }
      setPreview({ open: true, title: jsonPathBracket(parts), text });
    },
    [resolvePath]
  );

  const onToggle = React.useCallback(
    (pathId: string) => {
      setCollapsed((prev) => {
        const next = new Set(prev);
        next.has(pathId) ? next.delete(pathId) : next.add(pathId);
        return next;
      });
    },
    [setCollapsed]
  );

  const matches = React.useMemo<string[]>(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    const isMatch = (n: Node<JsonNodeData>) => {
      const d = n.data;
      if (!d) return false;
      const hay = [
        d.keyLabel,
        d.titleRight,
        ...(d.lines ?? []),
        jsonPathBracket(d.pathParts),
      ];
      return hay.some((s) => s?.toLowerCase().includes(q));
    };
    return nodes.filter(isMatch).map((n) => n.id);
  }, [nodes, query]);

  const [activeMatchId, setActiveMatchId] = React.useState<string | null>(null);
  const activeIndex = React.useMemo(
    () => (activeMatchId ? Math.max(0, matches.indexOf(activeMatchId)) : -1),
    [activeMatchId, matches]
  );

  const ensureExpandedTo = React.useCallback(
    (n: Node<JsonNodeData>) => {
      const prefixes: string[] = [];
      const acc: string[] = [];
      for (const p of n.data.pathParts) {
        acc.push(p);
        prefixes.push(pathKey([...acc]));
      }
      setCollapsed((prev) => {
        const next = new Set(prev);
        prefixes.forEach((pk) => next.delete(pk));
        return next;
      });
    },
    [setCollapsed]
  );

  const centerOnNode = React.useCallback(
    (n: Node<JsonNodeData>) => {
      const sz = sizes[n.id] ?? { w: 560, h: 160 };
      const rect = {
        x: n.position.x,
        y: n.position.y,
        width: sz.w,
        height: sz.h,
      };
      try {
        rf.fitBounds(rect, { padding: 0.32, duration: 220 });
      } catch {
        rf.setCenter(n.position.x + sz.w / 2, n.position.y + sz.h / 2, {
          duration: 220,
        });
      }
    },
    [rf, sizes]
  );

  const goToMatch = React.useCallback(
    (index: number) => {
      if (!matches.length) return;
      const safe = ((index % matches.length) + matches.length) % matches.length;
      const id = matches[safe];
      const n = nodes.find((x) => x.id === id);
      if (!n) return;
      ensureExpandedTo(n);
      setActiveMatchId(id);
      centerOnNode(n);
    },
    [matches, nodes, ensureExpandedTo, centerOnNode]
  );

  const onNext = React.useCallback(() => {
    if (!matches.length) return;
    goToMatch(activeIndex >= 0 ? activeIndex + 1 : 0);
  }, [matches, activeIndex, goToMatch]);

  const onPrev = React.useCallback(() => {
    if (!matches.length) return;
    goToMatch(activeIndex >= 0 ? activeIndex - 1 : matches.length - 1);
  }, [matches, activeIndex, goToMatch]);

  React.useEffect(() => {
    if (query && matches.length) goToMatch(0);
    else setActiveMatchId(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, nodes.length]);

  const nodesWithHandlers = React.useMemo<Node<JsonNodeData>[]>(() => {
    return nodes.map((n) => {
      const isQueryHit = !!query && matches.includes(n.id);
      return {
        ...n,
        data: {
          ...n.data,
          onToggle,
          onCopy,
          onPreview,
          active: n.id === activeMatchId,
          highlight: Boolean((n.data as any).highlight || isQueryHit),
        },
      };
    });
  }, [nodes, onToggle, onCopy, onPreview, activeMatchId, matches, query]);

  React.useEffect(() => {
    const t = setTimeout(() => {
      try {
        rf.fitView({ padding: 0.16 });
      } catch {}
    }, 0);
    return () => clearTimeout(t);
  }, [nodes.length, edges.length, rf]);

  const expandAllSafe = React.useCallback(
    () => setCollapsed(new Set()),
    [setCollapsed]
  );
  const collapseAll = React.useCallback(
    () => setCollapsed(new Set([""])),
    [setCollapsed]
  );

  const [zoom, setZoomState] = React.useState(1);
  const setZoom = React.useCallback(
    (z: number) => {
      const clamped = Math.max(0.05, Math.min(12, z));
      setZoomState(clamped);
      try {
        const vp = rf.getViewport();
        rf.setViewport({ x: vp.x, y: vp.y, zoom: clamped }, { duration: 120 });
      } catch {}
    },
    [rf]
  );
  const onZoomIn = React.useCallback(
    () => setZoom(zoom * 1.2),
    [zoom, setZoom]
  );
  const onZoomOut = React.useCallback(
    () => setZoom(zoom / 1.2),
    [zoom, setZoom]
  );
  const onZoomReset = React.useCallback(() => setZoom(1), [setZoom]);

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      if ((e.ctrlKey || e.metaKey) && k === "f") {
        e.preventDefault();
        (Toolbar as any)?._focusSearch?.();
        return;
      }
      if (k === "f" && !e.ctrlKey && !e.metaKey) {
        onZoomReset();
        rf.fitView({ padding: 0.16 });
      }
      if (k === "e") expandAllSafe();
      if (k === "c" && !e.ctrlKey && !e.metaKey) collapseAll();
      if (k === "j") copyText(json);
      if (e.key === "+" || e.key === "=") {
        e.preventDefault();
        onZoomIn();
      }
      if (e.key === "-" || e.key === "_") {
        e.preventDefault();
        onZoomOut();
      }
      if (e.key === "Enter") {
        e.preventDefault();
        if (e.shiftKey) onPrev();
        else onNext();
      }
      if (e.key === "Escape") {
        if (preview.open) setPreview((p) => ({ ...p, open: false }));
        else setQuery("");
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [
    rf,
    expandAllSafe,
    collapseAll,
    onZoomIn,
    onZoomOut,
    onZoomReset,
    json,
    onNext,
    onPrev,
    preview.open,
  ]);

  return (
    <>
      {/* Edge/label dark styling bound to theme tokens */}
      <style jsx global>{`
        .react-flow__edge-path,
        .react-flow__connection-path {
          stroke: ${TOKENS.edgeDim} !important;
        }
        .react-flow__arrowhead path {
          fill: ${TOKENS.edge} !important;
        }
        .react-flow__edge-text {
          fill: ${TOKENS.text} !important;
        }
      `}</style>

      <Toolbar
        query={query}
        setQuery={setQuery}
        onFit={() => rf.fitView({ padding: 0.16 })}
        onExpandAll={expandAllSafe}
        onCollapseAll={collapseAll}
        onCopyAll={() => copyText(json)}
        onZoomIn={onZoomIn}
        onZoomOut={onZoomOut}
        onZoomReset={onZoomReset}
        zoom={zoom}
        setZoom={setZoom}
        onPrev={onPrev}
        onNext={onNext}
        matchIndex={Math.max(0, activeIndex)}
        matchTotal={matches.length}
        hint={hint}
      />

      <ReactFlow
        nodes={nodesWithHandlers}
        edges={edges}
        nodeTypes={nodeTypes}
        fitView
        className="w-full h-full"
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable
        panOnScroll
        panOnDrag
        zoomOnScroll
        zoomOnPinch
        zoomOnDoubleClick
        minZoom={0.05}
        maxZoom={12}
        defaultEdgeOptions={DEFAULT_EDGE_OPTIONS}
      >
        <Background gap={18} size={1} color={TOKENS.grid} />
        <MiniMap
          pannable
          zoomable
          nodeColor={(n) =>
            (TYPE_COLORS as any)[((n.data as any)?.kind as Kind) ?? "unknown"]
              ?.stroke ?? hslv("--muted-foreground")
          }
          nodeStrokeColor={() => TOKENS.edge}
          maskColor={TOKENS.minimapMask}
          style={{
            background: TOKENS.card,
            border: `1px solid ${TOKENS.border}`,
            borderRadius: 8,
          }}
        />
        <Controls showInteractive position="bottom-right" />
      </ReactFlow>

      <PreviewDialog
        open={preview.open}
        title={preview.title}
        text={preview.text}
        onCopy={() => copyText(preview.text)}
        onClose={() => setPreview((p) => ({ ...p, open: false }))}
      />
    </>
  );
}
