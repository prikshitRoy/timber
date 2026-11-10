import type { BookmarkPage, TimberState } from "../types/timber";

const now = () => Date.now();
const createId = () => crypto.randomUUID();

type FolderChainState = Pick<TimberState, "pages">;

/**
 * A browser's folderPath always begins with the top-level container
 * ("Bookmarks bar", "Other bookmarks", "Mobile bookmarks") — Timber
 * treats that container as transparent, so folders start one level
 * in and the browser's own organizational wrapper never becomes a
 * visible Timber folder itself.
 */
export function stripBrowserContainer(folderPath: string[]): string[] {
  return folderPath.slice(1);
}

/**
 * Find (or create) the chain of nested folders described by
 * folderPath, matching purely by name + parent — never by which
 * browser a bookmark came from, so the same folder name under the
 * same parent in two different browsers always resolves to one
 * shared Timber folder. Returns the final folder in the chain, or
 * null for an empty path (the bookmark belongs at the root).
 */
export function findOrCreateFolderChainInState(
  state: FolderChainState,
  folderPath: string[]
): BookmarkPage | null {
  let parentId: string | undefined;
  let current: BookmarkPage | null = null;

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
