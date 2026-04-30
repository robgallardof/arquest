import { MarkerType, Position, type Edge, type Node } from "reactflow";
import { TOKENS } from "../constants";
import {
  jsonPathBracket,
  kindOf,
  makeIdFactory,
  pathKey,
  previewOf,
  sanitizeEdgeId,
} from "../json-utils";
import type { BuildOpts, Built, JsonNodeData, Kind } from "../types";

/**
 * Estimates node size for layout heuristics.
 * @param linesCount How many text lines are displayed inside the node
 */
const estimateSize = (linesCount: number): { w: number; h: number } => {
  const W = 560;
  const base = 124;
  const per = 20;
  return { w: W, h: base + Math.max(0, linesCount) * per };
};

/**
 * Builds a conceptual graph (nodes/edges) from raw JSON text and collapse info.
 * It does not assign X/Y positions — layout is handled separately.
 */
export function buildConceptual(
  jsonText: string,
  collapsed: Set<string>,
  opts: BuildOpts
): Built {
  let root: unknown;
  try {
    root = JSON.parse(jsonText || "null");
  } catch {
    const n: Node<JsonNodeData> = {
      id: "invalid_json",
      type: "json",
      position: { x: 0, y: 0 },
      data: {
        keyLabel: "Invalid JSON",
        kind: "unknown",
        pathParts: [],
        pathId: "invalid_json",
        lines: ["Not valid JSON"],
      },
    };
    return {
      nodes: [n],
      edges: [],
      sizes: { invalid_json: { w: 360, h: 120 } },
    };
  }

  const nodes: Node<JsonNodeData>[] = [];
  const edges: Edge[] = [];
  const sizes: Record<string, { w: number; h: number }> = {};
  const makeId = makeIdFactory();

  let budget = opts.maxNodes;
  const hasQuery = !!opts.query;
  const matches = (s: string) =>
    opts.query ? s.toLowerCase().includes(opts.query) : false;

  const pushNode = (n: Node<JsonNodeData>) => {
    nodes.push(n);
    sizes[n.id] = estimateSize(n.data.lines?.length ?? 0);
  };

  const pushEdge = (source: string, target: string, label?: string) => {
    edges.push({ id: sanitizeEdgeId(source, target), source, target, label });
  };

  function addObjectNode(
    obj: Record<string, any>,
    path: string[],
    keyLabel: string,
    depth: number
  ): string | null {
    if (budget-- <= 0) return null;

    const id = makeId(path);
    const pkey = pathKey(path);
    const entries = Object.entries(obj);

    const primitives: string[] = [];
    const containerEntries: [string, any][] = [];

    for (const [k, v] of entries) {
      const t = kindOf(v);
      if (t === "object" || t === "array") containerEntries.push([k, v]);
      else primitives.push(`${k}: ${previewOf(v)}`);
    }

    const defaultCollapsed = hasQuery
      ? false
      : depth >= opts.initialCollapseDepth ||
        containerEntries.length > opts.collapseChildCountOver;

    const isHit =
      matches(keyLabel) ||
      primitives.some((l) => matches(l)) ||
      containerEntries.some(([k]) => matches(k));

    const collapsedHere = (collapsed.has(pkey) || defaultCollapsed) && !isHit;

    const node: Node<JsonNodeData> = {
      id,
      type: "json",
      position: { x: 0, y: 0 },
      sourcePosition: Position.Right,
      targetPosition: Position.Left,
      data: {
        keyLabel: keyLabel || "root",
        kind: "object",
        count: entries.length,
        titleRight: `${entries.length} ${entries.length === 1 ? "key" : "keys"}`,
        pathParts: path,
        pathId: pkey,
        collapsed: collapsedHere,
        highlight: isHit,
        lines: primitives,
      },
    };
    pushNode(node);
    if (collapsedHere) return id;

    for (const [k, v] of containerEntries) {
      const childPath = [...path, k];
      const childId =
        kindOf(v) === "object"
          ? addObjectNode(v as Record<string, any>, childPath, k, depth + 1)
          : addArrayNode(v as any[], childPath, k, depth + 1);
      if (childId) pushEdge(id, childId, k);
    }
    return id;
  }

  function addArrayNode(
    arr: any[],
    path: string[],
    keyLabel: string,
    depth: number
  ): string | null {
    if (budget-- <= 0) return null;

    const id = makeId(path);
    const pkey = pathKey(path);
    const n = arr.length;

    const counts: Record<Kind, number> = {
      object: 0,
      array: 0,
      string: 0,
      number: 0,
      boolean: 0,
      null: 0,
      unknown: 0,
    };
    const primSamples: Record<Exclude<Kind, "object" | "array">, string[]> = {
      string: [],
      number: [],
      boolean: [],
      null: [],
      unknown: [],
    } as any;

    let hasObj = false,
      hasArr = false;
    for (let i = 0; i < n; i++) {
      const v = arr[i];
      const t = kindOf(v);
      counts[t] = (counts[t] ?? 0) + 1;
      if (t === "object") hasObj = true;
      else if (t === "array") hasArr = true;
      else if (primSamples[t as keyof typeof primSamples]?.length < 30)
        primSamples[t as keyof typeof primSamples].push(previewOf(v));
      if (i > 1000 && hasObj && hasArr) break;
    }

    const typeParts = Object.entries(counts)
      .filter(([, v]) => v > 0)
      .map(([k, v]) => `${k}:${v}`);

    const lines: string[] = [];
    if (typeParts.length) lines.push(`types · ${typeParts.join(" · ")}`);
    (["string", "number", "boolean", "null", "unknown"] as const).forEach(
      (t) => {
        const s = primSamples[t];
        if (s?.length) lines.push(`${t}: ${s.join(", ")}`);
      }
    );

    const isHit = matches(keyLabel) || lines.some((l) => matches(l));
    const defaultCollapsed = hasQuery
      ? false
      : depth >= opts.initialCollapseDepth || n > opts.collapseChildCountOver;
    const collapsedHere = (collapsed.has(pkey) || defaultCollapsed) && !isHit;

    const node: Node<JsonNodeData> = {
      id,
      type: "json",
      position: { x: 0, y: 0 },
      sourcePosition: Position.Right,
      targetPosition: Position.Left,
      data: {
        keyLabel,
        kind: "array",
        count: n,
        titleRight: `${n} ${n === 1 ? "item" : "items"}`,
        pathParts: path,
        pathId: pkey,
        collapsed: collapsedHere,
        highlight: isHit,
        lines,
      },
    };
    pushNode(node);
    if (collapsedHere) return id;

    const hasObjItem = counts.object > 0;
    const hasArrItem = counts.array > 0;

    if (hasObjItem) {
      const aggPath = [...path, "*:object"];
      const childId = addAggregatedObjectFromArray(
        arr,
        aggPath,
        "items (object)",
        depth + 1
      );
      if (childId) pushEdge(id, childId, "items (object)");
    }
    if (hasArrItem) {
      const aggPath = [...path, "*:array"];
      const childId = addAggregatedArrayRecursive(
        arr,
        aggPath,
        "items (array)",
        depth + 1
      );
      if (childId) pushEdge(id, childId, "items (array)");
    }

    return id;
  }

  function addAggregatedObjectFromArray(
    arr: any[],
    path: string[],
    keyLabel: string,
    depth: number
  ): string | null {
    const objs = arr.filter((x) => kindOf(x) === "object") as Record<
      string,
      any
    >[];
    if (!objs.length) return null;
    if (budget-- <= 0) return null;

    const union = new Set<string>();
    const LIMIT = Math.min(objs.length, 1500);
    for (let i = 0; i < LIMIT; i++)
      Object.keys(objs[i]).forEach((k) => union.add(k));
    const unionKeys = Array.from(union).sort();

    const id = makeId(path);
    const pkey = pathKey(path);

    const primitiveLines: string[] = [];
    const SAMPLE = Math.min(objs.length, 100);
    for (const k of unionKeys) {
      let sample: any = undefined;
      for (let i = 0; i < SAMPLE; i++) {
        const val = objs[i]?.[k];
        const tk = kindOf(val);
        if (tk !== "object" && tk !== "array" && tk !== "unknown") {
          sample = val;
          break;
        }
      }
      if (sample !== undefined)
        primitiveLines.push(`${k}: ${previewOf(sample)}`);
    }
    primitiveLines.unshift(`from: ${jsonPathBracket(path.slice(0, -1))}[*]`);

    const isHit =
      matches(keyLabel) ||
      unionKeys.some((k) => matches(k)) ||
      primitiveLines.some((l) => matches(l));

    const node: Node<JsonNodeData> = {
      id,
      type: "json",
      position: { x: 0, y: 0 },
      sourcePosition: Position.Right,
      targetPosition: Position.Left,
      data: {
        keyLabel,
        kind: "object",
        count: unionKeys.length,
        titleRight: `${unionKeys.length} union keys`,
        pathParts: path,
        pathId: pkey,
        collapsed: hasQuery
          ? false
          : depth >= opts.initialCollapseDepth && !isHit,
        highlight: isHit,
        lines: primitiveLines,
      },
    };
    pushNode(node);

    for (const k of unionKeys) {
      const vals = objs.map((o) => o?.[k]).filter((v) => v !== undefined);
      const hasObjChild = vals.some((v) => kindOf(v) === "object");
      const hasArrChild = vals.some((v) => kindOf(v) === "array");

      if (hasArrChild) {
        const collected: any[] = vals.flatMap((v) =>
          Array.isArray(v) ? v : []
        );
        const childPath = [...path, k, "*:array"];
        const arrId = addAggregatedArrayRecursive(
          collected,
          childPath,
          `${k} (array)`,
          depth + 1
        );
        if (arrId) pushEdge(id, arrId, k);
      }
      if (hasObjChild) {
        const collectedObjs: any[] = vals.filter(
          (v) => v && !Array.isArray(v) && typeof v === "object"
        );
        const childPath = [...path, k, "*:object"];
        const objId = addAggregatedObjectFromArray(
          collectedObjs,
          childPath,
          `${k} (object)`,
          depth + 1
        );
        if (objId) pushEdge(id, objId, k);
      }
    }

    return id;
  }

  function addAggregatedArrayRecursive(
    arr: any[],
    path: string[],
    keyLabel: string,
    depth: number
  ): string | null {
    const nestedArrays = arr.filter((x) => Array.isArray(x)) as any[][];
    if (!nestedArrays.length) return null;
    if (budget-- <= 0) return null;

    const flat = nestedArrays.flat();

    const counts: Record<Kind, number> = {
      object: 0,
      array: 0,
      string: 0,
      number: 0,
      boolean: 0,
      null: 0,
      unknown: 0,
    };
    for (let i = 0; i < Math.min(flat.length, 1500); i++)
      counts[kindOf(flat[i])]++;

    const typeParts = Object.entries(counts)
      .filter(([, v]) => v > 0)
      .map(([k, v]) => `${k}:${v}`);
    const lines = [
      `${flat.length} ${flat.length === 1 ? "item" : "items"}`,
      ...(typeParts.length ? [`types · ${typeParts.join(" · ")}`] : []),
      `from: ${jsonPathBracket(path.slice(0, -1))}[*]`,
    ];

    const id = makeId(path);
    const pkey = pathKey(path);
    const isHit = matches(keyLabel) || lines.some((l) => matches(l));

    const node: Node<JsonNodeData> = {
      id,
      type: "json",
      position: { x: 0, y: 0 },
      sourcePosition: Position.Right,
      targetPosition: Position.Left,
      data: {
        keyLabel,
        kind: "array",
        count: flat.length,
        titleRight: `${flat.length} items`,
        pathParts: path,
        pathId: pkey,
        collapsed: hasQuery
          ? false
          : depth >= opts.initialCollapseDepth && !isHit,
        highlight: isHit,
        lines,
      },
    };
    pushNode(node);

    if (counts["array"] > 0) {
      const nextPath = [...path, "*:array"];
      const childId = addAggregatedArrayRecursive(
        flat,
        nextPath,
        "items (array)",
        depth + 1
      );
      if (childId) pushEdge(id, childId, "items (array)");
    }
    if (counts["object"] > 0) {
      const objPath = [...path, "*:object"];
      const objId = addAggregatedObjectFromArray(
        flat,
        objPath,
        "items (object)",
        depth + 1
      );
      if (objId) pushEdge(id, objId, "items (object)");
    }
    return id;
  }

  const rk = kindOf(root);
  if (rk === "object") addObjectNode(root as Record<string, any>, [], "", 0);
  else if (rk === "array") addArrayNode(root as any[], [], "", 0);
  else addObjectNode({ value: root }, [], "", 0);

  return { nodes, edges, sizes };
}
