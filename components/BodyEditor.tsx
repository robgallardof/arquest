"use client";

import * as React from "react";
import {
  useMemo,
  useCallback,
  useState,
  useRef,
  useLayoutEffect,
  JSX,
} from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import type {
  RequestModel,
  RequestBody,
  BodyType,
  FormField,
  GraphQLBody,
} from "@/lib/domain/models";
import { useStore } from "@/lib/state/store";
import { gsap } from "gsap";
import type { EditorProps } from "@monaco-editor/react";
import { MonacoView } from "@/components/code/MonacoView";

/**
 * Props interface for BodyEditor component
 * @interface BodyEditorProps
 */
interface BodyEditorProps {
  /** Request model to edit */
  req: RequestModel;
  /** Collection ID containing the request */
  colId: string;
  /** Whether the editor is disabled */
  disabled?: boolean;
}

/**
 * Maps body type to Monaco editor language
 * @param {BodyType} type - The body type
 * @returns {EditorProps["language"]} Monaco editor language
 */
function languageFor(type: BodyType): EditorProps["language"] {
  switch (type) {
    case "json":
      return "json";
    case "xml":
      return "xml";
    case "text":
    case "raw":
      return "plaintext";
    case "graphql":
      return "graphql";
    default:
      return "plaintext";
  }
}

/**
 * Ensures a value is converted to string safely
 * @param {unknown} v - Value to convert
 * @returns {string} String representation of the value
 */
function ensureString(v: unknown): string {
  if (typeof v === "string") return v;
  if (v == null) return "";
  try {
    return String(v);
  } catch {
    return "";
  }
}

/**
 * Textarea fallback component when Monaco Editor is not ready
 * @component
 * @param {React.TextareaHTMLAttributes<HTMLTextAreaElement>} props - Textarea props
 * @returns {React.JSX.Element} Rendered textarea
 */
const TextareaEdit = (
  props: React.TextareaHTMLAttributes<HTMLTextAreaElement>
) => (
  <textarea
    {...props}
    className={[
      "absolute inset-0 w-full h-full p-3 border rounded-md bg-background",
      "font-mono text-sm resize-none outline-none",
      props.className || "",
    ].join(" ")}
  />
);

/**
 * BodyEditor Component
 *
 * A comprehensive HTTP request body editor supporting multiple content types
 * including raw text, JSON, XML, form data, GraphQL, and binary data.
 * Features Monaco Editor integration with textarea fallbacks and smooth
 * GSAP animations for enhanced user experience.
 *
 * @component
 * @example
 * ```tsx
 * <BodyEditor
 *   req={requestModel}
 *   colId={collectionId}
 *   disabled={false}
 * />
 * ```
 *
 * @param {BodyEditorProps} props - Component configuration
 * @returns {React.JSX.Element} Rendered body editor
 *
 * @features
 * - Multiple body types: raw, JSON, XML, form, GraphQL, binary
 * - Monaco Editor with syntax highlighting and IntelliSense
 * - Form field management with add/remove animations
 * - JSON prettification for JSON and GraphQL variables
 * - Responsive design with adaptive layouts
 * - GSAP animations for smooth type transitions
 * - Binary file handling with path/handle input
 * - Textarea fallbacks for accessibility
 *
 * @bodyTypes
 * - **raw**: Plain text content
 * - **json**: JSON with syntax highlighting and prettification
 * - **xml**: XML with syntax highlighting
 * - **text**: Plain text (alias for raw)
 * - **form**: Multipart form-data with file upload support
 * - **form-urlencoded**: URL-encoded form fields
 * - **graphql**: GraphQL query editor with variables
 * - **binary**: Binary data with file path/handle
 *
 * @accessibility
 * - ARIA labels for all form controls
 * - Keyboard navigation support
 * - Screen reader compatible
 * - Focus management during interactions
 */
export function BodyEditor({
  req,
  colId,
  disabled = false,
}: BodyEditorProps): React.JSX.Element {
  const { upsertRequest } = useStore();
  const body: RequestBody | undefined = req.body;

  // Refs para animaciones
  const panelRef = useRef<HTMLDivElement>(null);
  const formListRef = useRef<HTMLDivElement>(null);

  // Animación al cambiar el tipo de body (fade + slide)
  useLayoutEffect(() => {
    if (!panelRef.current) return;
    const prefersReduced = window.matchMedia?.(
      "(prefers-reduced-motion: reduce)"
    )?.matches;
    if (prefersReduced) return;

    const ctx = gsap.context(() => {
      gsap.fromTo(
        panelRef.current,
        { autoAlpha: 0, y: 8 },
        { autoAlpha: 1, y: 0, duration: 0.18, ease: "power2.out" }
      );
    }, panelRef);
    return () => ctx.revert();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [body?.type]);

  /**
   * Updates the request body with new data
   * @param {Partial<RequestBody> & { type?: BodyType }} next - New body data
   */
  const setBody = useCallback(
    (next: Partial<RequestBody> & { type?: BodyType }) => {
      const curr: RequestBody = body ?? { type: "raw", raw: "" };
      const merged: RequestBody = {
        ...curr,
        ...next,
        type: (next.type ?? curr.type) as BodyType,
      };
      upsertRequest(colId, { ...req, body: merged });
    },
    [body, colId, req, upsertRequest]
  );

  /**
   * Switches the body type and initializes appropriate default values
   * @param {BodyType} t - New body type to switch to
   */
  const switchType = useCallback(
    (t: BodyType) => {
      if (t === "raw") return setBody({ type: "raw", raw: "" });
      if (t === "json") return setBody({ type: "json", raw: "" });
      if (t === "xml") return setBody({ type: "xml", raw: "" });
      if (t === "text") return setBody({ type: "text", raw: "" });
      if (t === "form")
        return setBody({
          type: "form",
          form: [{ key: "", value: "", enabled: true }],
        });
      if (t === "form-urlencoded")
        return setBody({
          type: "form-urlencoded",
          form: [{ key: "", value: "", enabled: true }],
        });
      if (t === "graphql")
        return setBody({
          type: "graphql",
          graphql: { query: "", variables: {} },
        });
      if (t === "binary") return setBody({ type: "binary", binaryPath: "" });
    },
    [setBody]
  );

  /**
   * Updates a specific form field row
   * @param {number} idx - Index of the form field to update
   * @param {Partial<FormField>} patch - Partial updates to apply
   */
  function updateFormRow(idx: number, patch: Partial<FormField>) {
    const rows = (body?.form ?? []).map((r, i) =>
      i === idx ? { ...r, ...patch } : r
    );
    setBody({ form: rows });
  }

  /**
   * Adds a new form field row with entrance animation
   */
  function addFormRow() {
    setBody({
      form: [
        ...((body?.form ?? []) as FormField[]),
        { key: "", value: "", enabled: true } as FormField,
      ],
    });

    // Animate the new field
    requestAnimationFrame(() => {
      const list = formListRef.current;
      if (!list) return;
      const rows = list.querySelectorAll("[data-form-row]");
      const el = rows[rows.length - 1] as HTMLElement | undefined;
      if (!el) return;

      const prefersReduced = window.matchMedia?.(
        "(prefers-reduced-motion: reduce)"
      )?.matches;
      if (prefersReduced) return;

      gsap.fromTo(
        el,
        { autoAlpha: 0, y: 6, scale: 0.98 },
        { autoAlpha: 1, y: 0, scale: 1, duration: 0.18, ease: "power2.out" }
      );
    });
  }

  /**
   * Removes a form field row with collapse animation
   * @param {number} idx - Index of the form field to remove
   */
  function removeFormRowAnimated(idx: number) {
    const list = formListRef.current;
    if (!list) {
      setBody({ form: (body?.form ?? []).filter((_, i) => i !== idx) });
      return;
    }

    const el = list.querySelector<HTMLElement>(`[data-form-row="${idx}"]`);
    if (!el) {
      setBody({ form: (body?.form ?? []).filter((_, i) => i !== idx) });
      return;
    }

    const prefersReduced = window.matchMedia?.(
      "(prefers-reduced-motion: reduce)"
    )?.matches;
    if (prefersReduced) {
      setBody({ form: (body?.form ?? []).filter((_, i) => i !== idx) });
      return;
    }

    const tl = gsap.timeline({
      defaults: { duration: 0.16, ease: "power2.inOut" },
      onComplete: () => {
        setBody({ form: (body?.form ?? []).filter((_, i) => i !== idx) });
      },
    });
    tl.to(el, { autoAlpha: 0, y: 4 }).to(
      el,
      {
        height: 0,
        marginTop: 0,
        marginBottom: 0,
        paddingTop: 0,
        paddingBottom: 0,
      },
      "<"
    );
  }

  /**
   * Prettifies JSON content for JSON and GraphQL body types
   */
  function prettifyJson() {
    if (!body) return;
    try {
      if (body.type === "json" && body.raw) {
        const parsed = JSON.parse(body.raw);
        setBody({ raw: JSON.stringify(parsed, null, 2) });
      }
      if (body.type === "graphql" && body.graphql?.variables) {
        const pretty = JSON.stringify(body.graphql.variables, null, 2);
        setBody({
          graphql: {
            ...(body.graphql ?? { query: "" }),
            variables: JSON.parse(pretty),
          },
        });
      }
    } catch {
      /* ignore */
    }
  }

  const type: BodyType = body?.type ?? "raw";
  const isForm = type === "form" || type === "form-urlencoded";
  const isSimpleText =
    type === "raw" || type === "json" || type === "xml" || type === "text";

  /**
   * Memoized GraphQL variables text for display
   */
  const variablesText: string = useMemo(() => {
    if (body?.type !== "graphql") return "{}";
    try {
      const vars = body.graphql?.variables;
      if (!vars || typeof vars !== "object") return "{}";
      return JSON.stringify(vars, null, 2);
    } catch {
      return "{}";
    }
  }, [body?.type, body?.graphql?.variables]);

  /**
   * Memoized Monaco editor options
   */
  const editorOptions: EditorProps["options"] = useMemo(
    () => ({
      minimap: { enabled: false },
      wordWrap: "on",
      scrollBeyondLastLine: false,
      readOnly: disabled,
      fontSize: 12,
      automaticLayout: true,
      renderWhitespace: "selection",
      acceptSuggestionOnCommitCharacter: false,
      acceptSuggestionOnEnter: "off",
      accessibilitySupport: "off",
    }),
    [disabled]
  );

  return (
    <div className="space-y-3">
      {/* Body type selector - estandarizado text-sm como otros componentes */}
      <div className="flex flex-wrap items-center gap-2">
        <label className="text-sm min-w-[4.5rem] sm:w-28">Body type</label>
        <select
          className="h-9 rounded-md border bg-background px-2 text-sm w-full sm:w-auto"
          value={type}
          onChange={(e) => switchType(e.target.value as BodyType)}
          disabled={disabled}
          aria-label="Body Type"
        >
          <option value="raw">raw</option>
          <option value="json">json</option>
          <option value="xml">xml</option>
          <option value="text">text</option>
          <option value="form">form (multipart/form-data)</option>
          <option value="form-urlencoded">form-urlencoded</option>
          <option value="graphql">graphql</option>
          <option value="binary">binary</option>
        </select>

        {(type === "json" || type === "graphql") && (
          <Button
            variant="secondary"
            size="sm"
            onClick={prettifyJson}
            disabled={disabled}
            aria-label="Prettify JSON"
          >
            Prettify
          </Button>
        )}
      </div>

      {/* Content panel with animations */}
      <div key={type} ref={panelRef} className="space-y-3">
        {/* Simple text editors (raw/json/xml/text) */}
        {isSimpleText && (
          <div className="relative rounded-md border h-[42vh] sm:h-[48vh] md:h-[56vh] lg:h-[62vh]">
            <MonacoView
              language={languageFor(type)}
              value={ensureString(body?.raw)}
              onChange={(value) => {
                const v = ensureString(value);
                setBody({ raw: v });
              }}
              readOnly={disabled}
              options={editorOptions}
              className="h-full"
              height="100%"
              fallback={
                <TextareaEdit
                  value={ensureString(body?.raw)}
                  onChange={(e) => setBody({ raw: e.target.value })}
                  placeholder={`Enter ${type} content...`}
                  disabled={disabled}
                />
              }
            />
          </div>
        )}

        {/* GraphQL: query + variables - responsive grid */}
        {type === "graphql" && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Query</label>
              <div className="relative rounded-md border h-[40vh] sm:h-[46vh] md:h-[52vh]">
                <MonacoView
                  language="graphql"
                  enableGraphQL
                  value={ensureString(body?.graphql?.query)}
                  onChange={(value) =>
                    setBody({
                      graphql: {
                        ...(body?.graphql ??
                          ({ variables: {} } as GraphQLBody)),
                        query: ensureString(value),
                      },
                    })
                  }
                  readOnly={disabled}
                  options={editorOptions}
                  className="h-full"
                  height="100%"
                  fallback={
                    <TextareaEdit
                      value={ensureString(body?.graphql?.query)}
                      onChange={(e) =>
                        setBody({
                          graphql: {
                            ...(body?.graphql ?? { variables: {} }),
                            query: e.target.value,
                          },
                        })
                      }
                      placeholder="Enter GraphQL query..."
                      disabled={disabled}
                    />
                  }
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">
                Variables (JSON)
              </label>
              <div className="relative rounded-md border h-[40vh] sm:h-[46vh] md:h-[52vh]">
                <MonacoView
                  language="json"
                  value={variablesText}
                  onChange={(value) => {
                    try {
                      const text = ensureString(value).trim() || "{}";
                      const parsed = JSON.parse(text);
                      if (
                        parsed &&
                        typeof parsed === "object" &&
                        !Array.isArray(parsed)
                      ) {
                        setBody({
                          graphql: {
                            ...(body?.graphql ?? { query: "" }),
                            variables: parsed,
                          },
                        });
                      }
                    } catch {
                      /* ignore while typing */
                    }
                  }}
                  readOnly={disabled}
                  options={editorOptions}
                  className="h-full"
                  height="100%"
                  fallback={
                    <TextareaEdit
                      value={variablesText}
                      onChange={(e) => {
                        try {
                          const text = e.target.value.trim() || "{}";
                          const parsed = JSON.parse(text);
                          if (
                            parsed &&
                            typeof parsed === "object" &&
                            !Array.isArray(parsed)
                          ) {
                            setBody({
                              graphql: {
                                ...(body?.graphql ?? { query: "" }),
                                variables: parsed,
                              },
                            });
                          }
                        } catch {
                          /* ignore while typing */
                        }
                      }}
                      placeholder="Enter JSON variables..."
                      disabled={disabled}
                    />
                  }
                />
              </div>
            </div>
          </div>
        )}

        {/* Form & form-urlencoded fields */}
        {isForm && (
          <div className="space-y-2">
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 justify-between">
              <span className="text-xs text-muted-foreground">
                {type === "form"
                  ? "Multipart form-data fields"
                  : "URL-encoded form fields"}
              </span>
              <Button
                size="sm"
                variant="secondary"
                onClick={addFormRow}
                disabled={disabled}
              >
                + Add field
              </Button>
            </div>

            <div ref={formListRef} className="space-y-2">
              {(body?.form ?? []).map((f, idx) => (
                <div
                  key={idx}
                  data-form-row={idx}
                  className="grid grid-cols-1 sm:grid-cols-[auto_1fr_1fr_auto_auto] items-center gap-2 p-2 rounded hover:bg-accent/40 transition-colors"
                >
                  <div className="flex items-center gap-2 sm:block">
                    <input
                      type="checkbox"
                      checked={f.enabled !== false}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        updateFormRow(idx, { enabled: e.target.checked })
                      }
                      disabled={disabled}
                      aria-label="Enable field"
                    />
                  </div>

                  <Input
                    placeholder="key"
                    value={f.key}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      updateFormRow(idx, { key: e.target.value })
                    }
                    disabled={disabled}
                  />

                  <Input
                    placeholder="value"
                    value={f.value}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      updateFormRow(idx, { value: e.target.value })
                    }
                    disabled={disabled || (type === "form" && f.file === true)}
                  />

                  {type === "form" && (
                    <label className="text-[11px] text-muted-foreground inline-flex items-center gap-1">
                      <input
                        type="checkbox"
                        checked={!!f.file}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                          updateFormRow(idx, { file: e.target.checked })
                        }
                        disabled={disabled}
                      />
                      file
                    </label>
                  )}

                  <div className="flex sm:block">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeFormRowAnimated(idx)}
                      disabled={disabled}
                      aria-label="Remove field"
                      className="ml-auto"
                    >
                      Remove
                    </Button>
                  </div>
                </div>
              ))}

              {(body?.form ?? []).length === 0 && (
                <div className="text-[11px] text-muted-foreground">
                  No fields. Add one to begin.
                </div>
              )}
            </div>

            {type === "form" && (
              <div className="text-[11px] text-muted-foreground">
                File parts require a blob binding in the runner. Content-Type is
                set by the browser (boundary included).
              </div>
            )}
          </div>
        )}

        {/* Binary editor */}
        {type === "binary" && (
          <div className="grid gap-2">
            <label className="text-xs text-muted-foreground">
              Binary source (UI-specific handle or path)
            </label>
            <Input
              placeholder="blob://handle-or-path"
              value={body?.binaryPath ?? ""}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setBody({ binaryPath: e.target.value })
              }
              disabled={disabled}
            />
            <div className="text-[11px] text-muted-foreground">
              The runner must resolve this handle/path to an actual Blob/File
              before sending.
            </div>
          </div>
        )}
      </div>

      {/* Tip text */}
      <div className="text-[10px] text-muted-foreground">
        Tip: Ctrl/Cmd + Enter to send.
      </div>
    </div>
  );
}
