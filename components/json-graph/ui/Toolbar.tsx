"use client";
import * as React from "react";
import { TOKENS, hslv } from "../constants";

/**
 * Floating toolbar providing search (prev/next), expand/collapse,
 * fit/zoom controls, and copy-full-JSON helper.
 */
export function Toolbar(props: {
  query: string;
  setQuery: (v: string) => void;
  onFit: () => void;
  onExpandAll: () => void;
  onCollapseAll: () => void;
  onCopyAll: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onZoomReset: () => void;
  zoom: number;
  setZoom: (z: number) => void;
  onPrev: () => void;
  onNext: () => void;
  matchIndex: number;
  matchTotal: number;
  hint?: string;
}) {
  const {
    query,
    setQuery,
    onFit,
    onExpandAll,
    onCollapseAll,
    onCopyAll,
    onZoomIn,
    onZoomOut,
    onZoomReset,
    zoom,
    setZoom,
    onPrev,
    onNext,
    matchIndex,
    matchTotal,
    hint,
  } = props;

  const inputRef = React.useRef<HTMLInputElement>(null);
  (Toolbar as any)._focusSearch = () => inputRef.current?.focus();

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      if (e.shiftKey) onPrev();
      else onNext();
    }
    if (e.key === "Escape") setQuery("");
  };

  return (
    <div
      style={{
        position: "absolute",
        top: 8,
        left: 8,
        zIndex: 10,
        display: "flex",
        gap: 8,
        alignItems: "center",
        flexWrap: "wrap",
        background: hslv("--popover", 0.72),
        border: `1px solid ${hslv("--border", 0.6)}`,
        backdropFilter: "blur(8px)",
        padding: 10,
        borderRadius: 12,
        maxWidth: "calc(100% - 16px)",
      }}
    >
      <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder="Search keys/values…  (Ctrl/Cmd+F, Enter/Shift+Enter)"
          style={{
            height: 32,
            minWidth: 220,
            width: "clamp(220px, 38vw, 520px)",
            background: hslv("--popover", 0.9),
            color: TOKENS.text,
            border: `1px solid ${hslv("--border", 0.7)}`,
            borderRadius: 8,
            padding: "0 10px",
            fontSize: 12,
          }}
        />
        <button onClick={onPrev} title="Prev (Shift+Enter)" style={btn}>
          Prev
        </button>
        <button onClick={onNext} title="Next (Enter)" style={btn}>
          Next
        </button>
        <span style={{ fontSize: 11, color: TOKENS.textMuted }}>
          {matchTotal ? `${matchIndex + 1} / ${matchTotal}` : "0 / 0"}
        </span>
        {query && (
          <button onClick={() => setQuery("")} title="Clear (Esc)" style={btn}>
            Clear
          </button>
        )}
      </div>

      <button onClick={onFit} title="Fit (F)" style={btn}>
        Fit
      </button>
      <button onClick={onExpandAll} title="Expand (E)" style={btn}>
        Expand
      </button>
      <button onClick={onCollapseAll} title="Collapse (C)" style={btn}>
        Collapse
      </button>
      <button onClick={onCopyAll} title="Copy full JSON (J)" style={btn}>
        Copy JSON
      </button>

      <div
        style={{ display: "flex", alignItems: "center", gap: 8, marginLeft: 6 }}
      >
        <button onClick={onZoomOut} title="Zoom out (-)" style={btn}>
          −
        </button>
        <button onClick={onZoomReset} title="Reset zoom" style={btn}>
          1:1
        </button>
        <button onClick={onZoomIn} title="Zoom in (+)" style={btn}>
          +
        </button>
        <input
          type="range"
          min={0.05}
          max={12}
          step={0.01}
          value={zoom}
          onChange={(e) => setZoom(parseFloat(e.target.value))}
          title="Zoom slider"
          style={{ width: 150 }}
        />
        <span
          style={{
            fontSize: 11,
            color: TOKENS.textMuted,
            minWidth: 48,
            textAlign: "right",
          }}
        >
          {zoom.toFixed(2)}x
        </span>
      </div>

      {hint && (
        <span style={{ fontSize: 11, color: TOKENS.textMuted }}>{hint}</span>
      )}
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
