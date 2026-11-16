/**
 * Pure state mutation and query helpers for Timber custom folders (BookmarkPage) and tile ordering.
 */

import type { Bookmark, BookmarkPage, TimberState } from "../../types/timber.ts";

const now = () => Date.now();
const createId = () => crypto.randomUUID();

/**
 * Create a new custom folder page in state, optionally nested inside `parentId`.
 */
export function createPageInState(
  state: TimberState,
  name: string,
  parentId?: string
): BookmarkPage {
  if (parentId) {
    const parent = state.pages.find((item) => item.id === parentId);
    if (!parent || parent.type !== "custom") {
      throw new Error("Parent folder not found.");
    }
  }

  const trimmedName = name.trim();
  if (!trimmedName) {
    throw new Error("Page name cannot be empty.");
  }

  const timestamp = now();
  const page: BookmarkPage = {
    id: createId(),
    name: trimmedName,
    type: "custom",
    bookmarkIds: [],
    parentId,
    createdAt: timestamp,
    updatedAt: timestamp,
  };

  state.pages.push(page);
  return page;
}

/**
 * Rename an existing page/folder in state.
 */
export function renamePageInState(
  state: TimberState,
  pageId: string,
  name: string
): void {
  const page = state.pages.find((item) => item.id === pageId);
  if (!page) {
    throw new Error("Page not found.");
  }

  const trimmedName = name.trim();
  if (!trimmedName) {
    throw new Error("Page name cannot be empty.");
  }

  page.name = trimmedName;
  page.updatedAt = now();
}

/**
 * Add a bookmark reference to a custom folder page if not already present.
 */
export function addBookmarkToPageInState(
  state: TimberState,
  pageId: string,
  bookmarkId: string
): void {
  const page = state.pages.find((item) => item.id === pageId);
  const bookmarkExists = state.bookmarks.some((item) => item.id === bookmarkId);

  if (!page || page.type !== "custom") {
    throw new Error("Custom page not found.");
  }

  if (!bookmarkExists) {
    throw new Error("Bookmark not found.");
  }

  page.bookmarkIds ??= [];
  if (!page.bookmarkIds.includes(bookmarkId)) {
    page.bookmarkIds.push(bookmarkId);
  }

  page.updatedAt = now();
}

/**
 * Remove a bookmark reference from a custom folder page without deleting the bookmark itself.
 */
export function removeBookmarkFromPageInState(
  state: TimberState,
  pageId: string,
  bookmarkId: string
): void {
  const page = state.pages.find((item) => item.id === pageId);
  if (!page || page.type !== "custom") {
    throw new Error("Custom page not found.");
  }

  page.bookmarkIds = page.bookmarkIds?.filter((id) => id !== bookmarkId);
  page.updatedAt = now();
}

/**
 * Save a custom folder's direct child ordering ("bk:<id>" and "sf:<id>" keys).
 */
export function setFolderChildOrderInState(
  state: TimberState,
  folderId: string,
  order: string[]
): void {
  const page = state.pages.find((item) => item.id === folderId);
  if (!page || page.type !== "custom") {
    throw new Error("Custom page not found.");
  }

  page.childOrder = order;
  page.updatedAt = now();
}

/**
 * Collect a custom folder ID and the IDs of all nested sub-folders at any depth inside it.
 */
function collectFolderSubtreeIds(
  state: TimberState,
  rootPageId: string
): Set<string> {
  const toDelete = new Set<string>([rootPageId]);
  let grew = true;

  while (grew) {
    grew = false;
    for (const candidate of state.pages) {
      if (
        candidate.type === "custom" &&
        candidate.parentId &&
        toDelete.has(candidate.parentId) &&
        !toDelete.has(candidate.id)
      ) {
        toDelete.add(candidate.id);
        grew = true;
      }
    }
  }

  return toDelete;
}

/**
 * Delete a custom folder, all nested sub-folders, and all bookmarks contained inside them.
 */
export function deletePageInState(state: TimberState, pageId: string): void {
  const page = state.pages.find((item) => item.id === pageId);
  if (!page || page.type !== "custom") {
    throw new Error("Only custom pages can be deleted.");
  }

  const toDelete = collectFolderSubtreeIds(state, pageId);
  const bookmarkIdsToDelete = new Set<string>();

  for (const deletedId of toDelete) {
    const deletedPage = state.pages.find((item) => item.id === deletedId);
    for (const id of deletedPage?.bookmarkIds ?? []) {
      bookmarkIdsToDelete.add(id);
    }
  }

  state.bookmarks = state.bookmarks.filter(
    (item) => !bookmarkIdsToDelete.has(item.id)
  );
  state.bookmarkSources = state.bookmarkSources.filter(
    (item) => !bookmarkIdsToDelete.has(item.bookmarkId)
  );
  if (state.rootBookmarkIds) {
    state.rootBookmarkIds = state.rootBookmarkIds.filter(
      (id) => !bookmarkIdsToDelete.has(id)
    );
  }

  state.pages = state.pages.filter((item) => !toDelete.has(item.id));

  // Scrub references to deleted bookmarks from any surviving folders.
  const timestamp = now();
  for (const remaining of state.pages) {
    if (remaining.type === "custom" && remaining.bookmarkIds) {
      const filtered = remaining.bookmarkIds.filter(
        (id) => !bookmarkIdsToDelete.has(id)
      );
      if (filtered.length !== remaining.bookmarkIds.length) {
        remaining.bookmarkIds = filtered;
        remaining.updatedAt = timestamp;
      }
    }
  }

  if (state.activePageId && toDelete.has(state.activePageId)) {
    const fallback = state.pages.find((item) => item.type === "all");
    if (fallback) state.activePageId = fallback.id;
  }
}

/**
 * Return all Bookmark records belonging to the specified "all", "source", or "custom" page.
 */
export function getBookmarksForPageInState(
  state: TimberState,
  pageId: string
): Bookmark[] {
  const page = state.pages.find((item) => item.id === pageId);
  if (!page) {
    throw new Error("Page not found.");
  }

  switch (page.type) {
    case "all":
      return state.bookmarks;

    case "source": {
      if (!page.sourceId) return [];
      const ids = new Set(
        state.bookmarkSources
          .filter((item) => item.sourceId === page.sourceId)
          .map((item) => item.bookmarkId)
      );
      return state.bookmarks.filter((bookmark) => ids.has(bookmark.id));
    }

    case "custom": {
      const ids = new Set(page.bookmarkIds ?? []);
      return state.bookmarks.filter((bookmark) => ids.has(bookmark.id));
    }
  }
}
