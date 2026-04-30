"use client";
import * as React from "react";
import { TOKENS, hslv } from "../constants";

/**
 * Lightweight modal to preview/copy a JSON subtree.
 */
export function PreviewDialog({
  open,
  title,
  text,
  onCopy,
  onClose,
}: {
  open: boolean;
  title: string;
  text: string;
  onCopy: () => void;
  onClose: () => void;
}) {
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!open) return;
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="JSON preview"
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 50,
        background: hslv("--popover", 0.72),
        display: "grid",
        placeItems: "center",
        padding: 16,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "min(960px, 92vw)",
          maxHeight: "86vh",
          background: TOKENS.card,
          border: `1px solid ${TOKENS.border}`,
          borderRadius: 12,
          boxShadow: "0 10px 40px rgba(0,0,0,.5)",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <div
          style={{
            padding: "10px 12px",
            borderBottom: `1px solid ${hslv("--border", 0.6)}`,
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <strong
            style={{
              color: TOKENS.text,
              fontSize: 12,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
              flex: 1,
            }}
          >
            {title || "Preview"}
          </strong>
          <button onClick={onCopy} title="Copy to clipboard" style={btn}>
            Copy
          </button>
          <button onClick={onClose} title="Close" style={btn}>
            Close
          </button>
        </div>
        <div style={{ padding: 12 }}>
          <pre
            style={{
              margin: 0,
              color: TOKENS.text,
              fontSize: 12,
              lineHeight: 1.4,
              fontFamily:
                'ui-monospace, SFMono-Regular, Menlo, Monaco, "Liberation Mono", "Courier New", monospace',
              background: hslv("--popover", 0.85),
              border: `1px solid ${hslv("--border", 0.45)}`,
              borderRadius: 8,
              padding: 12,
              overflow: "auto",
              maxHeight: "70vh",
              whiteSpace: "pre-wrap",
              wordBreak: "break-word",
            }}
          >
            {text}
          </pre>
        </div>
      </div>
    </div>
  );
}

const btn: React.CSSProperties = {
  height: 30,
  padding: "0 12px",
  borderRadius: 8,
  background: hslv("--foreground", 0.06),
  border: `1px solid ${hslv("--border", 0.6)}`,
  color: TOKENS.text,
  fontSize: 12,
  cursor: "pointer",
  whiteSpace: "nowrap",
};
