// app/layout.tsx

import "./globals.css";
import type { Metadata, Viewport } from "next";

/**
 * Offline font imports
 * --------------------
 * These CSS files bundle local @font-face rules (woff2) into your app build,
 * so the font works offline (no calls to Google Fonts).
 * Import only the weights you actually use to keep the bundle lean.
 */
import "@fontsource/poppins/400.css";
import "@fontsource/poppins/500.css";
import "@fontsource/poppins/600.css";
import "@fontsource/poppins/700.css";

/**
 * App-level metadata
 * ------------------
 * This file must be a **Server Component** (do NOT add "use client"),
 * otherwise exporting `metadata`/`viewport` will fail.
 *
 * Everything here is statically analyzable by Next.js and injected into <head>.
 */
export const metadata: Metadata = {
  /**
   * Basic identity
   */
  title: "ARQUEST",
  applicationName: "ARQUEST",
  description: "Local-first, login-free Thunder/Postman style client",

  /**
   * PWA manifest + Apple PWAs
   */
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "ARQUEST",
  },

  /**
   * Misc UX hints
   */
  formatDetection: { telephone: false },

  /**
   * Social previews
   */
  openGraph: {
    type: "website",
    title: "ARQUEST",
    description: "Local-first, login-free Thunder/Postman style client",
    siteName: "ARQUEST",
    url: "/",
    images: [
      { url: "/icons/icon-512.png", width: 512, height: 512, alt: "ARQUEST" },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "ARQUEST",
    description: "Local-first, login-free Thunder/Postman style client",
    images: ["/icons/512x512.png"],
  },

  /**
   * Icons (favicons + Apple touch icons)
   */
  icons: {
    icon: [
      { url: "/icons/192x192.png", sizes: "192x192" },
      { url: "/icons/512x512.png", sizes: "512x512" },
    ],
    apple: [{ url: "/icons/icon-192.png", sizes: "192x192" }],
  },
};

/**
 * Viewport config
 * ---------------
 * Use `viewport` when you want fine control over mobile scaling.
 * Note: You can also set theme color via `metadata.themeColor`, but here
 * it’s kept in `viewport` to match the existing approach.
 */
export const viewport: Viewport = {
  themeColor: "#0EA5E9",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

/**
 * Root layout
 * -----------
 * Wraps all routes. Keep this component server-side (no "use client").
 * The `font-sans` class should point to Poppins in your Tailwind config:
 *
 * // tailwind.config.ts
 * export default {
 *   theme: {
 *     extend: {
 *       fontFamily: {
 *         sans: ["Poppins", "ui-sans-serif", "system-ui", "Segoe UI", "Roboto", "Arial", "sans-serif"],
 *       },
 *     },
 *   },
 * }
 */
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      {/* Head tags from `metadata`/`viewport` are injected automatically */}
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}
