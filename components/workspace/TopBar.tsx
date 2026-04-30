"use client";

import * as React from "react";
import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FiSend } from "react-icons/fi";
import type { HttpMethod } from "@/types/http";
import type { RequestModel } from "@/lib/domain/models";
import { MethodSelector } from "./MethodSelector";
import { ImportExportMenu } from "./ImportExportMenu";

/**
 * URL schema:
 * - non-empty string
 * - a valid URL
 * - must start with http:// or https://
 */
const urlSchema = z
  .string()
  .trim()
  .min(1, "URL is required")
  .refine((s) => {
    try {
      const u = new URL(s);
      return u.protocol === "http:" || u.protocol === "https:";
    } catch {
      return false;
    }
  }, "Must be a valid http(s) URL");

/**
 * TopBar
 * ------
 * Sticky header for request editing with a single, robust URL field:
 * - Local controlled state decoupled from store to avoid flicker.
 * - Debounced autosave while typing, immediate save on paste, and flush on blur.
 * - Ignores external store updates while focused.
 * - Resets local value only when the selected request changes (req.id).
 * - Validates URL with zod; disables Send if invalid.
 */
export function TopBar(props: {
  req?: RequestModel;
  safeMethod: HttpMethod;
  sending: boolean;
  urlValue: string;
  onUrlChange: (v: string) => void;
  onUrlPaste: (text: string) => void;
  onUrlBlur: (v: string) => void;
  onChangeMethod: (m: HttpMethod) => void;
  onSend: () => void;
  onCancel: () => void;
  RightControls: React.ReactNode;
  autoSaveDelayMs?: number;
}) {
  const {
    req,
    safeMethod,
    sending,
    urlValue,
    onUrlChange,
    onUrlPaste,
    onUrlBlur,
    onChangeMethod,
    onSend,
    onCancel,
    RightControls,
    autoSaveDelayMs = 300,
  } = props;

  /** Keep a simple scalar for deps to avoid linter noise. */
  const reqId = req?.id ?? null;

  /** Local URL state to avoid feedback loops vs the store. */
  const [innerUrl, setInnerUrl] = useState(urlValue);

  /** Track focus to avoid overriding user input with external changes. */
  const [focused, setFocused] = useState(false);

  /** Debounce timer + last scheduled value. */
  const timerRef = useRef<number | null>(null);
  const lastScheduledRef = useRef<string>(urlValue);

  /** URL validation (zod) for current input value. */
  const urlValidation = useMemo(
    () => urlSchema.safeParse(innerUrl),
    [innerUrl]
  );
  const isValidUrl = urlValidation.success;
  const urlErrorMsg = !urlValidation.success
    ? urlValidation.error.issues[0]?.message
    : undefined;

  /** Reset local value only when selected request changes. */
  useEffect(() => {
    if (!reqId) return;
    setInnerUrl(urlValue ?? "");
    // Clear any pending save from prior request.
    if (timerRef.current) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    lastScheduledRef.current = urlValue ?? "";
  }, [reqId, urlValue]);

  /**
   * If an external change modifies urlValue while NOT focused, adopt it.
   * Includes `innerUrl` in deps to satisfy exhaustive-deps and avoid stale reads.
   */
  useEffect(() => {
    if (!reqId) return;
    if (focused) return;
    if (urlValue !== innerUrl) setInnerUrl(urlValue ?? "");
  }, [reqId, urlValue, innerUrl, focused]);

  const scheduleSave = useCallback(
    (val: string) => {
      if (val === urlValue) return; // no-op if equal to persisted
      lastScheduledRef.current = val;
      if (timerRef.current) window.clearTimeout(timerRef.current);
      timerRef.current = window.setTimeout(() => {
        onUrlChange(lastScheduledRef.current);
        timerRef.current = null;
      }, autoSaveDelayMs);
    },
    [onUrlChange, autoSaveDelayMs, urlValue]
  );

  const flushSave = useCallback(() => {
    if (timerRef.current) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
      if (lastScheduledRef.current !== urlValue) {
        onUrlChange(lastScheduledRef.current);
      }
    }
  }, [onUrlChange, urlValue]);

  /** Cleanup on unmount just in case. */
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        window.clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, []);

  return (
    <header className="sticky top-0 z-10 border-b bg-background px-3 py-2.5 sm:px-4">
      {/* Top row: left (method) + right controls */}
      <div className="flex flex-wrap items-center gap-2">
        {!!req && (
          <div className="flex min-w-0 items-center gap-2">
            <MethodSelector value={safeMethod} onChange={onChangeMethod} />
          </div>
        )}
        <div className="ml-auto w-full sm:w-auto flex items-center gap-2 justify-end">
          {RightControls}
          <ImportExportMenu />
        </div>
      </div>

      {/* Name above URL */}
      {!!req && (
        <div className="mt-2 text-xs text-muted-foreground">
          {req?.name?.trim() || "(untitled request)"}
        </div>
      )}

      {/* URL row */}
      {!!req && (
        <div className="mt-2 flex flex-col gap-2 md:flex-row">
          <div className="md:flex-1">
            <Input
              aria-label="Request URL"
              aria-invalid={!isValidUrl}
              aria-describedby={!isValidUrl ? "url-error" : undefined}
              className={[
                "h-9 text-[13px] md:text-sm",
                !isValidUrl
                  ? "ring-1 ring-destructive focus-visible:ring-2 focus-visible:ring-destructive/50"
                  : "",
              ].join(" ")}
              placeholder="https://api.example.com/resource?foo=1"
              value={innerUrl}
              onFocus={() => setFocused(true)}
              onBlur={(e) => {
                setFocused(false);
                flushSave();
                onUrlBlur(e.target.value);
              }}
              onChange={(e) => {
                const next = e.target.value;
                setInnerUrl(next);
                scheduleSave(next);
              }}
              onPaste={(e) => {
                // Fully control the paste to avoid duplicate inserts and double persistence.
                e.preventDefault();
                const raw = e.clipboardData?.getData("text/plain") ?? "";
                const t = raw.trim();
                if (!t) return;

                // Reflect immediately in the input.
                setInnerUrl(t);

                // Cancel any pending debounced save; we'll persist once via onUrlPaste.
                if (timerRef.current) {
                  window.clearTimeout(timerRef.current);
                  timerRef.current = null;
                }

                // Remember last value and persist through the param-aware handler.
                lastScheduledRef.current = t;
                onUrlPaste(t);
              }}
              disabled={sending}
              autoComplete="off"
              inputMode="url"
            />
            {!isValidUrl && (
              <p id="url-error" className="mt-1 text-xs text-destructive">
                {urlErrorMsg}
              </p>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Button
              type={sending ? "button" : "submit"}
              variant={sending ? "destructive" : "default"}
              className="md:self-auto self-start text-[13px] md:text-sm"
              aria-live="polite"
              title={sending ? "Stop request" : "Send request"}
              onClick={
                sending
                  ? (e) => {
                      e.preventDefault();
                      flushSave();
                      onCancel();
                    }
                  : (e) => {
                      e.preventDefault();
                      flushSave();
                      onSend();
                    }
              }
              disabled={!req || sending || !isValidUrl}
            >
              {sending ? (
                <span className="inline-flex items-center gap-2">
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <rect
                      x="6"
                      y="6"
                      width="12"
                      height="12"
                      rx="2"
                      fill="currentColor"
                    />
                  </svg>
                  Stop
                </span>
              ) : (
                <span className="inline-flex items-center gap-2">
                  <FiSend size={14} />
                  Send
                </span>
              )}
            </Button>
          </div>
        </div>
      )}
    </header>
  );
}
