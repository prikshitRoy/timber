/**
 * Displays a website favicon for a bookmark URL with an automatic fallback
 * to a styled domain-initial badge if the icon fails to load or the user is offline.
 */

import { useState } from "react";

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
 * Render a 16x16 website favicon image or a fallback monogram badge.
 */
export default function BookmarkFavicon({ url, title }: BookmarkFaviconProps) {
  const [hasError, setHasError] = useState(false);
  const hostname = extractHostname(url);

  if (!hostname || hasError) {
    return (
      <span className="bookmark-favicon-fallback" aria-hidden="true">
        {getFallbackInitial(title, hostname)}
      </span>
    );
  }

  const faviconUrl = `https://www.google.com/s2/favicons?domain=${encodeURIComponent(
    hostname
  )}&sz=32`;

  return (
    <img
      className="bookmark-favicon"
      src={faviconUrl}
      alt=""
      width={16}
      height={16}
      loading="lazy"
      onError={() => setHasError(true)}
    />
  );
}
