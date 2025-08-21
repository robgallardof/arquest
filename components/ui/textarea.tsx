"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Textarea that auto-grows to fit its content (no native scrollbar).
 * This lets the outer container (e.g., a ScrollArea or a panel) provide the scrolling UX.
 */
const Textarea = React.forwardRef<HTMLTextAreaElement, React.ComponentProps<"textarea">>(
  ({ className, onChange, value, ...props }, ref) => {
    const innerRef = React.useRef<HTMLTextAreaElement | null>(null);
    React.useImperativeHandle(ref, () => innerRef.current as HTMLTextAreaElement);

    const resize = React.useCallback(() => {
      const el = innerRef.current;
      if (!el) return;
      el.style.height = "auto";
      el.style.height = `${el.scrollHeight}px`;
    }, []);

    // Recalculate on mount and whenever `value` changes
    React.useLayoutEffect(() => {
      resize();
    }, [value, resize]);

    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      onChange?.(e);
      // Resize right after React commits the value
      queueMicrotask(resize);
    };

    return (
      <textarea
        data-slot="textarea"
        ref={innerRef}
        value={value}
        onChange={handleChange}
        className={cn(
          "border-input placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive dark:bg-input/30 flex min-h-16 w-full rounded-md border bg-transparent px-3 py-2 text-base shadow-xs transition-[color,box-shadow] outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
          // no native scrollbar; height grows with content
          "resize-none overflow-hidden",
          className
        )}
        {...props}
      />
    );
  }
);

Textarea.displayName = "Textarea";

export { Textarea };
