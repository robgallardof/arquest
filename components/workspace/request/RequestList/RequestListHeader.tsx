"use client";

import * as React from "react";
import {
  useLayoutEffect,
  useRef,
  useCallback,
  useEffect,
  useMemo,
  memo,
} from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { FiPlus, FiSearch } from "react-icons/fi";
import { gsap } from "gsap";
import { toast } from "sonner";

/**
 * Props interface for RequestListHeader component
 * @interface RequestListHeaderProps
 */
interface RequestListHeaderProps {
  /** Total number of requests */
  total: number;
  /** Current search query */
  query: string;
  /** Callback when search query changes */
  onChangeQuery: (query: string) => void;
  /** Callback to create a new request */
  onCreate: () => void;
  /** Number of collections available (0 triggers the toast) */
  collectionsCount?: number;
  /** Optional callback to create a collection from toast action */
  onCreateCollection?: () => void;
}

/**
 * Configuration constants
 * @constant
 */
const CONFIG = {
  ICON_SIZE: 14, // Estandarizado con otros componentes
  TOAST_DURATION: 4200,
  ANIMATION_DURATION: 0.32,
  ANIMATION_OFFSET: -16,
  INPUT_HEIGHT: 36, // 9 * 4px = 36px
} as const;

/**
 * CSS class constants for consistent styling
 * @constant
 */
const STYLES = {
  HEADER_CONTAINER: `
    sticky top-0 z-10 bg-background/98 backdrop-blur 
    supports-[backdrop-filter]:bg-background/85
  `,
  HEADER_CONTENT: "flex items-center justify-between gap-3 px-3 py-3 md:px-4",
  TITLE_CONTAINER: "flex min-w-0 items-center gap-2",
  TITLE_TEXT: "truncate text-[13px] font-semibold tracking-tight md:text-sm",
  COUNT_BADGE: `
    shrink-0 rounded-full bg-primary/10 px-2 py-0.5 
    text-[10px] font-medium text-primary
  `,
  CREATE_BUTTON: "gap-1.5",
  SEARCH_CONTAINER: "px-3 pb-3 md:px-4",
  SEARCH_WRAPPER: "relative",
  SEARCH_ICON: "absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground",
  SEARCH_INPUT: "h-9 pl-10 text-[13px] md:text-sm",
  BUTTON_TEXT_RESPONSIVE: "hidden sm:inline",
} as const;

/**
 * ARIA labels for accessibility
 * @constant
 */
const ARIA_LABELS = {
  CREATE_BUTTON: "Create new request",
  SEARCH_INPUT: "Search requests",
  SEARCH_PLACEHOLDER: "Search by name or URL",
  COUNT_TITLE: "total requests",
} as const;

/**
 * Toast messages
 * @constant
 */
const TOAST_MESSAGES = {
  NO_COLLECTIONS_TITLE: "No collections yet",
  NO_COLLECTIONS_DESCRIPTION: "Create a collection before adding requests.",
  ACTION_LABEL: "Create",
} as const;

/**
 * Animation controller for header entrance
 */
class HeaderAnimationController {
  private static prefersReducedMotion: boolean | null = null;

  static checkReducedMotion(): boolean {
    if (this.prefersReducedMotion === null) {
      this.prefersReducedMotion =
        window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches ??
        false;
    }
    return this.prefersReducedMotion;
  }

  static animateEntrance(element: HTMLElement): void {
    if (this.checkReducedMotion()) return;

    gsap.fromTo(
      element,
      {
        opacity: 0,
        y: CONFIG.ANIMATION_OFFSET,
      },
      {
        opacity: 1,
        y: 0,
        duration: CONFIG.ANIMATION_DURATION,
        ease: "power2.out",
      }
    );
  }
}

/**
 * Search icon component with memoization
 * @component
 */
const SearchIcon = memo(() => (
  <FiSearch
    size={CONFIG.ICON_SIZE} // ✅ Estandarizado a 14px (era 16px)
    aria-hidden="true"
  />
));

SearchIcon.displayName = "SearchIcon";

/**
 * Plus icon component with memoization
 * @component
 */
const PlusIcon = memo(() => (
  <FiPlus size={CONFIG.ICON_SIZE} aria-hidden="true" />
));

PlusIcon.displayName = "PlusIcon";

/**
 * Request count badge component
 * @component
 */
const RequestCountBadge = memo<{ count: number }>(({ count }) => {
  const title = useMemo(() => `${count} ${ARIA_LABELS.COUNT_TITLE}`, [count]);

  return (
    <span className={STYLES.COUNT_BADGE} title={title} aria-label={title}>
      {count}
    </span>
  );
});

RequestCountBadge.displayName = "RequestCountBadge";

/**
 * Create request button component
 * @component
 */
const CreateButton = memo<{
  onClick: () => void;
  disabled?: boolean;
}>(({ onClick, disabled = false }) => {
  const handleClick = useCallback(() => {
    if (!disabled) {
      onClick();
    }
  }, [onClick, disabled]);

  return (
    <Button
      size="sm"
      onClick={handleClick}
      disabled={disabled}
      className={STYLES.CREATE_BUTTON}
      aria-label={ARIA_LABELS.CREATE_BUTTON}
      title={ARIA_LABELS.CREATE_BUTTON}
      type="button"
    >
      <PlusIcon />
      <span className={STYLES.BUTTON_TEXT_RESPONSIVE}>New</span>
    </Button>
  );
});

CreateButton.displayName = "CreateButton";

/**
 * Search input component with memoization
 * @component
 */
const SearchInput = memo<{
  query: string;
  onQueryChange: (query: string) => void;
}>(({ query, onQueryChange }) => {
  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onQueryChange(e.target.value);
    },
    [onQueryChange]
  );

  return (
    <div className={STYLES.SEARCH_CONTAINER}>
      <div className={STYLES.SEARCH_WRAPPER}>
        <span className={STYLES.SEARCH_ICON}>
          <SearchIcon />
        </span>
        <Input
          value={query}
          onChange={handleInputChange}
          placeholder={ARIA_LABELS.SEARCH_PLACEHOLDER}
          className={STYLES.SEARCH_INPUT}
          aria-label={ARIA_LABELS.SEARCH_INPUT}
          type="search"
          autoComplete="off"
          spellCheck={false}
        />
      </div>
    </div>
  );
});

SearchInput.displayName = "SearchInput";

/**
 * Custom hook for toast notifications
 */
const useToastNotifications = (
  collectionsCount: number | undefined,
  onCreateCollection?: () => void
) => {
  const didToastRef = useRef(false);

  const notifyNeedsCollection = useCallback(() => {
    if (didToastRef.current) return;
    didToastRef.current = true;

    toast(TOAST_MESSAGES.NO_COLLECTIONS_TITLE, {
      description: TOAST_MESSAGES.NO_COLLECTIONS_DESCRIPTION,
      action: onCreateCollection
        ? {
            label: TOAST_MESSAGES.ACTION_LABEL,
            onClick: onCreateCollection,
          }
        : undefined,
      duration: CONFIG.TOAST_DURATION,
    });
  }, [onCreateCollection]);

  // Auto-toast on mount if there are no collections
  useEffect(() => {
    const hasNoCollections = (collectionsCount ?? 1) === 0;

    if (hasNoCollections) {
      notifyNeedsCollection();
    } else {
      didToastRef.current = false;
    }
  }, [collectionsCount, notifyNeedsCollection]);

  return { notifyNeedsCollection };
};

/**
 * Custom hook for guarded create functionality
 */
const useGuardedCreate = (
  onCreate: () => void,
  collectionsCount: number | undefined,
  notifyNeedsCollection: () => void
) => {
  return useCallback(() => {
    const hasNoCollections = (collectionsCount ?? 1) === 0;

    if (hasNoCollections) {
      notifyNeedsCollection();
      return;
    }

    onCreate();
  }, [collectionsCount, notifyNeedsCollection, onCreate]);
};

/**
 * RequestListHeader Component
 *
 * A sophisticated, sticky header component for request management with
 * integrated search, creation controls, and smart collection validation.
 *
 * @component
 * @example
 * ```tsx
 * <RequestListHeader
 *   total={requests.length}
 *   query={searchQuery}
 *   onChangeQuery={setSearchQuery}
 *   onCreate={handleCreateRequest}
 *   collectionsCount={collections.length}
 *   onCreateCollection={handleCreateCollection}
 * />
 * ```
 *
 * @param {RequestListHeaderProps} props - Component configuration
 * @returns {JSX.Element} Rendered header component
 *
 * @features
 * - Smooth GSAP entrance animations with reduced motion support
 * - Integrated search functionality with optimized input handling
 * - Smart creation flow with collection validation
 * - Toast notifications for empty states with actionable CTAs
 * - Responsive design with adaptive text and spacing
 * - Request count badge with accessibility labels
 * - Guarded creation prevents invalid states
 *
 * @accessibility
 * - ARIA labels for all interactive elements
 * - Semantic HTML structure with proper roles
 * - Keyboard navigation support
 * - Screen reader compatible badges and labels
 * - High contrast mode support
 *
 * @performance
 * - Memoized sub-components prevent unnecessary re-renders
 * - Optimized event handlers with useCallback
 * - Efficient animation system with motion preference detection
 * - Minimal DOM updates through React.memo
 * - Custom hooks for complex state management
 */
export const RequestListHeader = memo<RequestListHeaderProps>(
  ({
    total,
    query,
    onChangeQuery,
    onCreate,
    collectionsCount,
    onCreateCollection,
  }) => {
    const headerRef = useRef<HTMLDivElement>(null);

    // Custom hooks for complex functionality
    const { notifyNeedsCollection } = useToastNotifications(
      collectionsCount,
      onCreateCollection
    );

    const onCreateGuarded = useGuardedCreate(
      onCreate,
      collectionsCount,
      notifyNeedsCollection
    );

    // Animation effect with reduced motion support
    useLayoutEffect(() => {
      if (!headerRef.current) return;
      HeaderAnimationController.animateEntrance(headerRef.current);
    }, []);

    return (
      <div ref={headerRef} className={STYLES.HEADER_CONTAINER}>
        {/* Header content */}
        <div className={STYLES.HEADER_CONTENT}>
          <div className={STYLES.TITLE_CONTAINER}>
            <h2 className={STYLES.TITLE_TEXT}>Requests</h2>
            <RequestCountBadge count={total} />
          </div>

          <CreateButton onClick={onCreateGuarded} />
        </div>

        {/* Search section */}
        <SearchInput query={query} onQueryChange={onChangeQuery} />

        <Separator />
      </div>
    );
  }
);

// Set display name for debugging
RequestListHeader.displayName = "RequestListHeader";
