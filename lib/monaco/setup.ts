// lib/monaco/setup.ts

import type { Monaco as MonacoNS } from "@monaco-editor/react";

/** Register ESM workers (and CDN fallback) exactly once. */
let _workersReady = false;
export function ensureMonacoWorkers(): void {
  if (_workersReady) return;
  if (typeof globalThis === "undefined" || typeof Worker === "undefined")
    return;

  if (!(globalThis as any).MonacoEnvironment?.getWorker) {
    (globalThis as any).MonacoEnvironment = {
      getWorker(_workerId: string, label: string): Worker {
        const url = (p: string) => new URL(p, import.meta.url);
        try {
          switch (label) {
            case "json":
              return new Worker(
                url("monaco-editor/esm/vs/language/json/json.worker.js"),
                { type: "module" }
              );
            case "css":
            case "scss":
            case "less":
              return new Worker(
                url("monaco-editor/esm/vs/language/css/css.worker.js"),
                { type: "module" }
              );
            case "html":
            case "handlebars":
            case "razor":
            case "xml":
              return new Worker(
                url("monaco-editor/esm/vs/language/html/html.worker.js"),
                { type: "module" }
              );
            case "typescript":
            case "javascript":
              return new Worker(
                url("monaco-editor/esm/vs/language/typescript/ts.worker.js"),
                { type: "module" }
              );
            default:
              return new Worker(
                url("monaco-editor/esm/vs/editor/editor.worker.js"),
                { type: "module" }
              );
          }
        } catch {
          const cdn = (p: string) =>
            `https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.44.0/min/${p}`;
          const src =
            label === "json"
              ? cdn("vs/language/json/json.worker.min.js")
              : label === "css" || label === "scss" || label === "less"
                ? cdn("vs/language/css/css.worker.min.js")
                : label === "html" ||
                    label === "handlebars" ||
                    label === "razor" ||
                    label === "xml"
                  ? cdn("vs/language/html/html.worker.min.js")
                  : label === "typescript" || label === "javascript"
                    ? cdn("vs/language/typescript/ts.worker.min.js")
                    : cdn("vs/editor/editor.worker.min.js");
          return new Worker(src);
        }
      },
    };
  }

  _workersReady = true;
}

/** HSL -> HEX (for Tailwind CSS variables). */
function hslToHex(h: number, s: number, l: number): string {
  l /= 100;
  s /= 100;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    const c = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * c)
      .toString(16)
      .padStart(2, "0");
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

/** Read a CSS var (HSL or raw) and convert to HEX; falls back safely. */
export function getCSSColor(property: string, fallback = "#1E1E1E"): string {
  try {
    const value = getComputedStyle(document.documentElement)
      .getPropertyValue(property)
      .trim();
    if (!value) return fallback;
    if (value.startsWith("hsl(")) {
      const m = value.match(/hsl\(\s*(\d+)\s+(\d+)%\s+(\d+)%\s*\)/);
      if (m) return hslToHex(+m[1], +m[2], +m[3]);
    }
    const raw = value.match(/(\d+)\s+(\d+)%\s+(\d+)%/);
    if (raw) return hslToHex(+raw[1], +raw[2], +raw[3]);
    return value; // assume valid hex or rgb(a)
  } catch {
    return fallback;
  }
}

/** Define a Monaco theme aligned to Tailwind palette. */
export function defineTailwindDark(monaco: MonacoNS) {
  const background = getCSSColor("--background");
  const foreground = getCSSColor("--foreground");
  const border = getCSSColor("--border", "#2D333A");
  const primary = getCSSColor("--primary", "#4A90E2");
  const muted = getCSSColor("--muted", "#1E232A");
  const mutedFg = getCSSColor("--muted-foreground", "#9B9B9B");
  const warn = getCSSColor("--warning", "#F59E0B");
  const ok = getCSSColor("--success", "#10B981");
  const danger = getCSSColor("--destructive", "#E85D75");

  monaco.editor.defineTheme("tailwind-dark", {
    base: "vs-dark",
    inherit: true,
    rules: [
      { token: "comment", foreground: mutedFg.slice(1), fontStyle: "italic" },
      { token: "keyword", foreground: primary.slice(1) },
      { token: "string", foreground: ok.slice(1) },
      { token: "number", foreground: warn.slice(1) },
      { token: "regexp", foreground: danger.slice(1) },
      { token: "operator", foreground: foreground.slice(1) },
      { token: "type", foreground: primary.slice(1) },
      { token: "class", foreground: primary.slice(1) },
      { token: "function", foreground: warn.slice(1) },
      { token: "variable", foreground: foreground.slice(1) },
      { token: "property", foreground: foreground.slice(1) },
    ],
    colors: {
      "editor.background": background,
      "editor.foreground": foreground,
      "editorLineNumber.foreground": mutedFg,
      "editorLineNumber.activeForeground": foreground,
      "editor.selectionBackground": primary + "40",
      "editor.selectionHighlightBackground": primary + "20",
      "editor.wordHighlightBackground": border + "80",
      "editor.wordHighlightStrongBackground": primary + "30",
      "editorCursor.foreground": primary,
      "editor.findMatchBackground": border,
      "editor.findMatchHighlightBackground": warn + "40",
      "editor.findRangeHighlightBackground": muted,
      "editorHoverWidget.background": muted,
      "editorHoverWidget.border": border,
      "editorSuggestWidget.background": muted,
      "editorSuggestWidget.border": border,
      "editorSuggestWidget.selectedBackground": primary + "40",
      "scrollbarSlider.background": border + "66",
      "scrollbarSlider.hoverBackground": border + "B3",
      "scrollbarSlider.activeBackground": primary + "66",
    },
  });
}

/** Best-effort language guess (cosmetic only). */
export function detectLanguage(
  body: string,
  contentType?: string
): import("@monaco-editor/react").EditorProps["language"] {
  const ct = (contentType || "").toLowerCase();
  if (ct.includes("json")) return "json";
  if (ct.includes("html")) return "html";
  if (ct.includes("xml")) return "xml";
  const s = body.trim();
  if (!s) return "plaintext";
  if (s.startsWith("{") || s.startsWith("[")) {
    try {
      JSON.parse(s);
      return "json";
    } catch {
      /* ignore */
    }
  }
  if (s.startsWith("<"))
    return /<!doctype html|<html/i.test(s) ? "html" : "xml";
  return "plaintext";
}

/** Quick JSON check (content-type + parse). */
export function looksLikeJson(body: string, contentType?: string): boolean {
  const ct = (contentType || "").toLowerCase();
  if (ct.includes("json")) return true;
  const s = (body || "").trim();
  if (!s || !(s.startsWith("{") || s.startsWith("["))) return false;
  try {
    JSON.parse(s);
    return true;
  } catch {
    return false;
  }
}
