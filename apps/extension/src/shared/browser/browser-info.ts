/**
 * Browser environment detection and display-name lookup helpers.
 */

import type { BrowserKind } from "../types/timber";

declare global {
  interface Navigator {
    brave?: {
      isBrave?: () => Promise<boolean>;
    };
  }
}

// Human-readable label for each supported browser kind.
const BROWSER_DISPLAY_NAMES: Record<BrowserKind, string> = {
  brave: "Brave",
  firefox: "Firefox",
  chromium: "Chromium",
  unknown: "Browser",
};

/**
 * Return the human-readable display name for a detected browser kind.
 */
export function getBrowserDisplayName(kind: BrowserKind): string {
  return BROWSER_DISPLAY_NAMES[kind];
}

/**
 * Detect which browser family is currently running the extension.
 */
export async function detectBrowser(): Promise<BrowserKind> {
  // WXT injects build-target flags so Firefox builds can be identified immediately.
  if (import.meta.env.FIREFOX) {
    return "firefox";
  }

  // Brave shares the Chromium build target, so probe its navigator.brave API first.
  try {
    if (
      typeof navigator !== "undefined" &&
      await navigator.brave?.isBrave?.()
    ) {
      return "brave";
    }
  } catch {
    // Fall back to the general Chromium target if the Brave probe fails.
  }

  if (import.meta.env.CHROME) {
    return "chromium";
  }

  return "unknown";
}