// This connects the tree reader to the repository
//TODO: For now one installation has one default source for its current browser. Later add introduce explicit profile management
import { browser } from "wxt/browser";
import { detectBrowser } from "../browser/browser-info";
import { bookmarkRepository } from "./bookmark-repository";
import { readNativeBookmarkTree } from "./bookmark-tree-reader";
import type { BrowserKind } from "../types/timber";
import type {
  BookmarkSyncSummary,
  BookmarkSyncDiff,
  BookmarkSyncSelection,
  NativeBookmarkRecord,
} from "./bookmark.types";

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


/**
 * Compare the browser's current bookmarks against Timber's catalog
 * without changing anything, so the user can review what changed.
 */
export async function computeCurrentBrowserSyncDiff(): Promise<{
  sourceId: string;
  nativeBookmarks: NativeBookmarkRecord[];
  diff: BookmarkSyncDiff;
}> {
  const permitted = await hasBookmarkPermission();

  if (!permitted) {
    throw new Error("Bookmark permission not granted.");
  }

  const browserKind = await detectBrowser();
  const state = await bookmarkRepository.initialize(browserKind);

  let source = state.sources.find((item) => item.browser === browserKind);

  if (!source) {
    source = await bookmarkRepository.registerSource(
      browserKind,
      getBrowserName(browserKind)
    );
  }

  const nativeBookmarks = await readNativeBookmarkTree();

  const diff = await bookmarkRepository.computeSyncDiff(
    source.id,
    nativeBookmarks
  );

  return { sourceId: source.id, nativeBookmarks, diff };
}

/**
 * Apply only the changes the user approved from a prior
 * computeCurrentBrowserSyncDiff() call.
 */
export async function applyCurrentBrowserSyncSelection(
  sourceId: string,
  nativeBookmarks: NativeBookmarkRecord[],
  selection: BookmarkSyncSelection
): Promise<BookmarkSyncSummary> {
  return bookmarkRepository.applySyncDiff(
    sourceId,
    nativeBookmarks,
    selection
  );
}
