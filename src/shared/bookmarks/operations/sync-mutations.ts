/**
 * Pure state operations for computing native bookmark sync diffs and applying approved sync additions.
 */

import type { TimberState } from "../../types/timber";
import { normalizeBookmarkUrl } from "../bookmark-normalizer";
import type {
  BookmarkSyncDiff,
  BookmarkSyncSelection,
  BookmarkSyncSummary,
  NativeBookmarkRecord,
} from "../bookmark.types";
import {
  findOrCreateFolderChainInState,
  stripBrowserContainer,
} from "../folder-chain";

export { syncNativeBookmarksInState } from "./legacy-sync";

const now = () => Date.now();
const createId = () => crypto.randomUUID();

/**
 * Compute which native bookmarks from `nativeBookmarks` are not yet linked to `sourceId` in state.
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

  const existingNativeIds = new Set(
    state.bookmarkSources
      .filter((item) => item.sourceId === sourceId)
      .map((item) => item.nativeBookmarkId)
  );

  const additions: BookmarkSyncDiff["additions"] = [];
  const seenNativeIds = new Set<string>();

  for (const native of nativeBookmarks) {
    if (seenNativeIds.has(native.nativeBookmarkId)) continue;
    seenNativeIds.add(native.nativeBookmarkId);

    if (!existingNativeIds.has(native.nativeBookmarkId)) {
      additions.push({ native });
    }
  }

  return { sourceId, additions };
}

/**
 * Apply user-approved native bookmark additions to state and auto-place them into matching Timber folders.
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

  for (const nativeId of acceptedIds) {
    const input = nativeById.get(nativeId);
    if (!input) continue;

    const alreadyLinked = state.bookmarkSources.some(
      (item) =>
        item.sourceId === sourceId &&
        item.nativeBookmarkId === input.nativeBookmarkId
    );
    if (alreadyLinked) continue;

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

    // Auto-place into the matching Timber folder chain (merged by name across browsers).
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

    associationsAdded++;
  }

  source.lastSyncedAt = now();

  return {
    scanned: nativeBookmarks.length,
    uniqueAdded,
    associationsAdded,
    associationsUpdated: 0,
    associationsRemoved: 0,
    totalUniqueBookmarks: state.bookmarks.length,
  };
}
