/**
 * Pure state mutation helpers for browser sources, canonical bookmarks, and root link placements.
 */

import type {
  Bookmark,
  BookmarkSource,
  BrowserKind,
  BrowserSource,
  TimberState,
} from "../../types/timber.ts";
import { normalizeBookmarkUrl } from "../bookmark-normalizer.ts";
import type { NativeBookmarkInput } from "../bookmark.types.ts";

const now = () => Date.now();
const createId = () => crypto.randomUUID();

/**
 * Register a new BrowserSource and its corresponding "source" BookmarkPage in state.
 */
export function registerSourceInState(
  state: TimberState,
  browserKind: BrowserKind,
  name: string
): BrowserSource {
  const timestamp = now();
  const source: BrowserSource = {
    id: createId(),
    browser: browserKind,
    name,
    createdAt: timestamp,
  };

  state.sources.push(source);

  state.pages.push({
    id: createId(),
    name: `${name} Bookmarks`,
    type: "source",
    sourceId: source.id,
    createdAt: timestamp,
    updatedAt: timestamp,
  });

  return source;
}

/**
 * Insert or update a native browser bookmark and its BookmarkSource occurrence in state.
 */
export function upsertNativeBookmarkInState(
  state: TimberState,
  input: NativeBookmarkInput
): Bookmark {
  const normalizedUrl = normalizeBookmarkUrl(input.url);
  const sourceExists = state.sources.some(
    (source) => source.id === input.sourceId
  );

  if (!sourceExists) {
    throw new Error("Browser source not found.");
  }

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
  }

  const sourceBookmark = state.bookmarkSources.find(
    (item) =>
      item.sourceId === input.sourceId &&
      item.nativeBookmarkId === input.nativeBookmarkId
  );

  if (sourceBookmark) {
    sourceBookmark.bookmarkId = bookmark.id;
    sourceBookmark.title = input.title;
    sourceBookmark.parentNativeId = input.parentNativeId;
    sourceBookmark.folderPath = input.folderPath ?? [];
    sourceBookmark.dateAdded = input.dateAdded;
  } else {
    const occurrence: BookmarkSource = {
      id: createId(),
      bookmarkId: bookmark.id,
      sourceId: input.sourceId,
      nativeBookmarkId: input.nativeBookmarkId,
      title: input.title,
      parentNativeId: input.parentNativeId,
      folderPath: input.folderPath ?? [],
      dateAdded: input.dateAdded,
    };
    state.bookmarkSources.push(occurrence);
  }

  bookmark.updatedAt = now();
  return bookmark;
}

/**
 * Update a single bookmark's title and/or URL in state.
 */
export function updateBookmarkInState(
  state: TimberState,
  bookmarkId: string,
  updates: Partial<Pick<Bookmark, "title" | "url">>
): void {
  const bookmark = state.bookmarks.find((item) => item.id === bookmarkId);
  if (!bookmark) {
    throw new Error("Bookmark not found.");
  }

  if (updates.title !== undefined) {
    bookmark.title = updates.title;
  }

  if (updates.url !== undefined) {
    bookmark.url = updates.url;
    bookmark.normalizedUrl = normalizeBookmarkUrl(updates.url);
  }

  bookmark.updatedAt = now();
}

/**
 * Batch-update multiple bookmarks' titles and URLs in state.
 */
export function updateBookmarksInState(
  state: TimberState,
  updates: { id: string; title: string; url: string }[]
): void {
  const timestamp = now();

  for (const update of updates) {
    const bookmark = state.bookmarks.find((item) => item.id === update.id);
    if (!bookmark) continue;

    bookmark.title = update.title;
    bookmark.url = update.url;
    bookmark.normalizedUrl = normalizeBookmarkUrl(update.url);
    bookmark.updatedAt = timestamp;
  }
}

/**
 * Remove a native bookmark occurrence and garbage-collect its canonical Bookmark if unreferenced.
 */
export function removeNativeBookmarkInState(
  state: TimberState,
  sourceId: string,
  nativeBookmarkId: string
): void {
  const occurrenceIndex = state.bookmarkSources.findIndex(
    (item) =>
      item.sourceId === sourceId &&
      item.nativeBookmarkId === nativeBookmarkId
  );

  if (occurrenceIndex === -1) return;

  const [removed] = state.bookmarkSources.splice(occurrenceIndex, 1);
  if (!removed) return;

  const hasOtherSources = state.bookmarkSources.some(
    (item) => item.bookmarkId === removed.bookmarkId
  );
  const usedByPage = state.pages.some(
    (page) =>
      page.type === "custom" &&
      page.bookmarkIds?.includes(removed.bookmarkId)
  );

  if (!hasOtherSources && !usedByPage) {
    state.bookmarks = state.bookmarks.filter(
      (item) => item.id !== removed.bookmarkId
    );
  }
}

/**
 * Remove one or more bookmarks from the catalog, all source links, root placements, and custom folders.
 */
export function deleteBookmarksInState(
  state: TimberState,
  bookmarkIds: string[]
): void {
  const idSet = new Set(bookmarkIds);
  const timestamp = now();

  state.bookmarks = state.bookmarks.filter((item) => !idSet.has(item.id));
  state.bookmarkSources = state.bookmarkSources.filter(
    (item) => !idSet.has(item.bookmarkId)
  );

  if (state.rootBookmarkIds) {
    state.rootBookmarkIds = state.rootBookmarkIds.filter(
      (id) => !idSet.has(id)
    );
  }

  for (const page of state.pages) {
    if (page.type === "custom") {
      page.bookmarkIds = page.bookmarkIds?.filter((id) => !idSet.has(id));
      page.updatedAt = timestamp;
    }
  }
}

/**
 * Find or create a manual bookmark link by normalized URL in state.
 */
export function createManualLinkInState(
  state: TimberState,
  url: string,
  title: string
): Bookmark {
  const normalizedUrl = normalizeBookmarkUrl(url);
  const existing = state.bookmarks.find(
    (item) => item.normalizedUrl === normalizedUrl
  );

  if (existing) {
    // If the existing bookmark was unfoldered (visible on root), pin it in rootBookmarkIds
    // so adding a duplicate inside a folder does not hide the existing root instance.
    const isInAnyFolder = state.pages.some(
      (page) =>
        page.type === "custom" && Boolean(page.bookmarkIds?.includes(existing.id))
    );
    if (!isInAnyFolder) {
      state.rootBookmarkIds ??= [];
      if (!state.rootBookmarkIds.includes(existing.id)) {
        state.rootBookmarkIds.push(existing.id);
      }
    }

    return existing;
  }

  const timestamp = now();
  const bookmark: Bookmark = {
    id: createId(),
    url,
    normalizedUrl,
    title: title.trim() || url,
    createdAt: timestamp,
    updatedAt: timestamp,
  };

  state.bookmarks.push(bookmark);
  return bookmark;
}

/**
 * Mark a bookmark as explicitly placed on the root grid so it stays visible even if also inside a folder.
 */
export function addBookmarkToRootInState(
  state: TimberState,
  bookmarkId: string
): void {
  const bookmarkExists = state.bookmarks.some((item) => item.id === bookmarkId);
  if (!bookmarkExists) {
    throw new Error("Bookmark not found.");
  }

  state.rootBookmarkIds ??= [];
  if (!state.rootBookmarkIds.includes(bookmarkId)) {
    state.rootBookmarkIds.push(bookmarkId);
  }
}
