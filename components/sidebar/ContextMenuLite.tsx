"use client";

import * as React from "react";
import { useEffect, useRef, useCallback, useMemo } from "react";
import { FiCheck, FiChevronRight } from "react-icons/fi";

/**
 * Menu item type definitions
 * @type MenuItemType
 */
type MenuItemType = 'item' | 'separator' | 'label';

/**
 * Complete MenuItem interface with all required properties
 * @interface MenuItem
 */
interface MenuItem {
  /** Unique identifier for the menu item */
  id?: string;
  /** Display label for the item */
  label?: string;
  /** Type of menu item */
  type?: MenuItemType;
  /** Whether the item is disabled */
  disabled?: boolean;
  /** Whether the item represents a destructive action */
  destructive?: boolean;
  /** Optional icon (string emoji or React element) */
  icon?: string | React.ReactNode;
  /** Keyboard shortcut text to display */
  shortcut?: string;
  /** For checkbox items, whether checked */
  checked?: boolean;
  /** Action to execute when item is selected */
  action?: () => void;
}

/**
 * Props interface for ContextMenuLite component
 * @interface ContextMenuLiteProps
 */
interface ContextMenuLiteProps {
  /** X coordinate for menu position */
  x: number;
  /** Y coordinate for menu position */
  y: number;
  /** Array of menu items to display */
  items: MenuItem[];
  /** Callback when menu should close */
  onClose: () => void;
  /** Optional className for styling */
  className?: string;
}

/**
 * Configuration constants
 * @constant
 */
const CONFIG = {
  ICON_SIZE: 14,
  MIN_WIDTH: 192, // 12rem
  MAX_HEIGHT: 320, // 20rem
  VIEWPORT_PADDING: 8,
  ANIMATION_DURATION: 150,
  BORDER_RADIUS: 8,
} as const;

/**
 * CSS class constants
 * @constant
 */
const STYLES = {
  MENU_BASE: `
    fixed z-50 min-w-48 max-h-80 overflow-y-auto overflow-x-hidden
    rounded-lg border bg-popover p-1 text-popover-foreground shadow-lg
    animate-in fade-in-0 zoom-in-95 data-[state=open]:animate-in
    data-[state=closed]:animate-out data-[state=closed]:fade-out-0
    data-[state=closed]:zoom-out-95
  `,
  ITEM_BASE: `
    relative flex cursor-default select-none items-center rounded-md
    px-3 py-2 text-sm outline-none transition-colors
    hover:bg-accent hover:text-accent-foreground
    focus:bg-accent focus:text-accent-foreground
    data-disabled:pointer-events-none data-disabled:opacity-50
  `,
  SEPARATOR: "h-px bg-border my-1 mx-2",
  LABEL: "px-3 py-1.5 text-xs font-semibold text-muted-foreground",
  SHORTCUT: "ml-auto text-xs tracking-widest opacity-60",
  ICON_CONTAINER: "mr-2 h-4 w-4 flex items-center justify-center",
  SUBMENU_ARROW: "ml-auto",
} as const;

/**
 * Individual menu item component
 * @component
 */
const MenuItemComponent = React.memo<{
  item: MenuItem;
  onClose: () => void;
}>(({ item, onClose }) => {
  const handleClick = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (item.disabled) return;
    
    if (item.action) {
      item.action();
    }
    
    onClose();
  }, [item, onClose]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (item.disabled) return;
    
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      if (item.action) {
        item.action();
      }
      onClose();
    }
  }, [item, onClose]);

  if (item.type === 'separator') {
    return <div className={STYLES.SEPARATOR} role="separator" />;
  }

  if (item.type === 'label') {
    return (
      <div className={STYLES.LABEL} role="presentation">
        {item.label}
      </div>
    );
  }

  const itemClasses = `
    ${STYLES.ITEM_BASE}
    ${item.disabled ? 'data-disabled' : ''}
    ${item.destructive ? 'text-destructive focus:text-destructive-foreground' : ''}
  `;

  return (
    <div
      className={itemClasses}
      role="menuitem"
      tabIndex={item.disabled ? -1 : 0}
      aria-disabled={item.disabled}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
    >
      {item.icon && (
        <div className={STYLES.ICON_CONTAINER}>
          {typeof item.icon === 'string' ? (
            <span>{item.icon}</span>
          ) : (
            item.icon
          )}
        </div>
      )}
      
      <span className="flex-1">{item.label}</span>
      
      {item.shortcut && (
        <span className={STYLES.SHORTCUT}>
          {item.shortcut}
        </span>
      )}
      
      {item.checked !== undefined && (
        <div className="ml-auto h-4 w-4 flex items-center justify-center">
          {item.checked && <FiCheck size={CONFIG.ICON_SIZE} />}
        </div>
      )}
    </div>
  );
});

MenuItemComponent.displayName = "MenuItemComponent";

/**
 * Hook to calculate menu position with viewport boundaries
 */
const useMenuPosition = (x: number, y: number, menuRef: React.RefObject<HTMLDivElement | null>) => {
  return useMemo(() => {
    if (!menuRef.current) {
      return { x, y };
    }

    const menu = menuRef.current;
    const menuRect = menu.getBoundingClientRect();
    const viewport = {
      width: window.innerWidth,
      height: window.innerHeight,
    };

    let adjustedX = x;
    let adjustedY = y;

    // Adjust X position if menu would overflow right edge
    if (x + menuRect.width + CONFIG.VIEWPORT_PADDING > viewport.width) {
      adjustedX = viewport.width - menuRect.width - CONFIG.VIEWPORT_PADDING;
    }

    // Adjust Y position if menu would overflow bottom edge
    if (y + menuRect.height + CONFIG.VIEWPORT_PADDING > viewport.height) {
      adjustedY = viewport.height - menuRect.height - CONFIG.VIEWPORT_PADDING;
    }

    // Ensure menu doesn't go off top/left edges
    adjustedX = Math.max(CONFIG.VIEWPORT_PADDING, adjustedX);
    adjustedY = Math.max(CONFIG.VIEWPORT_PADDING, adjustedY);

    return { x: adjustedX, y: adjustedY };
  }, [x, y, menuRef]);
};

/**
 * ContextMenuLite Component
 * 
 * A lightweight, positionable context menu component for displaying
 * menu items at specific coordinates. Supports keyboard navigation,
 * automatic viewport boundary detection, and various menu item types.
 * 
 * @component
 * @example
 * ```tsx
 * <ContextMenuLite
 *   x={contextMenuX}
 *   y={contextMenuY}
 *   items={[
 *     { id: '1', label: 'Copy', shortcut: '⌘C', action: handleCopy },
 *     { id: '2', label: 'Paste', shortcut: '⌘V', action: handlePaste },
 *     { type: 'separator' },
 *     { id: '3', label: 'Delete', action: handleDelete, destructive: true }
 *   ]}
 *   onClose={handleClose}
 * />
 * ```
 * 
 * @param {ContextMenuLiteProps} props - Component configuration
 * @returns {JSX.Element} Rendered context menu
 * 
 * @features
 * - Automatic viewport boundary detection and positioning
 * - Keyboard navigation (Enter, Space, Escape, Arrow keys)
 * - Support for separators, labels, and regular items
 * - Shortcut display and destructive item styling
 * - Click-outside-to-close functionality
 * - Smooth animations and transitions
 * 
 * @accessibility
 * - ARIA roles and properties
 * - Keyboard navigation support
 * - Focus management
 * - Screen reader compatible
 */
export const ContextMenuLite = React.memo<ContextMenuLiteProps>(({
  x,
  y,
  items,
  onClose,
  className,
}) => {
  const menuRef = useRef<HTMLDivElement>(null);
  const { x: adjustedX, y: adjustedY } = useMenuPosition(x, y, menuRef);

  // Handle click outside to close
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [onClose]);

  // Auto-focus first item on mount
  useEffect(() => {
    if (menuRef.current) {
      const firstItem = menuRef.current.querySelector('[role="menuitem"]:not([aria-disabled="true"])') as HTMLElement;
      if (firstItem) {
        firstItem.focus();
      }
    }
  }, []);

  // Handle keyboard navigation
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    const menuItems = Array.from(
      menuRef.current?.querySelectorAll('[role="menuitem"]:not([aria-disabled="true"])') || []
    ) as HTMLElement[];

    const currentIndex = menuItems.findIndex(item => item === document.activeElement);

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        const nextIndex = (currentIndex + 1) % menuItems.length;
        menuItems[nextIndex]?.focus();
        break;

      case 'ArrowUp':
        e.preventDefault();
        const prevIndex = currentIndex <= 0 ? menuItems.length - 1 : currentIndex - 1;
        menuItems[prevIndex]?.focus();
        break;

      case 'Home':
        e.preventDefault();
        menuItems[0]?.focus();
        break;

      case 'End':
        e.preventDefault();
        menuItems[menuItems.length - 1]?.focus();
        break;

      case 'Escape':
        e.preventDefault();
        onClose();
        break;
    }
  }, [onClose]);

  const menuClasses = useMemo(() => {
    return `${STYLES.MENU_BASE} ${className || ''}`;
  }, [className]);

  const menuStyle = useMemo(() => ({
    left: adjustedX,
    top: adjustedY,
  }), [adjustedX, adjustedY]);

  return (
    <div
      ref={menuRef}
      className={menuClasses}
      style={menuStyle}
      role="menu"
      aria-orientation="vertical"
      onKeyDown={handleKeyDown}
    >
      {items.map((item, index) => (
        <MenuItemComponent
          key={item.id || `item-${index}`}
          item={item}
          onClose={onClose}
        />
      ))}
    </div>
  );
});

ContextMenuLite.displayName = "ContextMenuLite";

// Alias for backward compatibility
export const ContextMenuShortcut = ContextMenuLite;