import type { BrowserKind } from "../types/timber";

declare global {
  interface Navigator {
    brave?: {
      isBrave?: () => Promise<boolean>;
    };
  }
}

export async function detectBrowser(): Promise<BrowserKind> {
  if (import.meta.env.FIREFOX) {
    return "firefox";
  }

  try {
    if (await navigator.brave?.isBrave?.()) {
      return "brave";
    }
  } catch {
    // Use fallback detection.
  }

  if (import.meta.env.CHROME) {
    return "chromium";
  }

  return "unknown";
}