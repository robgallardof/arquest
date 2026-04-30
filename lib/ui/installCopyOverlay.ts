// lib/ui/installCopyOverlay.ts
export type CopyOverlayDetach = () => void;

/**
 * Adds a floating "Copy" button as a Monaco overlay widget that stays visible
 * while scrolling. On small screens it moves to bottom-right automatically.
 *
 * @param editor - monaco.editor.IStandaloneCodeEditor
 * @param monaco - Monaco namespace
 * @param getText - function that returns the string to copy
 * @returns a detach function to remove listeners and the widget
 */
export function installCopyOverlay(
  editor: any,
  monaco: any,
  getText: () => string
): CopyOverlayDetach {
  const id = `copy.overlay.${Math.random().toString(36).slice(2)}`;

  // Container (let Monaco handle positioning)
  const node = document.createElement("div");
  node.style.pointerEvents = "none"; // let clicks pass except on the button

  // The button itself
  const btn = document.createElement("button");
  btn.type = "button";
  btn.textContent = "Copy";
  btn.setAttribute("aria-label", "Copy content");
  btn.className = [
    "pointer-events-auto m-2 px-2 py-1 rounded text-xs font-medium",
    "bg-background/90 backdrop-blur shadow-sm",
    "ring-1 ring-border/60 hover:ring-border",
    "text-foreground",
  ].join(" ");
  node.appendChild(btn);

  // Click logic with small "Copied" feedback
  let copiedTimer: number | undefined;
  btn.onclick = async () => {
    try {
      await navigator.clipboard.writeText(getText() ?? "");
      const original = btn.textContent;
      btn.textContent = "Copied";
      clearTimeout(copiedTimer);
      copiedTimer = window.setTimeout(
        () => (btn.textContent = original ?? "Copy"),
        1100
      );
    } catch {
      // very old fallback
      const ta = document.createElement("textarea");
      ta.value = getText() ?? "";
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
    }
  };

  // Pick initial corner based on viewport
  const mq = window.matchMedia("(max-width: 640px)");
  let pref = mq.matches
    ? monaco.editor.OverlayWidgetPositionPreference.BOTTOM_RIGHT_CORNER
    : monaco.editor.OverlayWidgetPositionPreference.TOP_RIGHT_CORNER;

  // Monaco overlay widget contract
  const widget = {
    getId: () => id,
    getDomNode: () => node,
    getPosition: () => ({ preference: pref }),
  };

  editor.addOverlayWidget(widget);

  // Keep position responsive on resize
  const mqHandler = (e: MediaQueryListEvent | MediaQueryList) => {
    pref = e.matches
      ? monaco.editor.OverlayWidgetPositionPreference.BOTTOM_RIGHT_CORNER
      : monaco.editor.OverlayWidgetPositionPreference.TOP_RIGHT_CORNER;
    editor.layoutOverlayWidget(widget);
  };
  // initial apply + listeners
  mqHandler(mq);
  mq.addEventListener("change", mqHandler as any);

  return () => {
    editor?.removeOverlayWidget?.(widget);
    mq.removeEventListener("change", mqHandler as any);
  };
}
