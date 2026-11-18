
/**
 * URL validation and canonical normalization for bookmark deduplication.
 */

// URL protocols supported by Timber's bookmark catalog.
export const SUPPORTED_BOOKMARK_PROTOCOLS: readonly string[] = [
  "http:",
  "https:",
];

/**
 * Check whether a URL string uses a supported web protocol (http: or https:).
 */
export function isSupportedBookmarkUrl(url: string): boolean {
  try {
    const parsed = new URL(url.trim());
    return SUPPORTED_BOOKMARK_PROTOCOLS.includes(parsed.protocol);
  } catch {
    return false;
  }
}

/**
 * Normalize a web URL into a canonical href string so identical links deduplicate across browsers.
 */
export function normalizeBookmarkUrl(url: string): string {
  try {
    const parsed = new URL(url.trim());

    // Reject browser-internal or non-web schemes (such as chrome://, about:, javascript:).
    if (!SUPPORTED_BOOKMARK_PROTOCOLS.includes(parsed.protocol)) {
      throw new Error("Unsupported bookmark protocol");
    }

    return parsed.href;
  } catch {
    throw new Error(`Invalid bookmark URL: ${url}`);
  }
}
