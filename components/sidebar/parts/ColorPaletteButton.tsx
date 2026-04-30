"use client";

import * as React from "react";
import { useState, useEffect, useMemo, useCallback } from "react";
import dynamic from "next/dynamic";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

/**
 * Lazy-loaded color picker to avoid SSR/hydration issues in Next.js
 * @constant
 */
const HexColorPicker = dynamic(
  () => import("react-colorful").then((m) => m.HexColorPicker),
  { ssr: false }
);

/**
 * Props interface for ColorPaletteButton component
 * @interface ColorPaletteButtonProps
 */
interface ColorPaletteButtonProps {
  /** Current hex color value (e.g., "#3b82f6") */
  value?: string;
  /** Callback fired when a valid color is selected */
  onChange: (hex: string) => void;
  /** Accessible label for the palette trigger button */
  ariaLabel?: string;
  /** Tooltip text displayed on hover */
  title?: string;
  /** Additional CSS classes for the trigger button */
  className?: string;
  /** Whether the button is disabled */
  disabled?: boolean;
  /** Size variant for the trigger button */
  size?: "sm" | "md" | "lg";
}

/**
 * Props interface for individual color swatch
 * @interface SwatchProps
 */
interface SwatchProps {
  /** Hex color value */
  color: string;
  /** Whether this swatch is currently selected */
  isSelected: boolean;
  /** Click handler for swatch selection */
  onSelect: (color: string) => void;
}

/**
 * Props interface for hex input field
 * @interface HexInputProps
 */
interface HexInputProps {
  /** Current hex value */
  value: string;
  /** Change handler for input value */
  onChange: (value: string) => void;
  /** Blur handler for validation */
  onBlur: (value: string) => void;
  /** Key press handler */
  onKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
}

/**
 * Configuration constants
 * @constant
 */
const CONFIG = {
  DEFAULT_COLOR: "#3b82f6",
  ICON_SIZE: 18,
  SWATCH_SIZE: 24,
  POPOVER_WIDTH: "calc(100vw-2rem)",
  POPOVER_MAX_WIDTH: "22rem",
  GRID_COLUMNS: 7,
} as const;

/**
 * Color validation patterns
 * @constant
 */
const COLOR_PATTERNS = {
  HEX_6_DIGIT: /^[\da-fA-F]{6}$/u,
  HEX_3_DIGIT: /^[\da-fA-F]{3}$/u,
} as const;

/**
 * CSS class constants for consistent styling
 * @constant
 */
const STYLES = {
  TRIGGER_BASE: `
    inline-flex items-center justify-center rounded-md transition-colors
    focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40
    hover:bg-black/5 dark:hover:bg-white/5
  `,
  TRIGGER_SIZES: {
    sm: "h-6 w-6",
    md: "h-8 w-8",
    lg: "h-10 w-10",
  },
  TRIGGER_DISABLED: "opacity-50 cursor-not-allowed pointer-events-none",
  POPOVER_CONTAINER: "space-y-3",
  PICKER_WRAPPER: "rounded-md border p-2 bg-transparent",
  SWATCH_GRID: "grid gap-2",
  SWATCH_BUTTON:
    "rounded-md ring-1 ring-black/10 dark:ring-white/10 transition-transform hover:scale-110",
  HEX_INPUT: "flex-1 rounded-md border bg-transparent px-2 py-1 text-sm",
  CLOSE_BUTTON:
    "rounded-md border px-2 py-1 text-xs hover:bg-accent transition-colors",
  INPUT_CONTAINER: "flex items-center gap-2",
} as const;

/**
 * Keyboard shortcuts
 * @constant
 */
const KEYBOARD_SHORTCUTS = {
  ENTER: "Enter",
  ESCAPE: "Escape",
  SPACE: " ",
  TAB: "Tab",
} as const;

/**
 * Default color swatches palette
 * @constant
 */
const DEFAULT_SWATCHES = [
  "#3b82f6", // Blue
  "#22c55e", // Green
  "#ef4444", // Red
  "#f59e0b", // Amber
  "#a855f7", // Purple
  "#06b6d4", // Cyan
  "#e11d48", // Rose
  "#84cc16", // Lime
  "#f97316", // Orange
  "#14b8a6", // Teal
  "#eab308", // Yellow
  "#8b5cf6", // Violet
  "#db2777", // Pink
  "#10b981", // Emerald
] as const;

/**
 * SVG icon properties for consistency
 * @constant
 */
const ICON_PROPS = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
} as const;

/**
 * Normalizes hex color input to standard 7-character format
 * @param {string} input - Raw hex input (e.g., "#fff" or "3b82f6")
 * @returns {string | undefined} Normalized hex color or undefined if invalid
 *
 * @example
 * ```tsx
 * normalizeHex("#fff") // "#ffffff"
 * normalizeHex("3b82f6") // "#3b82f6"
 * normalizeHex("invalid") // undefined
 * ```
 */
const normalizeHex = (input: string): string | undefined => {
  const cleanInput = input.trim().replace(/^#/u, "");

  if (COLOR_PATTERNS.HEX_6_DIGIT.test(cleanInput)) {
    return `#${cleanInput.toLowerCase()}`;
  }

  if (COLOR_PATTERNS.HEX_3_DIGIT.test(cleanInput)) {
    const [r, g, b] = cleanInput.toLowerCase().split("");
    return `#${r}${r}${g}${g}${b}${b}`;
  }

  return undefined;
};

/**
 * Validates if a string is a valid hex color
 * @param {string} color - Color string to validate
 * @returns {boolean} Whether the color is valid
 */
const isValidHexColor = (color: string): boolean => {
  return Boolean(normalizeHex(color));
};

/**
 * Palette icon component with memoization
 * @component
 */
const IconPalette = React.memo<{ size?: number }>(
  ({ size = CONFIG.ICON_SIZE }) => (
    <svg {...ICON_PROPS} width={size} height={size} aria-hidden="true">
      <path d="M12 22a10 10 0 1 1 10-10c0 2.2-1.8 3-4 3h-1a3 3 0 0 0 0 6h1" />
      <circle cx="7.5" cy="10.5" r="1.25" />
      <circle cx="12" cy="7.5" r="1.25" />
      <circle cx="16.5" cy="10.5" r="1.25" />
    </svg>
  )
);

IconPalette.displayName = "IconPalette";

/**
 * Individual color swatch component
 * @component
 */
const ColorSwatch = React.memo<SwatchProps>(
  ({ color, isSelected, onSelect }) => {
    const handleClick = useCallback(() => {
      onSelect(color);
    }, [color, onSelect]);

    const handleKeyDown = useCallback(
      (e: React.KeyboardEvent) => {
        if (
          e.key === KEYBOARD_SHORTCUTS.ENTER ||
          e.key === KEYBOARD_SHORTCUTS.SPACE
        ) {
          e.preventDefault();
          onSelect(color);
        }
      },
      [color, onSelect]
    );

    return (
      <button
        type="button"
        className={`${STYLES.SWATCH_BUTTON} ${isSelected ? "ring-2 ring-primary" : ""}`}
        style={{
          backgroundColor: color,
          height: CONFIG.SWATCH_SIZE,
          width: CONFIG.SWATCH_SIZE,
        }}
        aria-label={`Select color ${color}`}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        tabIndex={0}
      />
    );
  }
);

ColorSwatch.displayName = "ColorSwatch";

/**
 * Hex input field component
 * @component
 */
const HexInput = React.memo<HexInputProps>(
  ({ value, onChange, onBlur, onKeyDown }) => {
    const handleChange = useCallback(
      (e: React.ChangeEvent<HTMLInputElement>) => {
        onChange(e.target.value);
      },
      [onChange]
    );

    const handleBlur = useCallback(
      (e: React.FocusEvent<HTMLInputElement>) => {
        onBlur(e.target.value);
      },
      [onBlur]
    );

    return (
      <input
        className={STYLES.HEX_INPUT}
        type="text"
        placeholder="#RRGGBB"
        aria-label="Hex color value"
        value={value}
        onChange={handleChange}
        onBlur={handleBlur}
        onKeyDown={onKeyDown}
        maxLength={7}
        autoComplete="off"
        spellCheck={false}
      />
    );
  }
);

HexInput.displayName = "HexInput";

/**
 * ColorPaletteButton Component
 *
 * A sophisticated color picker component with comprehensive features:
 * - Visual color picker using react-colorful
 * - Quick-access color swatches
 * - Hex input validation and normalization
 * - Keyboard navigation support
 * - Responsive popover positioning
 * - SSR-safe lazy loading
 *
 * @component
 * @example
 * ```tsx
 * <ColorPaletteButton
 *   value="#3b82f6"
 *   onChange={handleColorChange}
 *   ariaLabel="Change theme color"
 *   title="Pick a color"
 *   size="md"
 * />
 * ```
 *
 * @param {ColorPaletteButtonProps} props - Component configuration
 * @returns {JSX.Element} Rendered color palette button with popover
 *
 * @features
 * - Lazy-loaded color picker prevents SSR/hydration issues
 * - Normalizes hex colors to standard format (#rrggbb)
 * - Quick access swatches for common colors
 * - Manual hex input with validation
 * - Keyboard shortcuts (Enter to confirm, Escape to close)
 * - Responsive popover with smart positioning
 * - Optimized performance with memoization
 *
 * @accessibility
 * - ARIA labels for all interactive elements
 * - Keyboard navigation support
 * - Focus management within popover
 * - Screen reader compatible
 * - High contrast color indicators
 *
 * @performance
 * - Memoized sub-components prevent unnecessary re-renders
 * - Optimized event handlers with useCallback
 * - Lazy-loaded dependencies reduce initial bundle size
 * - Efficient color validation and normalization
 */
export const ColorPaletteButton = React.memo<ColorPaletteButtonProps>(
  ({
    value,
    onChange,
    ariaLabel = "Change color",
    title = "Change color",
    className,
    disabled = false,
    size = "md",
  }) => {
    // State management
    const [isOpen, setIsOpen] = useState(false);
    const [localColor, setLocalColor] = useState<string>(
      value ?? CONFIG.DEFAULT_COLOR
    );

    // Synchronize local state with prop changes
    useEffect(() => {
      if (value && isValidHexColor(value)) {
        const normalized = normalizeHex(value);
        if (normalized) {
          setLocalColor(normalized);
        }
      }
    }, [value]);

    // Memoize color swatches
    const swatches = useMemo(() => [...DEFAULT_SWATCHES], []);

    // Memoize trigger button classes
    const triggerClasses = useMemo(
      () =>
        [
          STYLES.TRIGGER_BASE,
          STYLES.TRIGGER_SIZES[size],
          disabled ? STYLES.TRIGGER_DISABLED : "",
          className ?? "",
        ].join(" "),
      [size, disabled, className]
    );

    // Memoize swatch grid classes
    const swatchGridClasses = useMemo(
      () => `${STYLES.SWATCH_GRID} grid-cols-${CONFIG.GRID_COLUMNS}`,
      []
    );

    // Event handlers with memoization
    const handleColorChange = useCallback(
      (color: string) => {
        setLocalColor(color);
        onChange(color);
      },
      [onChange]
    );

    const handleSwatchSelect = useCallback(
      (color: string) => {
        setLocalColor(color);
        onChange(color);
      },
      [onChange]
    );

    const handleHexInputChange = useCallback((inputValue: string) => {
      setLocalColor(inputValue);
    }, []);

    const handleHexInputBlur = useCallback(
      (inputValue: string) => {
        const normalized = normalizeHex(inputValue);
        if (normalized) {
          onChange(normalized);
          setLocalColor(normalized);
        } else {
          // Reset to current valid value
          setLocalColor(value ?? CONFIG.DEFAULT_COLOR);
        }
      },
      [value, onChange]
    );

    const handleHexInputKeyDown = useCallback(
      (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === KEYBOARD_SHORTCUTS.ENTER) {
          const normalized = normalizeHex(localColor);
          if (normalized) {
            onChange(normalized);
          }
          setIsOpen(false);
        } else if (e.key === KEYBOARD_SHORTCUTS.ESCAPE) {
          setIsOpen(false);
        }
      },
      [localColor, onChange]
    );

    const handleCloseClick = useCallback(() => {
      setIsOpen(false);
    }, []);

    const handleOpenChange = useCallback(
      (open: boolean) => {
        if (!disabled) {
          setIsOpen(open);
        }
      },
      [disabled]
    );

    // Trigger button click handler
    const handleTriggerClick = useCallback(() => {
      if (!disabled) {
        setIsOpen((prev) => !prev);
      }
    }, [disabled]);

    return (
      <Popover open={isOpen} onOpenChange={handleOpenChange}>
        <PopoverTrigger asChild>
          <button
            type="button"
            className={triggerClasses}
            aria-label={ariaLabel}
            title={title}
            onClick={handleTriggerClick}
            disabled={disabled}
            aria-expanded={isOpen}
            aria-haspopup="dialog"
          >
            <IconPalette size={CONFIG.ICON_SIZE} />
            <span className="sr-only">{ariaLabel}</span>
          </button>
        </PopoverTrigger>

        <PopoverContent
          className="p-3"
          style={{
            width: CONFIG.POPOVER_WIDTH,
            maxWidth: CONFIG.POPOVER_MAX_WIDTH,
          }}
          align="end"
          sideOffset={8}
          role="dialog"
          aria-label="Color picker"
        >
          <div className={STYLES.POPOVER_CONTAINER}>
            {/* Main color picker */}
            <div className={STYLES.PICKER_WRAPPER}>
              <HexColorPicker
                color={localColor}
                onChange={handleColorChange}
                className="w-full"
              />
            </div>

            {/* Quick color swatches */}
            <div
              className={swatchGridClasses}
              role="group"
              aria-label="Quick color selection"
            >
              {swatches.map((swatchColor) => (
                <ColorSwatch
                  key={swatchColor}
                  color={swatchColor}
                  isSelected={
                    localColor.toLowerCase() === swatchColor.toLowerCase()
                  }
                  onSelect={handleSwatchSelect}
                />
              ))}
            </div>

            {/* Hex input and close button */}
            <div className={STYLES.INPUT_CONTAINER}>
              <HexInput
                value={localColor}
                onChange={handleHexInputChange}
                onBlur={handleHexInputBlur}
                onKeyDown={handleHexInputKeyDown}
              />
              <button
                type="button"
                className={STYLES.CLOSE_BUTTON}
                onClick={handleCloseClick}
                aria-label="Close color picker"
              >
                Close
              </button>
            </div>
          </div>
        </PopoverContent>
      </Popover>
    );
  }
);

// Set display name for debugging
ColorPaletteButton.displayName = "ColorPaletteButton";
