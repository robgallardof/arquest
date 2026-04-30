import type { Edge, Node, Position } from "reactflow";

/** Runtime kind for any JSON value. */
export type Kind =
  | "object"
  | "array"
  | "string"
  | "number"
  | "boolean"
  | "null"
  | "unknown";

/** Node payload for JSON cards rendered in React Flow. */
export type JsonNodeData = {
  keyLabel: string;
  kind: Kind;
  count?: number;
  pathParts: string[];
  pathId: string;
  collapsed?: boolean;
  highlight?: boolean;
  active?: boolean;
  titleRight?: string;
  lines?: string[];
  onToggle?: (pathId: string) => void;
  onCopy?: (path: string[]) => void;
  onPreview?: (path: string[]) => void;
};

/** Built graph contents. */
export type Built = {
  nodes: Node<JsonNodeData>[];
  edges: Edge[];
  sizes: Record<string, { w: number; h: number }>;
};

/** Builder options. */
export type BuildOpts = {
  initialCollapseDepth: number;
  collapseChildCountOver: number;
  maxNodes: number;
  query: string;
};
