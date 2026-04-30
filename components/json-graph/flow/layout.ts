import { MarkerType, type Node } from "reactflow";
import { TOKENS } from "../constants";
import type { Built, JsonNodeData } from "../types";

/**
 * Applies a layered RIGHT layout using ELK. Falls back to a simple grid if ELK is unavailable.
 * Returns a new Built with positions and styled edges.
 */
export async function layoutWithElk(built: Built): Promise<Built> {
  try {
    const { default: ELK } = await import("elkjs/lib/elk.bundled.js");
    const elk = new ELK();

    const graph = {
      id: "root",
      layoutOptions: {
        "elk.algorithm": "layered",
        "elk.direction": "RIGHT",
        "elk.padding": "96",
        "elk.spacing.nodeNode": "132",
        "elk.layered.spacing.nodeNodeBetweenLayers": "200",
        "elk.spacing.edgeNode": "72",
        "elk.spacing.edgeEdge": "72",
        "elk.layered.considerModelOrder": "true",
        "elk.layered.nodePlacement.strategy": "BRANDES_KOEPF",
        "elk.layered.thoroughness": "2",
        "elk.edgeRouting": "ORTHOGONAL",
      },
      children: built.nodes.map((n) => ({
        id: n.id,
        width: built.sizes[n.id]?.w ?? 560,
        height: built.sizes[n.id]?.h ?? 160,
      })),
      edges: built.edges.map((e) => ({
        id: e.id,
        sources: [e.source],
        targets: [e.target],
      })),
    } as any;

    const res = await elk.layout(graph);
    const posById = new Map<string, { x: number; y: number }>();
    for (const c of res.children ?? [])
      posById.set(c.id, { x: Math.round(c.x ?? 0), y: Math.round(c.y ?? 0) });

    return {
      ...built,
      nodes: built.nodes.map((n) => ({
        ...n,
        position: posById.get(n.id) ?? { x: 0, y: 0 },
      })),
      edges: built.edges.map((e) => ({
        ...e,
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
        labelBgPadding: [4, 6],
        labelBgBorderRadius: 6,
        labelBgStyle: { fill: TOKENS.labelBg, stroke: TOKENS.labelBgStroke },
      })),
    };
  } catch {
    // Minimal grid fallback
    const byDepth = new Map<number, (typeof built.nodes)[number][]>();
    built.nodes.forEach((n) => {
      const depth = (n.data as JsonNodeData).pathParts.length || 0;
      const arr = byDepth.get(depth) ?? [];
      arr.push(n);
      byDepth.set(depth, arr);
    });
    const placed: typeof built.nodes = [];
    const X = 680,
      Y = 260;
    for (const [depth, arr] of [...byDepth.entries()].sort(
      (a, b) => a[0] - b[0]
    )) {
      arr.forEach((n, i) =>
        placed.push({ ...n, position: { x: depth * X, y: i * Y } })
      );
    }
    return {
      ...built,
      nodes: placed,
      edges: built.edges.map((e) => ({
        ...e,
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
        labelBgPadding: [4, 6],
        labelBgBorderRadius: 6,
        labelBgStyle: { fill: TOKENS.labelBg, stroke: TOKENS.labelBgStroke },
      })),
    };
  }
}
