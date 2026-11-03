// This connects the tree reader to the repository
//TODO: For now one installation has one default source for its current browser. Later add introduce explicit profile management
import { browser } from "wxt/browser";
import { detectBrowser } from "../browser/browser-info";
import { bookmarkRepository } from "./bookmark-repository";
import { readNativeBookmarkTree } from "./bookmark-tree-reader";
import type { BrowserKind } from "../types/timber";
import type { BookmarkSyncSummary } from "./bookmark.types";

/**
 * Check whether Timber can access native bookmarks
 */
export async function hasBookmarkPermission(): Promise<boolean> {
  return browser.permissions.contains({
    permissions: ["bookmarks"],
  });
}

/**
 * Request bookmark access
 * Call this directly from a user click handler
 */
export async function requestBookmarkPermission(): Promise<boolean> {
  return browser.permissions.request({
    permissions: ["bookmarks"],
  });
}

function getBrowserName(kind: BrowserKind): string {
  const names: Record<BrowserKind, string> = {
    brave: "Brave",
    firefox: "Firefox",
    chromium: "Chromium",
    unknown: "Browser",
  };

  return names[kind];
}

/**
 * Synchronize the native bookmark tree of the current browser
 */
export async function syncCurrentBrowserBookmarks():
  Promise<BookmarkSyncSummary> {

  const permitted = await hasBookmarkPermission();

  if (!permitted) {
    throw new Error("Bookmark permission not granted.");
  }

  const browserKind = await detectBrowser();

  // Initialize Timber database
  const state = await bookmarkRepository.initialize(browserKind);

  // Find this browser's source
  let source = state.sources.find(
    (item) => item.browser === browserKind
  );

  // Create a source if it doesn't exist
  if (!source) {
    source = await bookmarkRepository.registerSource(
      browserKind,
      getBrowserName(browserKind)
    );
  }

  // Read native bookmarks
  const nativeBookmarks = await readNativeBookmarkTree();

  // Update Timber catalog in one operation
  return bookmarkRepository.syncNativeBookmarks(
    source.id,
    nativeBookmarks
  );
}
