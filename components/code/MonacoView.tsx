"use client";

import * as React from "react";
import dynamic from "next/dynamic";
import type { EditorProps, Monaco as MonacoNS } from "@monaco-editor/react";
import { ensureMonacoWorkers, defineTailwindDark } from "@/lib/monaco/setup";

/**
 * Lightweight Monaco wrapper with shared theme + workers.
 * - SSR disabled
 * - Optional GraphQL language enablement
 * - Custom fallback (e.g., editable textarea) while Monaco isn't ready
 */
const Editor = dynamic<EditorProps>(
  async () => (await import("@monaco-editor/react")).default,
  {
    ssr: false,
    loading: () => (
      <div className="h-full border rounded-md bg-background flex items-center justify-center text-sm text-muted-foreground">
        Loading editor…
      </div>
    ),
  }
);

export type MonacoViewProps = {
  /** Editor language (json, xml, plaintext, graphql…) */
  language?: EditorProps["language"];
  /** Editor value */
  value?: string;
  /** onChange handler (undefined-safe) */
  onChange?: (value: string | undefined) => void;
  /** Readonly mode */
  readOnly?: boolean;
  /** Height CSS (default 100%) */
  height?: string | number;
  /** Extra Monaco options (merged) */
  options?: EditorProps["options"];
  /** Enable GraphQL language/worker (lazy import) */
  enableGraphQL?: boolean;
  /** Fallback content while Monaco not ready or errored */
  fallback?: React.ReactNode;
  /** className passthrough */
  className?: string;
};

export function MonacoView({
  language = "plaintext",
  value,
  onChange,
  readOnly = false,
  height = "100%",
  options,
  enableGraphQL = false,
  fallback,
  className,
}: MonacoViewProps) {
  const [ready, setReady] = React.useState(false);
  const [errored, setErrored] = React.useState<string | null>(null);

  React.useEffect(() => {
    try {
      ensureMonacoWorkers();
      setErrored(null);
      setReady(true);
    } catch {
      setErrored("Failed to initialize workers");
      setReady(false);
    }
  }, []);

  // NOTE: monaco-graphql is temporarily disabled because Next.js + webpack
  // in this project fails parsing a transitive monaco-editor module in dev.
  // Keep prop for API compatibility; no-op until dependency/tooling is updated.
  React.useEffect(() => {
    if (!enableGraphQL) return;
  }, [enableGraphQL]);

  const beforeMount = React.useCallback((monaco: MonacoNS) => {
    try {
      defineTailwindDark(monaco);
      setErrored(null);
    } catch {
      setErrored("Theme setup failed");
    }
  }, []);

  if (!ready && fallback) {
    // Render caller-provided fallback while editor isn't ready
    return <div className={className} style={{ height }}>{fallback}</div>;
  }

  return (
    <div className={className} style={{ height }}>
      <Editor
        height="100%"
        theme="tailwind-dark"
        language={language}
        value={value}
        onChange={onChange}
        beforeMount={beforeMount}
        options={{
          readOnly,
          wordWrap: "on",
          minimap: { enabled: false },
          scrollBeyondLastLine: false,
          fontSize: 12,
          automaticLayout: true,
          renderWhitespace: readOnly ? "none" : "selection",
          smoothScrolling: true,
          ...(options ?? {}),
        }}
        onMount={() => setErrored(null)}
      />
      {/* Silent error area for screen readers */}
      <div className="sr-only" aria-live="polite">{errored ?? ""}</div>
    </div>
  );
}
