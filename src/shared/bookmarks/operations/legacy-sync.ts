/**
 * Full-replace native bookmark synchronization helpers (retained for repository API compatibility).
 */

import type { BookmarkSource, TimberState } from "../../types/timber";
import { normalizeBookmarkUrl } from "../bookmark-normalizer";
import type { BookmarkSyncSummary, NativeBookmarkRecord } from "../bookmark.types";

const now = () => Date.now();
const createId = () => crypto.randomUUID();

/**
 * Upsert a single native bookmark record during a full-replace sync pass.
 */
function upsertSingleNativeSyncItem(
  state: TimberState,
  sourceId: string,
  input: NativeBookmarkRecord
): { uniqueAdded: number; associationAdded: number; associationUpdated: number } {
  const normalizedUrl = normalizeBookmarkUrl(input.url);
  let uniqueAdded = 0;
  let associationAdded = 0;
  let associationUpdated = 0;

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
    uniqueAdded = 1;
  } else {
    const existingSourceCount = state.bookmarkSources.filter(
      (item) => item.bookmarkId === bookmark!.id
    ).length;

    if (existingSourceCount <= 1) {
      bookmark.title = input.title || input.url;
      bookmark.url = input.url;
      bookmark.updatedAt = now();
    }
  }

  const occurrence = state.bookmarkSources.find(
    (item) =>
      item.sourceId === sourceId &&
      item.nativeBookmarkId === input.nativeBookmarkId
  );

  if (occurrence) {
    const changed =
      occurrence.bookmarkId !== bookmark.id ||
      occurrence.title !== input.title ||
      occurrence.parentNativeId !== input.parentNativeId ||
      occurrence.index !== input.index ||
      JSON.stringify(occurrence.folderPath) !==
        JSON.stringify(input.folderPath);

    occurrence.bookmarkId = bookmark.id;
    occurrence.title = input.title;
    occurrence.parentNativeId = input.parentNativeId;
    occurrence.folderPath = [...input.folderPath];
    occurrence.index = input.index;
    occurrence.dateAdded = input.dateAdded;

    if (changed) associationUpdated = 1;
  } else {
    const newOccurrence: BookmarkSource = {
      id: createId(),
      bookmarkId: bookmark.id,
      sourceId,
      nativeBookmarkId: input.nativeBookmarkId,
      title: input.title,
      parentNativeId: input.parentNativeId,
      folderPath: [...input.folderPath],
      index: input.index,
      dateAdded: input.dateAdded,
    };
    state.bookmarkSources.push(newOccurrence);
    associationAdded = 1;
  }

  return { uniqueAdded, associationAdded, associationUpdated };
}

/**
 * Synchronize all native bookmarks for `sourceId` in a full-replace pass.
 */
export function syncNativeBookmarksInState(
  state: TimberState,
  sourceId: string,
  nativeBookmarks: NativeBookmarkRecord[]
): BookmarkSyncSummary {
  const source = state.sources.find((item) => item.id === sourceId);
  if (!source) {
    throw new Error("Browser source not found.");
  }

  const seenNativeIds = new Set<string>();
  let uniqueAdded = 0;
  let associationsAdded = 0;
  let associationsUpdated = 0;

  for (const input of nativeBookmarks) {
    if (seenNativeIds.has(input.nativeBookmarkId)) continue;
    seenNativeIds.add(input.nativeBookmarkId);

    const delta = upsertSingleNativeSyncItem(state, sourceId, input);
    uniqueAdded += delta.uniqueAdded;
    associationsAdded += delta.associationAdded;
    associationsUpdated += delta.associationUpdated;
  }

  const previousAssociationCount = state.bookmarkSources.length;
  state.bookmarkSources = state.bookmarkSources.filter(
    (item) =>
      item.sourceId !== sourceId || seenNativeIds.has(item.nativeBookmarkId)
  );
  const associationsRemoved =
    previousAssociationCount - state.bookmarkSources.length;

  const linkedBookmarkIds = new Set(
    state.bookmarkSources.map((item) => item.bookmarkId)
  );
  const customPageBookmarkIds = new Set(
    state.pages
      .filter((page) => page.type === "custom")
      .flatMap((page) => page.bookmarkIds ?? [])
  );

  state.bookmarks = state.bookmarks.filter(
    (bookmark) =>
      linkedBookmarkIds.has(bookmark.id) ||
      customPageBookmarkIds.has(bookmark.id)
  );

  source.lastSyncedAt = now();

  return {
    scanned: nativeBookmarks.length,
    uniqueAdded,
    associationsAdded,
    associationsUpdated,
    associationsRemoved,
    totalUniqueBookmarks: state.bookmarks.length,
  };
}
