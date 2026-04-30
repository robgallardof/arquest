"use client";
import * as React from "react";
import { ReactFlowProvider } from "reactflow";
import { TOKENS } from "./constants";
import { FlowCanvas } from "./FlowCanvas";

/**
 * JsonGraphFlow (Tailwind-themed)
 * A responsive JSON graph viewer (React Flow + ELK) fully themed via Tailwind tokens.
 */
export function JsonGraphFlow({
  data,
  className,
  maxNodes = 3000,
  initialCollapseDepth = 3,
  collapseChildCountOver = 500,
  height,
}: {
  /** Raw JSON (object or string). */
  data: string | object;
  /** Optional wrapper className. */
  className?: string;
  /** Safety limit for node creation. */
  maxNodes?: number;
  /** Initial collapse depth for containers. */
  initialCollapseDepth?: number;
  /** Collapse threshold by number of items/keys. */
  collapseChildCountOver?: number;
  /** Fixed or CSS height; defaults to fill. */
  height?: number | string;
}) {
  const jsonText = React.useMemo(
    () => (typeof data === "string" ? data : JSON.stringify(data ?? null)),
    [data]
  );

  const [collapsed, setCollapsed] = React.useState<Set<string>>(new Set());

  return (
    <div
      className={className}
      style={{
        width: "100%",
        height: height ? (typeof height === "number" ? `${height}px` : height) : "100%",
        minHeight: 380,
        position: "relative",
        background: TOKENS.bg,
      }}
    >
      <ReactFlowProvider>
        <FlowCanvas
          json={jsonText}
          collapsed={collapsed}
          setCollapsed={setCollapsed}
          initialCollapseDepth={initialCollapseDepth}
          collapseChildCountOver={collapseChildCountOver}
          maxNodes={maxNodes}
        />
      </ReactFlowProvider>
    </div>
  );
}
