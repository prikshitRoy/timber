/**
 * Side-effect service for opening bookmark URLs in Android's external default browser via Tauri.
 */

import { isSupportedBookmarkUrl } from "@timber/core";
import { openUrl } from "@tauri-apps/plugin-opener";

/**
 * Open a validated http/https bookmark URL in the system browser.
 */
export async function openBookmarkUrl(url: string): Promise<void> {
  if (!isSupportedBookmarkUrl(url)) {
    throw new Error("Only http:// and https:// bookmark links can be opened.");
  }

  try {
    await openUrl(url);
  } catch {
    if (typeof window !== "undefined") {
      window.open(url, "_blank", "noopener,noreferrer");
    }
  }
}
