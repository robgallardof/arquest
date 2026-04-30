"use client";

import * as React from "react";
import { JSX, useEffect, useMemo, useRef, useState, useCallback } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useShallow } from "zustand/react/shallow";
import { useStore } from "@/lib/state/store";
import { runRequest } from "@/lib/http/runner";
import { HeaderEditor } from "./HeaderEditor";
import { createDefaultRequest } from "@/utils/request-factory";
import { isHttpMethod, HttpMethod } from "@/types/http";
import { AuthEditor } from "./AuthEditor";
import { materializeRequest } from "@/lib/http/materialize";
import { BodyEditor } from "../BodyEditor";
import { gsap } from "gsap";
import { UIQueries } from "@/lib/services/ui/UIQueries";
import { UICommands } from "@/lib/services/ui/UICommands";
import { runtimeConfig } from "@/lib/config/runtime";
import { TopBar } from "./TopBar";
import type { ParamKV, RequestModel } from "@/lib/domain/models";
import { Allotment } from "allotment";
import { RequestList } from "./request/RequestList/RequestList";
import { ResponseViewer } from "./ResponseViewer";

/** Left pane min/max/default width (px). */
const PANE_MIN = 240;
const PANE_MAX = 560;
const PANE_DEFAULT = 320;

type TabKey = "auth" | "headers" | "body" | "response";

/** Clamp helper. */
const clamp = (n: number, min: number, max: number) =>
  Math.max(min, Math.min(max, n));

/** Resize Allotment safely after mount. */
function safeAllotResize(ref: React.MutableRefObject<any>, px: number) {
  const inst = ref.current;
  if (!inst || typeof inst.resize !== "function") return;
  requestAnimationFrame(() => inst.resize([px]));
}

/**
 * Workspace
 * ----------
 * Split layout with a resizable request list (left) and editors (right).
 *
 * Behavior:
 * - Left pane width is hydrated/persisted.
 * - Ctrl/Cmd+Enter to send, Esc to cancel (while sending).
 * - TopBar autosaves URL while typing (debounced), shows selected request URL.
 * - Proxy removed: requests go directly from the browser (CORS must be allowed by the target).
 */
export function Workspace(): JSX.Element {
  const {
    collections,
    activeCollectionId,
    openRequestId,
    setOpenRequest,
    upsertRequest,
    upsertCollection,
  } = useStore(
    useShallow((s) => ({
      collections: s.collections,
      activeCollectionId: s.activeCollectionId,
      openRequestId: s.openRequestId,
      setOpenRequest: s.setOpenRequest,
      upsertRequest: s.upsertRequest,
      upsertCollection: s.upsertCollection,
    }))
  );

  /** Active collection (if any). */
  const col = activeCollectionId ? collections[activeCollectionId] : undefined;

  /** Currently open request (if any). */
  const req: RequestModel | undefined = useMemo(
    () => col?.requests.find((r) => r.id === openRequestId),
    [col, openRequestId]
  );

  const [currentTab, setCurrentTab] = useState<TabKey>("auth");
  const [status, setStatus] = useState("");
  const [statusCode, setStatusCode] = useState<number | null>(null);
  const [respBody, setRespBody] = useState("");
  const [sending, setSending] = useState(false);

  /** AbortController for cancel. */
  const abortRef = useRef<AbortController | null>(null);

  /** Splitter state. */
  const [hydrated, setHydrated] = useState(false);
  const [leftWidth, setLeftWidth] = useState<number>(PANE_DEFAULT);
  const [collapsed, setCollapsed] = useState<boolean>(false);
  const [lastExpandedLeft, setLastExpandedLeft] =
    useState<number>(PANE_DEFAULT);
  const skipFirstChange = useRef(true);
  const allotRef = useRef<any>(null);
  const mainRef = useRef<HTMLDivElement>(null);

  /** Debounced persist of left width. */
  const saveTimer = useRef<number | null>(null);
  const persistWidth = useCallback((w: number) => {
    if (saveTimer.current) window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(() => {
      UICommands.setRequestPaneWidth(w).catch(() => {});
    }, 120);
  }, []);
  useEffect(
    () => () => {
      if (saveTimer.current) window.clearTimeout(saveTimer.current);
    },
    []
  );

  /** Right content entrance animation. */
  useEffect(() => {
    if (!mainRef.current) return;
    const ctx = gsap.context(() => {
      gsap.fromTo(
        mainRef.current!,
        { opacity: 0, y: 10 },
        { opacity: 1, y: 0, duration: 0.28, ease: "power2.out" }
      );
    }, mainRef);
    return () => ctx.revert();
  }, []);

  /** Hydrate left pane width. */
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const raw = await UIQueries.getRequestPaneWidth();
        if (!alive) return;
        const w =
          typeof raw === "number"
            ? clamp(raw, PANE_MIN, PANE_MAX)
            : PANE_DEFAULT;
        setLastExpandedLeft(w);
        setLeftWidth(w);
        setCollapsed(w === 0);
      } finally {
        setHydrated(true);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  /** Enforce hydrated width. */
  useEffect(() => {
    if (!hydrated) return;
    safeAllotResize(allotRef, collapsed ? 0 : lastExpandedLeft);
  }, [hydrated, collapsed, lastExpandedLeft]);

  /** Create & focus a new request. */
  const createAndFocus = useCallback(() => {
    if (!col) return;
    const r = createDefaultRequest();
    upsertRequest(col.id, r);
    setOpenRequest(r.id);
  }, [col, upsertRequest, setOpenRequest]);

  /** Change method. */
  const setMethod = useCallback(
    (next: HttpMethod) => {
      if (!col || !req || req.method === next) return;
      upsertRequest(col.id, { ...req, method: next });
    },
    [col, req, upsertRequest]
  );

  /** Rename request. */
  const renameRequest = useCallback(
    (id: string, name: string) => {
      if (!col) return;
      const curr = col.requests.find((r) => r.id === id);
      const trimmed = name.trim();
      if (!curr || !trimmed || curr.name === trimmed) return;
      upsertRequest(col.id, { ...curr, name: trimmed });
    },
    [col, upsertRequest]
  );

  /** Delete request. */
  const deleteRequest = useCallback(
    (id: string) => {
      if (!col) return;
      const next = col.requests.filter((r) => r.id !== id);
      upsertCollection({ ...col, requests: next });
      if (openRequestId === id) setOpenRequest(undefined);
    },
    [col, openRequestId, upsertCollection, setOpenRequest]
  );

  /** Extract query params from URL (robust). */
  const extractParams = useCallback((url: string): ParamKV[] => {
    const out: ParamKV[] = [];
    try {
      const u = new URL(
        url,
        typeof window !== "undefined"
          ? window.location.href
          : "http://localhost"
      );
      u.searchParams.forEach((v, k) =>
        out.push({ key: k, value: v, enabled: true })
      );
      return out;
    } catch {
      const q = url.split("?")[1] ?? "";
      if (!q) return out;
      for (const part of q.split("&")) {
        if (!part) continue;
        const [k, v = ""] = part.split("=");
        out.push({
          key: decodeURIComponent(k),
          value: decodeURIComponent(v),
          enabled: true,
        });
      }
      return out;
    }
  }, []);

  /** Merge params by key (preserve enabled). */
  const mergeParams = useCallback(
    (existing: ParamKV[], incoming: ParamKV[]) => {
      const map = new Map(existing.map((p) => [p.key, p]));
      for (const p of incoming) {
        const curr = map.get(p.key);
        map.set(
          p.key,
          curr ? { ...curr, value: p.value, enabled: curr.enabled ?? true } : p
        );
      }
      return Array.from(map.values());
    },
    []
  );

  /** Cancel in-flight request. */
  const cancelSend = useCallback(() => {
    abortRef.current?.abort(new DOMException("User canceled", "AbortError"));
  }, []);

  /** Send current request — direct fetch (no proxy). */
  const send = useCallback(async () => {
    if (!req || sending) return;
    setSending(true);
    setStatus("");
    setStatusCode(null);

    const ctrl = new AbortController();
    abortRef.current = ctrl;

    try {
      const m = materializeRequest(req);

      const res = await runRequest({
        url: m.url,
        method: req.method,
        headers: m.headers,
        body: m.body,
        signal: ctrl.signal,
      });

      setStatus(res.statusText || String(res.status));
      setStatusCode(res.status);
      setRespBody(res.body ?? "");
      setCurrentTab("response");
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      setStatus("NETWORK_ERROR");
      setStatusCode(0);
      setRespBody(msg);
      setCurrentTab("response");
    } finally {
      setSending(false);
      abortRef.current = null;
    }
  }, [req, sending]);

  /** Shortcuts: Ctrl/Cmd+Enter to send; Esc to cancel. */
  useEffect(() => {
    const onKey = (ev: KeyboardEvent) => {
      const key = ev.key.toLowerCase();

      if ((ev.ctrlKey || ev.metaKey) && key === "enter") {
        ev.preventDefault();
        void send();
        return;
      }
      if (key === "escape" && sending) {
        ev.preventDefault();
        cancelSend();
        return;
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [send, sending, cancelSend]);

  const safeMethod: HttpMethod = isHttpMethod(req?.method)
    ? (req!.method as HttpMethod)
    : "GET";

  /** === Memoized handlers for TopBar (avoid re-creation each render) === */
  const handleUrlChange = useCallback(
    (v: string) => {
      if (!col || !req) return;
      if (v === (req.url ?? "")) return;
      upsertRequest(col.id, { ...req, url: v });
    },
    [col, req, upsertRequest]
  );

  const handleUrlPaste = useCallback(
    (t: string) => {
      if (!col || !req) return;
      const parsed = extractParams(t);
      if (parsed.length) {
        const merged = mergeParams(req.params ?? [], parsed);
        upsertRequest(col.id, { ...req, url: t, params: merged });
      } else {
        upsertRequest(col.id, { ...req, url: t });
      }
    },
    [col, req, upsertRequest, extractParams, mergeParams]
  );

  const handleUrlBlur = useCallback(
    (v: string) => {
      if (!col || !req) return;
      const parsed = extractParams(v);
      if (parsed.length) {
        const merged = mergeParams(req.params ?? [], parsed);
        // Only upsert if params actually changed
        const sameLen = (req.params?.length ?? 0) === merged.length;
        const same =
          sameLen &&
          (req.params ?? []).every(
            (p, i) =>
              p.key === merged[i].key &&
              p.value === merged[i].value &&
              (p.enabled ?? true) === (merged[i].enabled ?? true)
          );
        if (!same) upsertRequest(col.id, { ...req, params: merged });
      }
    },
    [col, req, upsertRequest, extractParams, mergeParams]
  );

  if (!hydrated) return <div className="h-dvh w-full bg-background" />;

  return (
    <div className="h-dvh min-h-dvh w-full overflow-hidden grid grid-rows-[auto_1fr] md:grid-rows-none">
      <main
        ref={mainRef}
        className="min-w-0 min-h-0 flex flex-col overflow-hidden"
        aria-busy={sending}
      >
        <TopBar
          req={req}
          safeMethod={safeMethod}
          sending={sending}
          /** Critical: always pass the selected request URL */
          urlValue={req?.url ?? ""}
          onUrlChange={handleUrlChange}
          onUrlPaste={handleUrlPaste}
          onUrlBlur={handleUrlBlur}
          onChangeMethod={setMethod}
          onSend={() => void send()}
          onCancel={cancelSend}
          RightControls={null}
        />

        <div className="min-h-0 flex-1 min-w-0 overflow-hidden">
          <Allotment
            ref={allotRef}
            proportionalLayout={false}
            defaultSizes={[collapsed ? 0 : lastExpandedLeft, 1000]}
            onChange={(sizes) => {
              const raw = Array.isArray(sizes) ? sizes[0] : undefined;
              if (typeof raw !== "number") return;

              if (skipFirstChange.current) {
                skipFirstChange.current = false;
                return;
              }

              const w = clamp(Math.round(raw), 0, PANE_MAX);
              setLeftWidth(w);
              setCollapsed(w === 0);

              if (w > 0) {
                const next = Math.max(w, PANE_MIN);
                setLastExpandedLeft(next);
                persistWidth(next);
              }
            }}
            onReset={() => {
              setCollapsed(false);
              setLastExpandedLeft(PANE_DEFAULT);
              setLeftWidth(PANE_DEFAULT);
              UICommands.setRequestPaneWidth(PANE_DEFAULT).catch(() => {});
              safeAllotResize(allotRef, PANE_DEFAULT);
            }}
          >
            <Allotment.Pane
              minSize={PANE_MIN}
              maxSize={PANE_MAX}
              preferredSize={collapsed ? 0 : lastExpandedLeft}
              snap
            >
              <section className="hidden md:flex min-w-0 h-full min-h-0 flex-col bg-background">
                <RequestList
                  requests={col?.requests ?? []}
                  activeId={openRequestId}
                  onCreate={createAndFocus}
                  onSelect={setOpenRequest}
                  onRename={renameRequest}
                  onDelete={deleteRequest}
                  containerClassName="bg-background"
                />
              </section>
            </Allotment.Pane>

            <Allotment.Pane>
              <div className="min-h-0 flex-1 overflow-y-auto p-3 sm:p-4">
                {req && (
                  <Tabs
                    value={currentTab}
                    onValueChange={(v) => setCurrentTab(v as TabKey)}
                  >
                    <TabsList className="flex w-full overflow-x-auto">
                      <TabsTrigger value="auth" className="shrink-0">
                        Auth
                      </TabsTrigger>
                      <TabsTrigger value="headers" className="shrink-0">
                        Headers
                      </TabsTrigger>
                      <TabsTrigger value="body" className="shrink-0">
                        Body
                      </TabsTrigger>
                      <TabsTrigger value="response" className="shrink-0">
                        Response
                      </TabsTrigger>
                    </TabsList>

                    <TabsContent value="auth">
                      <AuthEditor req={req} colId={col!.id} />
                    </TabsContent>
                    <TabsContent value="headers">
                      <HeaderEditor req={req} colId={col!.id} />
                    </TabsContent>
                    <TabsContent value="body">
                      <BodyEditor
                        req={req}
                        colId={col!.id}
                        disabled={sending}
                      />
                    </TabsContent>
                    <TabsContent value="response">
                      <ResponseViewer
                        status={status}
                        statusCode={statusCode}
                        body={respBody}
                      />
                    </TabsContent>
                  </Tabs>
                )}
              </div>
            </Allotment.Pane>
          </Allotment>
        </div>
      </main>
    </div>
  );
}
