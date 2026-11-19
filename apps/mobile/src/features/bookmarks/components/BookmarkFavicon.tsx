/**
 * Displays a website favicon for a bookmark URL with an automatic fallback
 * to a domain-initial badge when offline or if the icon fails to load.
 */

import { useState } from "react";

// Google favicon service size in pixels for crisp rendering on high-DPI mobile screens.
const FAVICON_SIZE_PX = 32;

interface BookmarkFaviconProps {
  url: string;
  title: string;
}

/**
 * Extract the hostname from a URL string, returning null if malformed.
 */
function extractHostname(url: string): string | null {
  try {
    return new URL(url).hostname;
  } catch {
    return null;
  }
}

/**
 * Derive a single uppercase initial from a bookmark's title or hostname for the fallback badge.
 */
function getFallbackInitial(title: string, hostname: string | null): string {
  const source = (title || hostname || "?").trim();
  const match = source.match(/[a-zA-Z0-9]/);
  return (match ? match[0] : "?").toUpperCase();
}

/**
 * Render a 20x20 favicon image or a teal monogram fallback badge.
 */
export default function BookmarkFavicon({ url, title }: BookmarkFaviconProps) {
  const [hasError, setHasError] = useState(false);
  const hostname = extractHostname(url);

  if (!hostname || hasError) {
    return (
      <span
        aria-hidden="true"
        className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-teal-500/15 text-xs font-bold text-teal-700 dark:text-teal-400"
      >
        {getFallbackInitial(title, hostname)}
      </span>
    );
  }

  const faviconUrl = `https://www.google.com/s2/favicons?domain=${encodeURIComponent(
    hostname
  )}&sz=${FAVICON_SIZE_PX}`;

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={faviconUrl}
      alt=""
      width={20}
      height={20}
      loading="lazy"
      onError={() => setHasError(true)}
      className="h-5 w-5 shrink-0 rounded object-contain"
    />
  );
}
