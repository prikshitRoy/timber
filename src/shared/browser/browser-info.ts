import type { BrowserKind } from "../types/timber";

declare global {
  interface Navigator {
    brave?: {
      isBrave?: () => Promise<boolean>;
    };
  }
}

// Verify browser detection
export async function detectBrowser(): Promise<BrowserKind> {
  // WXT knows which browser target is being built.
  if (import.meta.env.FIREFOX) {
    return "firefox";
  }

  // Brave uses WXT's Chrome target, so detect it separately.
  try {
    if (
      typeof navigator !== "undefined" &&
      await navigator.brave?.isBrave?.()
    ) {
      return "brave";
    }
  } catch {
    // Continue with the build-target fallback.
  }

  if (import.meta.env.CHROME) {
    return "chromium";
  }

  return "unknown";
}