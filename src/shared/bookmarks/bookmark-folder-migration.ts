import type { TimberState } from "../types/timber";
import { findOrCreateFolderChainInState, stripBrowserContainer } from "./folder-chain";

/**
 * One-time migration: before folders were unified, a folder
 * reconstructed from the browser wasn't a real entity — it was
 * computed on the fly, every render, by grouping bookmarks according
 * to the folderPath string stored on each BookmarkSource. This walks
 * every such occurrence once, materializes the equivalent BookmarkPage
 * chain (merging by name across browsers, same as live Scan placement
 * does), and files that bookmark into it — so nothing already
 * organized moves or disappears when this ships.
 */
export function migrateFoldersFromPaths(state: TimberState): void {
  for (const occurrence of state.bookmarkSources) {
    const path = stripBrowserContainer(occurrence.folderPath ?? []);
    if (path.length === 0) continue;

    const folder = findOrCreateFolderChainInState(state, path);
    if (!folder) continue;

    folder.bookmarkIds ??= [];

    if (!folder.bookmarkIds.includes(occurrence.bookmarkId)) {
      folder.bookmarkIds.push(occurrence.bookmarkId);
    }
  }
}
