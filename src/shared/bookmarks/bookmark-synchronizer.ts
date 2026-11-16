/**
 * Coordinates browser bookmark permissions, native tree reading, and repository sync operations.
 */

// TODO: For now one installation has one default source for its current browser. Later introduce explicit profile management.
import { browser } from "wxt/browser";
import { detectBrowser, getBrowserDisplayName } from "../browser/browser-info";
import { bookmarkRepository } from "./bookmark-repository";
import { readNativeBookmarkTree } from "./bookmark-tree-reader";
import type { BrowserSource } from "../types/timber";
import type {
  BookmarkSyncSummary,
  BookmarkSyncDiff,
  BookmarkSyncSelection,
  NativeBookmarkRecord,
} from "./bookmark.types";

/**
 * Check whether Timber currently holds optional "bookmarks" permission in this browser.
 */
export async function hasBookmarkPermission(): Promise<boolean> {
  return browser.permissions.contains({
    permissions: ["bookmarks"],
  });
}

/**
 * Prompt the user to grant optional "bookmarks" permission (must be called from a user gesture).
 */
export async function requestBookmarkPermission(): Promise<boolean> {
  return browser.permissions.request({
    permissions: ["bookmarks"],
  });
}

/**
 * Ensure the catalog is initialized and return the BrowserSource record for the current browser.
 */
async function ensureCurrentBrowserSource(): Promise<BrowserSource> {
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
      getBrowserDisplayName(browserKind)
    );
  }

  return source;
}

/**
 * Synchronize the native bookmark tree of the current browser in one full pass.
 */
export async function syncCurrentBrowserBookmarks(): Promise<BookmarkSyncSummary> {
  const source = await ensureCurrentBrowserSource();
  const nativeBookmarks = await readNativeBookmarkTree();

  return bookmarkRepository.syncNativeBookmarks(source.id, nativeBookmarks);
}

/**
 * Compare the browser's current bookmarks against Timber's catalog without mutating state.
 */
export async function computeCurrentBrowserSyncDiff(): Promise<{
  sourceId: string;
  nativeBookmarks: NativeBookmarkRecord[];
  diff: BookmarkSyncDiff;
}> {
  const source = await ensureCurrentBrowserSource();
  const nativeBookmarks = await readNativeBookmarkTree();

  const diff = await bookmarkRepository.computeSyncDiff(
    source.id,
    nativeBookmarks
  );

  return { sourceId: source.id, nativeBookmarks, diff };
}

/**
 * Apply only the native bookmark additions approved by the user from a prior scan diff.
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
