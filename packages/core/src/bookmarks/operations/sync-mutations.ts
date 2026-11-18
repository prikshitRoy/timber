/**
 * Pure state operations for computing native bookmark sync diffs and applying approved sync additions.
 */

import type { TimberState } from "../../types/timber.ts";
import { normalizeBookmarkUrl } from "../bookmark-normalizer.ts";
import type {
  BookmarkSyncDiff,
  BookmarkSyncSelection,
  BookmarkSyncSummary,
  NativeBookmarkRecord,
} from "../bookmark.types.ts";
import {
  findFolderChainInState,
  findOrCreateFolderChainInState,
  stripBrowserContainer,
} from "../folder-chain.ts";

export { syncNativeBookmarksInState } from "./legacy-sync.ts";

const now = () => Date.now();
const createId = () => crypto.randomUUID();

/**
 * Check whether a canonical bookmark is currently placed on Timber's root grid.
 */
function isBookmarkPlacedAtRoot(
  state: TimberState,
  bookmarkId: string
): boolean {
  if (state.rootBookmarkIds?.includes(bookmarkId)) {
    return true;
  }

  const isInAnyCustomFolder = state.pages.some(
    (page) =>
      page.type === "custom" && Boolean(page.bookmarkIds?.includes(bookmarkId))
  );

  return !isInAnyCustomFolder;
}

/**
 * Check whether a native browser bookmark already exists at its matching folder (or root) placement in Timber.
 */
function isNativeBookmarkPlacedInState(
  state: TimberState,
  native: NativeBookmarkRecord
): boolean {
  let normalizedUrl: string;
  try {
    normalizedUrl = normalizeBookmarkUrl(native.url);
  } catch {
    return true;
  }

  const bookmark = state.bookmarks.find(
    (item) => item.normalizedUrl === normalizedUrl
  );
  if (!bookmark) {
    return false;
  }

  const targetFolderPath = stripBrowserContainer(native.folderPath);

  if (targetFolderPath.length === 0) {
    return isBookmarkPlacedAtRoot(state, bookmark.id);
  }

  const folder = findFolderChainInState(state, targetFolderPath);
  if (!folder) {
    return false;
  }

  return Boolean(folder.bookmarkIds?.includes(bookmark.id));
}

/**
 * Build a deduplication key combining the normalized URL and its target Timber folder path.
 */
function buildPlacementKey(native: NativeBookmarkRecord): string | null {
  try {
    const normalizedUrl = normalizeBookmarkUrl(native.url);
    const folderKey = stripBrowserContainer(native.folderPath)
      .map((segment) => segment.trim())
      .filter(Boolean)
      .join("/");
    return `${folderKey}::${normalizedUrl}`;
  } catch {
    return null;
  }
}

/**
 * Compute which native browser bookmarks are missing from their corresponding folder or root placement in Timber.
 */
export function computeSyncDiffInState(
  state: TimberState,
  sourceId: string,
  nativeBookmarks: NativeBookmarkRecord[]
): BookmarkSyncDiff {
  const source = state.sources.find((item) => item.id === sourceId);
  if (!source) {
    throw new Error("Browser source not found.");
  }

  const additions: BookmarkSyncDiff["additions"] = [];
  const seenNativeIds = new Set<string>();
  const seenPlacements = new Set<string>();

  for (const native of nativeBookmarks) {
    if (seenNativeIds.has(native.nativeBookmarkId)) continue;
    seenNativeIds.add(native.nativeBookmarkId);

    const placementKey = buildPlacementKey(native);
    if (!placementKey || seenPlacements.has(placementKey)) continue;

    if (!isNativeBookmarkPlacedInState(state, native)) {
      seenPlacements.add(placementKey);
      additions.push({ native });
    }
  }

  return { sourceId, additions };
}

/**
 * Apply user-approved native bookmark additions to state and place them into matching Timber folders or root.
 */
export function applySyncDiffInState(
  state: TimberState,
  sourceId: string,
  nativeBookmarks: NativeBookmarkRecord[],
  selection: BookmarkSyncSelection
): BookmarkSyncSummary {
  const source = state.sources.find((item) => item.id === sourceId);
  if (!source) {
    throw new Error("Browser source not found.");
  }

  const acceptedIds = new Set(selection.acceptedNativeIds);
  const nativeById = new Map<string, NativeBookmarkRecord>(
    nativeBookmarks.map((item) => [item.nativeBookmarkId, item] as const)
  );

  let uniqueAdded = 0;
  let associationsAdded = 0;
  let associationsUpdated = 0;

  for (const nativeId of acceptedIds) {
    const input = nativeById.get(nativeId);
    if (!input) continue;

    const normalizedUrl = normalizeBookmarkUrl(input.url);
    let bookmark = state.bookmarks.find(
      (item) => item.normalizedUrl === normalizedUrl
    );

    if (!bookmark) {
      bookmark = {
        id: createId(),
        url: input.url,
        normalizedUrl,
        title: input.title || input.url,
        createdAt: now(),
        updatedAt: now(),
      };
      state.bookmarks.push(bookmark);
      uniqueAdded++;
    }

    const existingOccurrence = state.bookmarkSources.find(
      (item) =>
        item.sourceId === sourceId &&
        item.nativeBookmarkId === input.nativeBookmarkId
    );

    if (existingOccurrence) {
      existingOccurrence.bookmarkId = bookmark.id;
      existingOccurrence.title = input.title;
      existingOccurrence.parentNativeId = input.parentNativeId;
      existingOccurrence.folderPath = [...input.folderPath];
      existingOccurrence.index = input.index;
      existingOccurrence.dateAdded = input.dateAdded;
      associationsUpdated++;
    } else {
      state.bookmarkSources.push({
        id: createId(),
        bookmarkId: bookmark.id,
        sourceId,
        nativeBookmarkId: input.nativeBookmarkId,
        title: input.title,
        parentNativeId: input.parentNativeId,
        folderPath: [...input.folderPath],
        index: input.index,
        dateAdded: input.dateAdded,
      });
      associationsAdded++;
    }

    // Place into the matching Timber folder chain (or root if at the top level of the browser).
    const folder = findOrCreateFolderChainInState(
      state,
      stripBrowserContainer(input.folderPath)
    );

    if (folder) {
      folder.bookmarkIds ??= [];
      if (!folder.bookmarkIds.includes(bookmark.id)) {
        folder.bookmarkIds.push(bookmark.id);
        folder.updatedAt = now();
      }
    } else {
      state.rootBookmarkIds ??= [];
      if (!state.rootBookmarkIds.includes(bookmark.id)) {
        state.rootBookmarkIds.push(bookmark.id);
      }
    }
  }

  source.lastSyncedAt = now();

  return {
    scanned: nativeBookmarks.length,
    uniqueAdded,
    associationsAdded,
    associationsUpdated,
    associationsRemoved: 0,
    totalUniqueBookmarks: state.bookmarks.length,
  };
}

/**
 * Ensure every native browser folder path exists in Timber without removing any of Timber's own folders.
 */
export function ensureNativeFoldersInState(
  state: TimberState,
  nativeFolderPaths: string[][]
): number {
  let createdCount = 0;

  for (const rawPath of nativeFolderPaths) {
    const targetPath = stripBrowserContainer(rawPath);
    if (targetPath.length === 0) continue;

    const existing = findFolderChainInState(state, targetPath);
    if (!existing) {
      findOrCreateFolderChainInState(state, targetPath);
      createdCount++;
    }
  }

  return createdCount;
}
