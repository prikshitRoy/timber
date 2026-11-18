/**
 * Pure helpers for resolving and creating nested Timber folder chains from browser folder paths.
 */

import type { BookmarkPage, TimberState } from "../types/timber.ts";

const now = () => Date.now();
const createId = () => crypto.randomUUID();

type FolderChainState = Pick<TimberState, "pages">;

/**
 * Strip the top-level browser container ("Bookmarks bar", "Other bookmarks", etc.) from a native path.
 */
export function stripBrowserContainer(folderPath: string[]): string[] {
  return folderPath.slice(1);
}

/**
 * Find an existing chain of nested custom folders matching `folderPath` by name and parent without creating any.
 */
export function findFolderChainInState(
  state: FolderChainState,
  folderPath: string[]
): BookmarkPage | null {
  let parentId: string | undefined;
  let current: BookmarkPage | null = null;

  for (const rawName of folderPath) {
    const name = rawName.trim();
    if (!name) continue;

    const folder = state.pages.find(
      (page) =>
        page.type === "custom" &&
        page.parentId === parentId &&
        page.name === name
    );

    if (!folder) {
      return null;
    }

    parentId = folder.id;
    current = folder;
  }

  return current;
}

/**
 * Find or create a chain of nested custom folders matching `folderPath` by name and parent.
 */
export function findOrCreateFolderChainInState(
  state: FolderChainState,
  folderPath: string[]
): BookmarkPage | null {
  let parentId: string | undefined;
  let current: BookmarkPage | null = null;

  // Match purely by name + parentId so identical folder paths across different browsers merge cleanly.
  for (const rawName of folderPath) {
    const name = rawName.trim();
    if (!name) continue;

    let folder = state.pages.find(
      (page) =>
        page.type === "custom" &&
        page.parentId === parentId &&
        page.name === name
    );

    if (!folder) {
      folder = {
        id: createId(),
        name,
        type: "custom",
        bookmarkIds: [],
        parentId,
        createdAt: now(),
        updatedAt: now(),
      };

      state.pages.push(folder);
    }

    parentId = folder.id;
    current = folder;
  }

  return current;
}
