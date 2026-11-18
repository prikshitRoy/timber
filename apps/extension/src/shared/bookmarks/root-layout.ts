/**
 * Computes the ordered list of top-level folder and link tiles displayed on the root grid.
 */

import type { TimberState, BookmarkPage, Bookmark } from "../types/timber.ts";
import { applyStoredOrder, type OrderableItem } from "./tile-ordering.ts";

// Key prefix identifying a top-level folder tile in rootOrder.
export const ROOT_FOLDER_KEY_PREFIX = "tf:";

// Key prefix identifying a top-level bookmark link tile in rootOrder.
export const ROOT_LINK_KEY_PREFIX = "lk:";

// Top-level folder tile on the root dashboard grid.
export interface RootFolderTile {
  kind: "folder";
  key: string;
  page: BookmarkPage;
}

// Top-level standalone bookmark link tile on the root dashboard grid.
export interface RootLinkTile {
  kind: "link";
  key: string;
  bookmark: Bookmark;
}

export type RootTile = RootFolderTile | RootLinkTile;

type RootLayoutState = Pick<
  TimberState,
  "pages" | "bookmarks" | "rootOrder" | "rootBookmarkIds"
>;

/**
 * Return the human-readable display label for a root folder or link tile.
 */
export function tileLabel(tile: RootTile): string {
  return tile.kind === "folder" ? tile.page.name : tile.bookmark.title;
}

/**
 * Build the ordered list of top-level folders and root-visible bookmarks for the dashboard grid.
 */
export function computeRootTiles(state: RootLayoutState): RootTile[] {
  const tiles = new Map<string, RootTile>();

  // Include only top-level custom folders (those without a parentId).
  for (const page of state.pages) {
    if (page.type !== "custom") continue;
    if (page.parentId) continue;

    const key = `${ROOT_FOLDER_KEY_PREFIX}${page.id}`;
    tiles.set(key, { kind: "folder", key, page });
  }

  const foldered = new Set<string>();

  for (const page of state.pages) {
    if (page.type !== "custom") continue;
    for (const id of page.bookmarkIds ?? []) {
      foldered.add(id);
    }
  }

  // Show bookmarks that are unfoldered OR explicitly added to the root grid.
  const rootBookmarkIds = new Set<string>(state.rootBookmarkIds ?? []);

  for (const bookmark of state.bookmarks) {
    if (!foldered.has(bookmark.id) || rootBookmarkIds.has(bookmark.id)) {
      const key = `${ROOT_LINK_KEY_PREFIX}${bookmark.id}`;
      tiles.set(key, { kind: "link", key, bookmark });
    }
  }

  const items = Array.from(tiles.values()).map((tile) => ({
    key: tile.key,
    label: tileLabel(tile),
    tile,
  }));

  const ordered: (OrderableItem & { tile: RootTile })[] = applyStoredOrder(
    items,
    state.rootOrder
  );

  return ordered.map((item) => item.tile);
}
