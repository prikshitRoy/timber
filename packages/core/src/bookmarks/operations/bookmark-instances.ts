/**
 * Pure helpers for counting bookmark instances across root and folders and deleting a single instance.
 */

import type { BookmarkPage, TimberState } from "../../types/timber.ts";
import { ROOT_LINK_KEY_PREFIX } from "../root-layout.ts";

// Identifies a specific placement of a bookmark on the root grid or inside a custom folder.
export type BookmarkInstanceTarget =
  | { kind: "root" }
  | { kind: "folder"; folderId: string };

/**
 * Count how many instances of `bookmarkId` exist across custom folders and the root grid.
 */
export function countBookmarkInstances(
  bookmarkId: string,
  pages: BookmarkPage[],
  rootBookmarkIds: string[] | undefined
): number {
  let folderCount = 0;

  for (const page of pages) {
    if (page.type === "custom" && page.bookmarkIds?.includes(bookmarkId)) {
      folderCount++;
    }
  }

  // An unfoldered bookmark appears once on the root grid by default.
  if (folderCount === 0) {
    return 1;
  }

  const isPinnedToRoot = Boolean(rootBookmarkIds?.includes(bookmarkId));
  return folderCount + (isPinnedToRoot ? 1 : 0);
}

/**
 * Count how many instances of `bookmarkId` exist in the given `TimberState`.
 */
export function countBookmarkInstancesInState(
  state: TimberState,
  bookmarkId: string
): number {
  const exists = state.bookmarks.some((item) => item.id === bookmarkId);
  if (!exists) return 0;

  return countBookmarkInstances(bookmarkId, state.pages, state.rootBookmarkIds);
}

/**
 * Remove the canonical bookmark and its native source associations when no instances remain.
 */
function purgeBookmarkRecordFromState(
  state: TimberState,
  bookmarkId: string
): void {
  state.bookmarks = state.bookmarks.filter((item) => item.id !== bookmarkId);
  state.bookmarkSources = state.bookmarkSources.filter(
    (item) => item.bookmarkId !== bookmarkId
  );
}

/**
 * Check whether `bookmarkId` is still referenced by at least one custom folder in `state`.
 */
function isBookmarkInAnyCustomFolder(
  state: TimberState,
  bookmarkId: string
): boolean {
  return state.pages.some(
    (page) =>
      page.type === "custom" && Boolean(page.bookmarkIds?.includes(bookmarkId))
  );
}

/**
 * Remove only the specified root or folder instance of `bookmarkId` without affecting other copies.
 */
export function deleteBookmarkInstanceInState(
  state: TimberState,
  bookmarkId: string,
  target: BookmarkInstanceTarget
): void {
  if (target.kind === "root") {
    if (state.rootBookmarkIds) {
      state.rootBookmarkIds = state.rootBookmarkIds.filter(
        (id) => id !== bookmarkId
      );
    }

    if (state.rootOrder) {
      const rootTileKey = `${ROOT_LINK_KEY_PREFIX}${bookmarkId}`;
      state.rootOrder = state.rootOrder.filter((key) => key !== rootTileKey);
    }

    // If the bookmark does not live in any folder either, remove the canonical record completely.
    if (!isBookmarkInAnyCustomFolder(state, bookmarkId)) {
      purgeBookmarkRecordFromState(state, bookmarkId);
    }
    return;
  }

  const folder = state.pages.find(
    (page) => page.id === target.folderId && page.type === "custom"
  );
  if (!folder) {
    throw new Error("Custom page not found.");
  }

  folder.bookmarkIds = folder.bookmarkIds?.filter((id) => id !== bookmarkId);
  if (folder.childOrder) {
    const folderChildKey = `bk:${bookmarkId}`;
    folder.childOrder = folder.childOrder.filter(
      (key) => key !== folderChildKey
    );
  }
  folder.updatedAt = Date.now();

  const stillInFolder = isBookmarkInAnyCustomFolder(state, bookmarkId);
  const stillAtRoot = Boolean(state.rootBookmarkIds?.includes(bookmarkId));

  // If no copies remain in any other folder or on the root grid, remove the canonical record.
  if (!stillInFolder && !stillAtRoot) {
    purgeBookmarkRecordFromState(state, bookmarkId);
  }
}
