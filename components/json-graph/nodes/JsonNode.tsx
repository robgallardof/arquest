"use client";
import * as React from "react";
import { Handle, Position, type NodeProps } from "reactflow";
import { TOKENS, TYPE_COLORS, hslv } from "../constants";
import type { JsonNodeData } from "../types";

/**
 * Small icon button used inside nodes and toolbar.
 */
const TinyBtn: React.FC<
  React.ButtonHTMLAttributes<HTMLButtonElement> & { title: string }
> = ({ title, children, ...rest }) => (
  <button
    {...rest}
    title={title}
    aria-label={title}
    style={{
      display: "grid",
      placeItems: "center",
      width: 24,
      height: 24,
      borderRadius: 8,
      border: `1px solid ${hslv("--border", 0.45)}`,
      background: hslv("--foreground", 0.06),
      color: TOKENS.text,
      cursor: "pointer",
    }}
  >
    {children}
  </button>
);

const Chevron: React.FC<{ open: boolean; color: string }> = ({
  open,
  color,
}) => (
  <svg
    width="12"
    height="12"
    viewBox="0 0 24 24"
    aria-hidden="true"
    style={{
      transform: open ? "rotate(90deg)" : "rotate(0deg)",
      transition: "transform .15s",
    }}
  >
    <path
      d="M9 6l6 6-6 6"
      fill="none"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const IconCopy = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" aria-hidden="true">
    <path d="M9 9h10v10H9z" fill="none" stroke="currentColor" strokeWidth="2" />
    <path d="M5 15V5h10" fill="none" stroke="currentColor" strokeWidth="2" />
  </svg>
);

const IconEye = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" aria-hidden="true">
    <path
      d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12z"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    />
    <circle
      cx="12"
      cy="12"
      r="3"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    />
  </svg>
);

/**
 * JSON node “card” component tuned for the Tailwind theme.
 */
export function JsonNode({ data }: NodeProps<JsonNodeData>) {
  const colors =
    TYPE_COLORS[data.kind as keyof typeof TYPE_COLORS] ?? TYPE_COLORS.unknown;
  const canToggle = data.kind === "object" || data.kind === "array";
  const open = !data.collapsed;

  const border = data.active
    ? `${colors.stroke}`
    : data.highlight
      ? `${colors.stroke}CC`
      : `${colors.stroke}88`;

  const glow = data.active
    ? `0 0 0 3px ${hslv("--ring", 0.35)}, 0 0 0 10px ${hslv("--ring", 0.12)}`
    : data.highlight
      ? `0 0 0 2px ${colors.stroke}40`
      : "none";

  return (
    <div
      title={data.pathParts.join(".")}
      style={{
        borderRadius: 16,
        border: `1px solid ${border}`,
        boxShadow: glow,
        background: TOKENS.card,
        padding: 16,
        maxWidth: 560,
      }}
    >
      <Handle
        id="in"
        type="target"
        position={Position.Left}
        style={{ opacity: 0 }}
      />
      <Handle
        id="out"
        type="source"
        position={Position.Right}
        style={{ opacity: 0 }}
      />

      <div
        style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}
      >
        {canToggle && data.onToggle && (
          <TinyBtn
            title={open ? "Collapse" : "Expand"}
            onClick={(e) => {
              e.stopPropagation();
              data.onToggle?.(data.pathId);
            }}
          >
            <Chevron open={open} color={colors.badgeText} />
          </TinyBtn>
        )}

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            minWidth: 0,
            flex: 1,
          }}
        >
          <strong
            style={{
              fontSize: 12,
              color: TOKENS.text,
              whiteSpace: "nowrap",
              textOverflow: "ellipsis",
              overflow: "hidden",
              maxWidth: 340,
            }}
          >
            {data.keyLabel || "root"}
          </strong>

          <span
            style={{
              fontSize: 10,
              padding: "3px 8px",
              borderRadius: 999,
              background: colors.badgeBg,
              color: colors.badgeText,
              border: `1px solid ${hslv("--border", 0.45)}`,
              whiteSpace: "nowrap",
            }}
          >
            {data.kind}
            {typeof data.count === "number" ? ` · ${data.count}` : ""}
          </span>

          {data.titleRight && (
            <span
              style={{
                fontSize: 10,
                color: TOKENS.textMuted,
                whiteSpace: "nowrap",
              }}
            >
              {data.titleRight}
            </span>
          )}
        </div>

        <div style={{ display: "flex", gap: 6 }}>
          <TinyBtn
            title="Preview"
            onClick={(e) => {
              e.stopPropagation();
              data.onPreview?.(data.pathParts);
            }}
          >
            <IconEye />
          </TinyBtn>
          <TinyBtn
            title="Copy"
            onClick={(e) => {
              e.stopPropagation();
              data.onCopy?.(data.pathParts);
            }}
          >
            <IconCopy />
          </TinyBtn>
        </div>
      </div>

      {!!data.lines?.length && (
        <ul
          style={{
            marginTop: 10,
            display: "grid",
            gap: 8,
            fontSize: 12,
            lineHeight: 1.35,
            fontFamily:
              'ui-monospace, SFMono-Regular, Menlo, Monaco, "Liberation Mono", "Courier New", monospace',
            color: TOKENS.text,
            wordBreak: "break-word",
          }}
        >
          {data.lines.map((ln, i) => (
            <li key={i}>{ln}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

export const nodeTypes = { json: JsonNode } as const;
