"use client";

import { useStore } from "@/lib/state/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  useDeferredValue,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { gsap } from "gsap";
import { runRequest } from "@/lib/http/runner";
import type { RequestModel } from "@/lib/domain/models";

/** Allowed HTTP methods for the UI control. Keep in sync with RequestModel. */
const METHODS = ["GET", "POST", "PUT", "PATCH", "DELETE"] as const;
type HttpMethod = (typeof METHODS)[number];

/** Badge tone per HTTP method. */
function methodTone(method: string): string {
  const map: Record<string, string> = {
    GET: "bg-emerald-500/15 text-emerald-700 ring-emerald-500/20",
    POST: "bg-sky-500/15 text-sky-700 ring-sky-500/20",
    PUT: "bg-amber-500/15 text-amber-700 ring-amber-500/20",
    PATCH: "bg-purple-500/15 text-purple-700 ring-purple-500/20",
    DELETE: "bg-rose-500/15 text-rose-700 ring-rose-500/20",
  };
  return map[method] ?? "bg-muted text-foreground/80 ring-border/50";
}

/** Pretty-print JSON when possible. */
function prettyMaybe(text: string): string {
  try {
    const obj = JSON.parse(text);
    return JSON.stringify(obj, null, 2);
  } catch {
    return text;
  }
}

/**
 * Request workspace (responsive, fixed toolbar on sidebar, modern shadcn UI, GSAP accents).
 */
export function Workspace(): React.JSX.Element {
  const {
    collections,
    activeCollectionId,
    upsertRequest,
    openRequestId,
    setOpenRequest,
  } = useStore();

  const col = activeCollectionId ? collections[activeCollectionId] : undefined;
  const req = col?.requests.find((r) => r.id === openRequestId);

  // Sidebar search (fixed header)
  const [query, setQuery] = useState<string>("");
  const deferredQuery = useDeferredValue(query);

  // Tabs & request state
  const [currentTab, setCurrentTab] = useState<"headers" | "body" | "response">(
    "headers"
  );
  const [status, setStatus] = useState<string>("");
  const [statusCode, setStatusCode] = useState<number | null>(null);
  const [respBody, setRespBody] = useState<string>("");
  const [sending, setSending] = useState<boolean>(false);

  // Refs
  const listRef = useRef<HTMLUListElement>(null);
  const tabsRef = useRef<HTMLDivElement>(null);
  const methodRailRef = useRef<HTMLDivElement>(null);

  // Derived list of requests
  const allRequests = col?.requests ?? [];
  const filteredRequests = useMemo(() => {
    if (!deferredQuery) return allRequests;
    const q = deferredQuery.toLowerCase();
    return allRequests.filter(
      (r) => r.name.toLowerCase().includes(q) || r.url.toLowerCase().includes(q)
    );
  }, [allRequests, deferredQuery]);

  const requestCount = filteredRequests.length;

  // Sidebar list animation on render/filter
  useLayoutEffect(() => {
    if (!listRef.current) return;
    const items = listRef.current.querySelectorAll("li");
    if (!items.length) return;
    gsap.from(items, {
      opacity: 0,
      y: 6,
      stagger: 0.025,
      duration: 0.22,
      ease: "power2.out",
    });
  }, [requestCount]);

  // Tabs content fade
  useEffect(() => {
    if (!tabsRef.current) return;
    gsap.fromTo(
      tabsRef.current,
      { opacity: 0, y: 4 },
      { opacity: 1, y: 0, duration: 0.18, ease: "power2.out" }
    );
  }, [currentTab, openRequestId]);

  // Method rail underline animation
  useEffect(() => {
    if (!methodRailRef.current || !req) return;
    const activeBtn = methodRailRef.current.querySelector<HTMLButtonElement>(
      `button[data-method="${req.method}"]`
    );
    const bar =
      methodRailRef.current.querySelector<HTMLDivElement>(".rail-underline");
    if (!activeBtn || !bar) return;
    const rect = activeBtn.getBoundingClientRect();
    const parent = methodRailRef.current.getBoundingClientRect();
    const x = rect.left - parent.left;
    gsap.to(bar, { x, width: rect.width, duration: 0.18, ease: "power2.out" });
  }, [req?.method]);

  /** Creates a new request and focuses it. */
  function newReq(): void {
    if (!col) return;
    const r: RequestModel = {
      id: crypto.randomUUID(),
      name: "Request",
      url: "https://httpbin.org/get",
      method: "GET",
      headers: [{ key: "Accept", value: "application/json", enabled: true }],
      params: [],
    };
    upsertRequest(col.id, r);
    setOpenRequest(r.id);
  }

  /** Updates only the HTTP method with strict typing. */
  function setMethod(next: HttpMethod): void {
    if (!col || !req || req.method === next) return;
    upsertRequest(col.id, { ...req, method: next });
  }

  /** Sends the active request. */
  async function send(): Promise<void> {
    if (!req || sending) return;
    setSending(true);
    setStatus("");
    setStatusCode(null);
    try {
      const headers = Object.fromEntries(
        req.headers
          .filter((h) => h.enabled && h.key)
          .map((h) => [h.key, h.value])
      );
      const body =
        req.body?.raw && ["POST", "PUT", "PATCH", "DELETE"].includes(req.method)
          ? req.body.raw
          : undefined;

      const res = await runRequest({
        url: req.url,
        method: req.method,
        headers,
        body,
      });
      setStatus(`${res.status}${res.ok ? " OK" : ""}`);
      setStatusCode(res.status);
      setRespBody(res.body ?? "");
      setCurrentTab("response");
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      setStatus("Request failed");
      setStatusCode(null);
      setRespBody(msg);
      setCurrentTab("response");
    } finally {
      setSending(false);
    }
  }

  // Ctrl/Cmd + Enter to send
  useEffect(() => {
    const onKey = (ev: KeyboardEvent) => {
      if ((ev.ctrlKey || ev.metaKey) && ev.key.toLowerCase() === "enter") {
        ev.preventDefault();
        void send();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [req, sending]);

  const statusTone = useMemo(() => {
    if (statusCode == null) return "bg-muted text-foreground/70 ring-border/50";
    if (statusCode >= 200 && statusCode < 300)
      return "bg-emerald-500/15 text-emerald-700 ring-emerald-500/20";
    if (statusCode >= 300 && statusCode < 400)
      return "bg-amber-500/15 text-amber-700 ring-amber-500/20";
    return "bg-rose-500/15 text-rose-700 ring-rose-500/20";
  }, [statusCode]);

  return (
    <div className="h-dvh min-h-dvh grid grid-rows-[auto_1fr] md:grid-rows-1 md:grid-cols-[20rem_1fr]">
      {/* Sidebar (fixed header + search; only list scrolls) */}
      <aside className="border-r p-0 flex flex-col min-h-0">
        {/* Sticky toolbar */}
        <div className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/75">
          <div className="p-3 flex items-center justify-between gap-2">
            <div className="text-sm font-semibold">Requests</div>
            <Button size="sm" onClick={newReq} disabled={!col}>
              New
            </Button>
          </div>
          <Separator />
          <div className="px-3 py-2">
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by name or URL"
              className="h-8 text-sm"
              aria-label="Search requests"
            />
          </div>
          <Separator />
        </div>

        {/* Scrollable list */}
        <ScrollArea className="flex-1 min-h-0">
          <ul ref={listRef} className="p-2 space-y-1 min-w-0">
            {filteredRequests.map((r) => {
              const active = openRequestId === r.id;
              const name = r.name?.trim() || "(unnamed)";
              return (
                <li key={r.id} className="min-w-0">
                  <button
                    onClick={() => setOpenRequest(r.id)}
                    className={[
                      "group w-full text-left px-2 py-2 rounded transition-colors",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                      active
                        ? "bg-primary/10 ring-1 ring-primary/20"
                        : "hover:bg-accent",
                    ].join(" ")}
                    aria-current={active ? "true" : undefined}
                    title={`${name} — ${r.url}`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span
                        className={`flex-none inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-medium ring-1 ${methodTone(
                          r.method
                        )}`}
                      >
                        {r.method}
                      </span>
                      <span className="min-w-0 max-w-full truncate text-xs font-medium text-foreground">
                        {name}
                      </span>
                    </div>
                    <div className="min-w-0 text-[10px] text-muted-foreground truncate">
                      {r.url}
                    </div>
                  </button>
                </li>
              );
            })}
            {filteredRequests.length === 0 && (
              <li className="text-xs text-muted-foreground px-2 py-3">
                No matches.
              </li>
            )}
          </ul>

          {!col && (
            <div className="p-2 text-xs text-muted-foreground">
              Create or import a collection to start.
            </div>
          )}
        </ScrollArea>
      </aside>

      {/* Main */}
      <main className="min-h-0 flex flex-col">
        {/* Top Bar */}
        <div className="border-b bg-background px-4 py-3 sticky top-0 z-10">
          {!req ? (
            <div className="text-muted-foreground text-sm">Pick a request.</div>
          ) : (
            <div className="flex flex-col gap-3">
              {/* Method rail */}
              <div
                ref={methodRailRef}
                className="relative flex gap-1 overflow-x-auto pb-1"
              >
                <div className="rail-underline absolute bottom-0 left-0 h-0.5 rounded bg-primary" />
                {METHODS.map((m) => {
                  const active = req.method === m;
                  return (
                    <button
                      key={m}
                      type="button"
                      data-method={m}
                      onClick={() => setMethod(m)}
                      className={[
                        "relative z-10 rounded-md px-2.5 py-1 text-xs font-medium ring-1",
                        active
                          ? "bg-primary/10 ring-primary/30 text-foreground"
                          : "bg-accent/60 ring-border hover:bg-accent",
                      ].join(" ")}
                      aria-pressed={active}
                      aria-label={`Set method ${m}`}
                    >
                      {m}
                    </button>
                  );
                })}
              </div>

              {/* URL row */}
              <div className="flex flex-col gap-2 md:flex-row">
                <Input
                  aria-label="Request URL"
                  className="md:flex-1"
                  value={req?.url ?? ""}
                  onChange={(e) =>
                    col &&
                    req &&
                    upsertRequest(col.id, { ...req, url: e.target.value })
                  }
                  placeholder="https://api.example.com/resource"
                />
                <div className="flex items-center gap-2">
                  <Button
                    onClick={send}
                    disabled={sending || !req}
                    className="md:self-auto self-start"
                  >
                    {sending ? "Sending…" : "Send"}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Tabs area (scrolls) */}
        <div ref={tabsRef} className="min-h-0 flex-1 overflow-y-auto p-4">
          {req && (
            <Tabs
              value={currentTab}
              onValueChange={(v: string) =>
                setCurrentTab(v as typeof currentTab)
              }
            >
              <TabsList className="flex w-full overflow-x-auto">
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

              <TabsContent value="headers">
                <HeaderEditor req={req} colId={col!.id} />
              </TabsContent>

              <TabsContent value="body">
                <div className="space-y-1">
                  <Textarea
                    placeholder="Raw body (JSON, text, etc.)"
                    className="min-h-[160px] h-[32vh] md:h-[40vh]"
                    value={req.body?.raw ?? ""}
                    onChange={(e) =>
                      upsertRequest(col!.id, {
                        ...req,
                        body: { type: "raw", raw: e.target.value },
                      })
                    }
                  />
                  <div className="text-[10px] text-muted-foreground">
                    Tip: Ctrl/Cmd + Enter to send.
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="response">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-xs inline-flex items-center gap-2">
                    <span
                      className={`rounded px-1.5 py-0.5 ring-1 ${statusTone}`}
                    >
                      Status: {status || "-"}
                    </span>
                  </div>
                  <CopyButton payload={respBody} />
                </div>
                <Textarea
                  className="font-mono text-xs h-[40vh] md:h-[55vh]"
                  value={prettyMaybe(respBody)}
                  readOnly
                />
                <div className="sr-only" aria-live="polite">
                  {status}
                </div>
              </TabsContent>
            </Tabs>
          )}
        </div>
      </main>
    </div>
  );
}

/** Header editor (inline rows). */
function HeaderEditor({
  req,
  colId,
}: {
  req: RequestModel;
  colId: string;
}): React.JSX.Element {
  const { upsertRequest } = useStore();
  const rowRef = useRef<HTMLDivElement>(null);

  function update(
    i: number,
    field: "key" | "value" | "enabled",
    value: string | boolean
  ): void {
    const headers = [...req.headers];
    if (field === "enabled") headers[i].enabled = value as boolean;
    else headers[i][field] = value as string;
    upsertRequest(colId, { ...req, headers });
  }

  function add(): void {
    upsertRequest(colId, {
      ...req,
      headers: [...req.headers, { key: "", value: "", enabled: true }],
    });
    if (rowRef.current)
      gsap.from(rowRef.current, {
        scale: 0.98,
        duration: 0.15,
        ease: "power1.out",
      });
  }

  function del(i: number): void {
    const headers = req.headers.filter((_, idx) => idx !== i);
    upsertRequest(colId, { ...req, headers });
  }

  return (
    <div className="space-y-2">
      {req.headers.map((h, i) => (
        <div
          ref={i === req.headers.length - 1 ? rowRef : undefined}
          className="grid grid-cols-[1fr_1fr_auto_auto] gap-2 p-1 rounded hover:bg-accent/50 transition-colors"
          key={`${i}-${h.key}`}
          onKeyDown={(e: React.KeyboardEvent<HTMLDivElement>) => {
            if (e.key === "Delete") del(i);
          }}
        >
          <Input
            placeholder="Key"
            value={h.key}
            onChange={(e) => update(i, "key", e.target.value)}
          />
          <Input
            placeholder="Value"
            value={h.value}
            onChange={(e) => update(i, "value", e.target.value)}
          />
          <label className="text-xs flex items-center gap-2 px-1">
            <input
              aria-label="Enable header"
              type="checkbox"
              checked={h.enabled}
              onChange={(e) => update(i, "enabled", e.target.checked)}
              className="h-4 w-4 accent-primary"
            />
            on
          </label>
          <Button
            variant="outline"
            onClick={() => del(i)}
            aria-label="Delete header"
          >
            X
          </Button>
        </div>
      ))}
      <Button variant="ghost" onClick={add}>
        + Header
      </Button>
    </div>
  );
}

/** Copy to clipboard. */
function CopyButton({ payload }: { payload: string }): React.JSX.Element {
  const [copied, setCopied] = useState(false);
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(payload ?? "");
          setCopied(true);
          window.setTimeout(() => setCopied(false), 1000);
        } catch {
          /* noop */
        }
      }}
    >
      {copied ? "Copied" : "Copy"}
    </Button>
  );
}
