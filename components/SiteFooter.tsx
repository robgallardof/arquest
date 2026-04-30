"use client";

import * as React from "react";
import { memo, useMemo } from "react";
import Image from "next/image";
import Link from "next/link";

/**
 * Props interface for SiteFooter component
 * @interface SiteFooterProps
 */
interface SiteFooterProps {
  /** Optional container className to tweak spacing/layout */
  className?: string;
  /** Product/system name displayed next to the square icon */
  systemName?: string;
  /** Path to the square system icon shown before the name */
  systemIconSrc?: string;
  /** Pixel size (width & height) for the square system icon */
  systemIconSize?: number;
  /** Destination URL for the ARQO logo link */
  href?: string;
  /** Path to the ARQO rectangular logo image */
  logoSrc?: string;
  /** Accessible alt text for the ARQO logo */
  logoAlt?: string;
  /** Rectangular ARQO logo width (px) */
  logoWidth?: number;
  /** Rectangular ARQO logo height (px) */
  logoHeight?: number;
  /** Accessible label for the ARQO link wrapper */
  ariaLabel?: string;
}

/**
 * Configuration constants
 * @constant
 */
const CONFIG = {
  DEFAULT_SYSTEM_NAME: "ARQUEST",
  DEFAULT_SYSTEM_ICON: "/icons/512x512.png",
  DEFAULT_SYSTEM_ICON_SIZE: 18,
  DEFAULT_HREF: "https://arqo.dev",
  DEFAULT_LOGO_SRC: "/images/arqo-logo-white.webp",
  DEFAULT_LOGO_ALT: "ARQO logo",
  DEFAULT_LOGO_WIDTH: 72,
  DEFAULT_LOGO_HEIGHT: 18,
  DEFAULT_ARIA_LABEL: "Open arqo.dev",
  MAX_WIDTH: "max-w-7xl",
  RESPONSIVE_BREAKPOINT: "sm",
} as const;

/**
 * CSS class constants for consistent styling
 * @constant
 */
const STYLES = {
  FOOTER_BASE: `
    w-full border-t bg-background/70 backdrop-blur 
    supports-[backdrop-filter]:bg-background/55
  `,
  CONTAINER: "mx-auto max-w-7xl px-3 sm:px-4 md:px-6",
  CONTENT_WRAPPER: "py-2",
  MAIN_CONTENT: `
    flex flex-wrap items-center justify-center gap-2.5 sm:gap-3 
    text-[11px] sm:text-xs leading-none text-muted-foreground
  `,
  SEPARATOR: "select-none opacity-60",
  SYSTEM_BRANDING: "inline-flex items-center gap-1.5",
  SYSTEM_ICON: "block h-[18px] w-[18px] sm:h-[20px] sm:w-[20px] object-contain",
  SYSTEM_NAME: "font-medium text-foreground/90",
  CREDITS_TEXT: "whitespace-nowrap",
  LOGO_LINK: `
    inline-flex items-center justify-center rounded-md px-1 py-0.5 
    ring-1 ring-transparent hover:ring-border hover:bg-muted/50 transition
  `,
  ARQO_LOGO: "block h-auto w-auto max-h-5 sm:max-h-6 object-contain",
} as const;

/**
 * Text constants for consistent messaging
 * @constant
 */
const CONTENT = {
  COPYRIGHT_PREFIX: "Copyright ©",
  CREDITS_TEXT: "Developed & designed by",
  SEPARATOR: "—",
} as const;

/**
 * Copyright component with memoization
 * @component
 */
const Copyright = memo(() => {
  const currentYear = useMemo(() => new Date().getFullYear(), []);

  return (
    <span aria-label={`Copyright ${currentYear}`}>
      {CONTENT.COPYRIGHT_PREFIX} {currentYear}
    </span>
  );
});

Copyright.displayName = "Copyright";

/**
 * Separator component with memoization
 * @component
 */
const Separator = memo(() => (
  <span className={STYLES.SEPARATOR} aria-hidden="true">
    {CONTENT.SEPARATOR}
  </span>
));

Separator.displayName = "Separator";

/**
 * System branding component with icon and name
 * @component
 */
const SystemBranding = memo<{
  iconSrc: string;
  iconSize: number;
  systemName: string;
}>(({ iconSrc, iconSize, systemName }) => {
  const iconAlt = useMemo(() => `${systemName} icon`, [systemName]);

  return (
    <span className={STYLES.SYSTEM_BRANDING}>
      <Image
        src={iconSrc}
        alt={iconAlt}
        width={iconSize}
        height={iconSize}
        className={STYLES.SYSTEM_ICON}
        priority={false}
        aria-hidden="true"
      />
      <span className={STYLES.SYSTEM_NAME}>{systemName}</span>
    </span>
  );
});

SystemBranding.displayName = "SystemBranding";

/**
 * ARQO logo link component with memoization
 * @component
 */
const ARQOLogoLink = memo<{
  href: string;
  logoSrc: string;
  logoAlt: string;
  logoWidth: number;
  logoHeight: number;
  ariaLabel: string;
}>(({ href, logoSrc, logoAlt, logoWidth, logoHeight, ariaLabel }) => {
  const linkProps = useMemo(
    () => ({
      target: "_blank" as const,
      rel: "noopener noreferrer" as const,
    }),
    []
  );

  return (
    <Link
      href={href}
      {...linkProps}
      aria-label={ariaLabel}
      className={STYLES.LOGO_LINK}
    >
      <Image
        src={logoSrc}
        alt={logoAlt}
        width={logoWidth}
        height={logoHeight}
        className={STYLES.ARQO_LOGO}
        priority={false}
      />
    </Link>
  );
});

ARQOLogoLink.displayName = "ARQOLogoLink";

/**
 * Credits section component
 * @component
 */
const CreditsSection = memo<{
  href: string;
  logoSrc: string;
  logoAlt: string;
  logoWidth: number;
  logoHeight: number;
  ariaLabel: string;
}>(({ href, logoSrc, logoAlt, logoWidth, logoHeight, ariaLabel }) => (
  <>
    <span className={STYLES.CREDITS_TEXT}>{CONTENT.CREDITS_TEXT}</span>
    <ARQOLogoLink
      href={href}
      logoSrc={logoSrc}
      logoAlt={logoAlt}
      logoWidth={logoWidth}
      logoHeight={logoHeight}
      ariaLabel={ariaLabel}
    />
  </>
));

CreditsSection.displayName = "CreditsSection";

/**
 * SiteFooter Component
 *
 * A sophisticated, responsive footer component with proper branding,
 * copyright information, and external links. Features optimized
 * performance, accessibility, and clean visual hierarchy.
 *
 * @component
 * @example
 * ```tsx
 * <SiteFooter
 *   systemName="ARQUEST"
 *   systemIconSrc="/icons/512x512.png"
 *   href="https://arqo.dev"
 *   logoSrc="/images/arqo-logo-white.webp"
 *   className="custom-footer-class"
 * />
 * ```
 *
 * @param {SiteFooterProps} props - Component configuration
 * @returns {JSX.Element} Rendered footer component
 *
 * @features
 * - Responsive design with adaptive spacing and typography
 * - Optimized Next.js Image components with proper sizing
 * - Clean visual hierarchy with separators and grouping
 * - External link handling with security attributes
 * - Backdrop blur effects for modern glass morphism
 * - Automatic copyright year generation
 * - Comprehensive accessibility support
 *
 * @layout
 * The footer displays elements in this order:
 * 1. Copyright © {year}
 * 2. System icon + name (e.g., ARQUEST)
 * 3. "Developed & designed by" + ARQO logo link
 *
 * @accessibility
 * - Proper ARIA labels for all interactive elements
 * - Semantic HTML structure with contentinfo role
 * - Screen reader compatible image alt texts
 * - High contrast support with proper color tokens
 * - Keyboard navigation support for links
 *
 * @performance
 * - Memoized sub-components prevent unnecessary re-renders
 * - Optimized Next.js Image components with lazy loading
 * - Efficient prop computations with useMemo
 * - Minimal DOM updates through React.memo
 * - Single year calculation per component lifecycle
 *
 * @responsive
 * - Adaptive text sizing (11px → 12px)
 * - Icon size scaling (18px → 20px)
 * - Flexible wrap layout for narrow screens
 * - Touch-friendly link targets
 * - Consistent spacing across breakpoints
 */
export const SiteFooter = memo<SiteFooterProps>(
  ({
    className,
    systemName = CONFIG.DEFAULT_SYSTEM_NAME,
    systemIconSrc = CONFIG.DEFAULT_SYSTEM_ICON,
    systemIconSize = CONFIG.DEFAULT_SYSTEM_ICON_SIZE,
    href = CONFIG.DEFAULT_HREF,
    logoSrc = CONFIG.DEFAULT_LOGO_SRC,
    logoAlt = CONFIG.DEFAULT_LOGO_ALT,
    logoWidth = CONFIG.DEFAULT_LOGO_WIDTH,
    logoHeight = CONFIG.DEFAULT_LOGO_HEIGHT,
    ariaLabel = CONFIG.DEFAULT_ARIA_LABEL,
  }) => {
    // Memoize computed class names
    const footerClasses = useMemo(() => {
      const baseClasses = STYLES.FOOTER_BASE;
      return className ? `${baseClasses} ${className}` : baseClasses;
    }, [className]);

    return (
      <footer role="contentinfo" className={footerClasses}>
        <div className={STYLES.CONTAINER}>
          <div className={STYLES.CONTENT_WRAPPER}>
            <div className={STYLES.MAIN_CONTENT}>
              {/* 1) Copyright section */}
              <Copyright />

              <Separator />

              {/* 2) System branding section */}
              <SystemBranding
                iconSrc={systemIconSrc}
                iconSize={systemIconSize}
                systemName={systemName}
              />

              <Separator />

              {/* 3) Credits and ARQO logo section */}
              <CreditsSection
                href={href}
                logoSrc={logoSrc}
                logoAlt={logoAlt}
                logoWidth={logoWidth}
                logoHeight={logoHeight}
                ariaLabel={ariaLabel}
              />
            </div>
          </div>
        </div>
      </footer>
    );
  }
);

// Set display name for debugging
SiteFooter.displayName = "SiteFooter";
