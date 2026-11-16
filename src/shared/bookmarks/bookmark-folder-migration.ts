/**
 * One-time state migration that materializes custom BookmarkPage folders from legacy BookmarkSource folderPath arrays.
 */

import type { TimberState } from "../types/timber";
import { findOrCreateFolderChainInState, stripBrowserContainer } from "./folder-chain";

/**
 * Walk every BookmarkSource once and file its bookmark into the matching custom BookmarkPage folder chain.
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
