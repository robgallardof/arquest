"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { gsap } from "gsap";

/**
 * CopyButton
 * ----------
 * A responsive utility button that copies a string to the clipboard.
 * 
 * Features:
 * - Clipboard API via `navigator.clipboard.writeText()`.
 * - Animated feedback using GSAP ("Copy" → "Copied").
 * - Silent failure handling.
 * - Keyboard accessible with ARIA labels.
 *
 * @param payload - The string content to copy.
 * @returns A button that shows feedback after copying.
 */
export function CopyButton({ payload }: { payload: string }) {
  const [copied, setCopied] = React.useState(false);
  const textRef = React.useRef<HTMLSpanElement>(null);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(payload ?? "");
      setCopied(true);

      if (textRef.current) {
        gsap.fromTo(
          textRef.current,
          { scale: 0.9, opacity: 0 },
          { scale: 1, opacity: 1, duration: 0.3, ease: "power2.out" }
        );
      }

      window.setTimeout(() => setCopied(false), 1000);
    } catch {
      // Silent fail
    }
  };

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={handleCopy}
      className="text-sm px-3 py-1 h-auto min-h-[32px] transition-colors"
      aria-label={copied ? "Copied to clipboard" : "Copy to clipboard"}
    >
      <span ref={textRef}>{copied ? "Copied" : "Copy"}</span>
    </Button>
  );
}
