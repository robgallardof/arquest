"use client";

import * as React from "react";
import { useEffect, useRef, useState } from "react";
import { Allotment } from "allotment";
import { Sidebar } from "@/components/sidebar/Sidebar";
import { Workspace } from "@/components/workspace/Workspace";
import { UICommands } from "@/lib/services/ui/UICommands";
import { UIQueries } from "@/lib/services/ui/UIQueries";
import { SiteFooter } from "@/components/SiteFooter";

/** Default sidebar width (px) when expanded. */
const DEFAULT_WIDTH = 288;
/** Minimum allowed expanded width (px). */
const MIN_WIDTH = 200;
/** Maximum allowed expanded width (px). */
const MAX_WIDTH = 520;
/** Collapsed rail width (px) — icon-only state. */
const COLLAPSED_WIDTH = 48;

/** Clamp a numeric value to the inclusive `[min, max]` interval. */
const clamp = (n: number, min: number, max: number) =>
  Math.max(min, Math.min(max, n));

/**
 * Safely perform an imperative resize of the first Allotment pane.
 * Guarded against undefined refs and non-mounted instances.
 *
 * @param ref - Ref object returned by `useRef` and attached to `<Allotment />`.
 * @param px  - Target width in pixels for the first pane.
 */
function safeAllotResize(ref: React.MutableRefObject<any>, px: number): void {
  const inst = ref.current;
  if (!inst || typeof inst.resize !== "function") return;
  requestAnimationFrame(() => inst.resize([px]));
}

/**
 * Home
 * =====
 * Desktop split layout powered by **Allotment** with a sticky footer.
 */
export default function Home(): React.JSX.Element {
  const allotRef = useRef<any>(null);

  // hydration gate
  const [hydrated, setHydrated] = useState(false);

  // sidebar state
  const [sidebarWidth, setSidebarWidth] = useState<number>(DEFAULT_WIDTH);
  const [collapsed, setCollapsed] = useState<boolean>(false);
  const [lastExpandedWidth, setLastExpandedWidth] =
    useState<number>(DEFAULT_WIDTH);

  // load persisted UI prefs
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const [storedWidth, storedCollapsed] = await Promise.all([
          UIQueries.getSidebarWidth(),
          UIQueries.isSidebarCollapsed(),
        ]);
        if (!alive) return;

        const hydratedLast =
          typeof storedWidth === "number"
            ? clamp(storedWidth, MIN_WIDTH, MAX_WIDTH)
            : DEFAULT_WIDTH;

        const isCollapsed = Boolean(storedCollapsed);

        setLastExpandedWidth(hydratedLast);
        setCollapsed(isCollapsed);
        setSidebarWidth(isCollapsed ? COLLAPSED_WIDTH : hydratedLast);
      } catch {
        setLastExpandedWidth(DEFAULT_WIDTH);
        setCollapsed(false);
        setSidebarWidth(DEFAULT_WIDTH);
      } finally {
        setHydrated(true);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  // persist on changes
  useEffect(() => {
    if (!hydrated) return;
    (async () => {
      try {
        await Promise.all([
          UICommands.setSidebarWidth(lastExpandedWidth),
          UICommands.setSidebarCollapsed(collapsed),
        ]);
      } catch {
        /* ignore persistence failures */
      }
    })();
  }, [hydrated, lastExpandedWidth, collapsed]);

  if (!hydrated) return <div className="h-dvh w-full bg-background" />;

  return (
    <div className="h-dvh w-full overflow-hidden flex flex-col">
      {/* Main split area */}
      <div className="min-h-0 flex-1 min-w-0 overflow-hidden">
        <Allotment
          ref={allotRef}
          proportionalLayout={false}
          onChange={(sizes) => {
            const first = Array.isArray(sizes) ? sizes[0] : undefined;
            if (typeof first !== "number") return;

            const w = clamp(Math.round(first), COLLAPSED_WIDTH, MAX_WIDTH);
            setSidebarWidth(w);

            if (w <= COLLAPSED_WIDTH) {
              setCollapsed(true);
            } else {
              setCollapsed(false);
              setLastExpandedWidth(Math.max(w, MIN_WIDTH));
            }
          }}
          onReset={() => {
            setCollapsed(false);
            setLastExpandedWidth(DEFAULT_WIDTH);
            setSidebarWidth(DEFAULT_WIDTH);
            UICommands.setSidebarWidth(DEFAULT_WIDTH).catch(() => {});
          }}
        >
          {/* LEFT: Sidebar pane */}
          <Allotment.Pane
            minSize={COLLAPSED_WIDTH}
            maxSize={MAX_WIDTH}
            preferredSize={collapsed ? COLLAPSED_WIDTH : lastExpandedWidth}
          >
            <Sidebar
              width={sidebarWidth}
              collapsed={collapsed}
              onCollapsedChange={(c) => {
                if (c) {
                  setCollapsed(true);
                  setSidebarWidth(COLLAPSED_WIDTH);
                  safeAllotResize(allotRef, COLLAPSED_WIDTH);
                } else {
                  const target = Math.max(
                    lastExpandedWidth || DEFAULT_WIDTH,
                    MIN_WIDTH
                  );
                  setCollapsed(false);
                  setSidebarWidth(target);
                  safeAllotResize(allotRef, target);
                }
              }}
            />
          </Allotment.Pane>

          {/* RIGHT: Main content pane */}
          <Allotment.Pane>
            <div className="min-h-0 flex-1 min-w-0 overflow-hidden">
              <Workspace />
            </div>
          </Allotment.Pane>
        </Allotment>
      </div>

      {/* Footer */}
      <SiteFooter className="shrink-0" />
    </div>
  );
}
