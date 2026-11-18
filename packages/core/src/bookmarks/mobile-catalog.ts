/**
 * Pure helper functions for mobile catalog initialization, JSON backup import (merge/replace),
 * search filtering, and ordered folder child resolution.
 */

import {
  mergeBackupIntoState,
  parseBackup,
} from "../backup/timber-backup.ts";
import {
  TIMBER_SCHEMA_VERSION,
  type Bookmark,
  type BookmarkPage,
  type TimberState,
} from "../types/timber.ts";
import { applyStoredOrder } from "./tile-ordering.ts";

// Supported JSON backup import modes in the mobile app.
export type BackupImportMode = "replace" | "merge";

// Result returned after applying a JSON backup string to the mobile catalog state.
export interface MobileImportResult {
  nextState: TimberState;
  statusMessage: string;
}

// Discriminated union representing an ordered direct child inside a custom folder.
export type OrderedFolderChild =
  | { kind: "folder"; key: string; label: string; folder: BookmarkPage }
  | { kind: "bookmark"; key: string; label: string; bookmark: Bookmark };

/**
 * Create a clean, valid initial TimberState for fresh mobile installs before merging backups.
 */
export function createEmptyMobileState(nowMs: number = Date.now()): TimberState {
  const allPageId = crypto.randomUUID();

  return {
    schemaVersion: TIMBER_SCHEMA_VERSION,
    sources: [],
    bookmarks: [],
    bookmarkSources: [],
    pages: [
      {
        id: allPageId,
        name: "All Bookmarks",
        type: "all",
        createdAt: nowMs,
        updatedAt: nowMs,
      },
    ],
    activePageId: allPageId,
    rootOrder: [],
    rootBookmarkIds: [],
    foldersMigrated: true,
  };
}

/**
 * Parse a Timber JSON backup text and apply it to `currentState` in either "replace" or "merge" mode.
 */
export function applyBackupImportToState(
  currentState: TimberState | null,
  jsonText: string,
  mode: BackupImportMode
): MobileImportResult {
  const { state: imported, skippedBookmarks } = parseBackup(jsonText);
  const skippedSuffix =
    skippedBookmarks > 0
      ? ` (${skippedBookmarks} invalid link${skippedBookmarks === 1 ? "" : "s"} skipped)`
      : "";

  if (mode === "replace" || !currentState) {
    return {
      nextState: imported,
      statusMessage: `Loaded ${imported.bookmarks.length} bookmark${
        imported.bookmarks.length === 1 ? "" : "s"
      }${skippedSuffix}.`,
    };
  }

  const target: TimberState = structuredClone(currentState);
  const summary = mergeBackupIntoState(target, imported);

  return {
    nextState: target,
    statusMessage: `Merged ${summary.bookmarksAdded} new bookmark${
      summary.bookmarksAdded === 1 ? "" : "s"
    } and ${summary.foldersAdded} new folder${
      summary.foldersAdded === 1 ? "" : "s"
    }${skippedSuffix}.`,
  };
}

/**
 * Filter bookmarks by a case-insensitive title or URL search query.
 */
export function filterBookmarksByQuery(
  bookmarks: Bookmark[],
  query: string
): Bookmark[] {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return [];

  return bookmarks.filter(
    (item) =>
      item.title.toLowerCase().includes(normalized) ||
      item.url.toLowerCase().includes(normalized)
  );
}

/**
 * Resolve the ordered direct children (sub-folders and bookmarks) of a custom folder page.
 */
export function getOrderedFolderChildren(
  folder: BookmarkPage,
  allFolders: BookmarkPage[],
  bookmarksById: Map<string, Bookmark>
): OrderedFolderChild[] {
  const subFolders: OrderedFolderChild[] = allFolders
    .filter((item) => item.type === "custom" && item.parentId === folder.id)
    .map((subFolder) => ({
      kind: "folder",
      key: `sf:${subFolder.id}`,
      label: subFolder.name,
      folder: subFolder,
    }));

  const bookmarkItems: OrderedFolderChild[] = (folder.bookmarkIds ?? [])
    .map((id): OrderedFolderChild | null => {
      const bookmark = bookmarksById.get(id);
      if (!bookmark) return null;
      return {
        kind: "bookmark",
        key: `bk:${bookmark.id}`,
        label: bookmark.title,
        bookmark,
      };
    })
    .filter((item): item is OrderedFolderChild => item !== null);

  return applyStoredOrder([...bookmarkItems, ...subFolders], folder.childOrder);
}
