import type { TimberState, BookmarkPage, Bookmark } from "../types/timber";

export interface RootFolderTile {
  kind: "folder";
  key: string;
  page: BookmarkPage;
}

export interface RootLinkTile {
  kind: "link";
  key: string;
  bookmark: Bookmark;
}

export type RootTile = RootFolderTile | RootLinkTile;

type RootLayoutState = Pick<TimberState, "pages" | "bookmarks" | "rootOrder">;

function tileLabel(tile: RootTile): string {
  return tile.kind === "folder" ? tile.page.name : tile.bookmark.title;
}

/**
 * Build every root-level tile — top-level Timber folders and
 * standalone links (bookmarks not filed into any folder) — then
 * order them using the persisted rootOrder, appending anything newly
 * discovered at the end (alphabetically, for a stable default).
 */
export function computeRootTiles(state: RootLayoutState): RootTile[] {
  const tiles = new Map<string, RootTile>();

  for (const page of state.pages) {
    if (page.type !== "custom") continue;
    if (page.parentId) continue; // Only top-level folders sit at root.

    const key = `tf:${page.id}`;
    tiles.set(key, { kind: "folder", key, page });
  }

  const foldered = new Set<string>();

  for (const page of state.pages) {
    if (page.type !== "custom") continue;
    for (const id of page.bookmarkIds ?? []) {
      foldered.add(id);
    }
  }

  for (const bookmark of state.bookmarks) {
    if (!foldered.has(bookmark.id)) {
      const key = `lk:${bookmark.id}`;
      tiles.set(key, { kind: "link", key, bookmark });
    }
  }

  const storedOrder = state.rootOrder ?? [];
  const ordered: RootTile[] = [];
  const seen = new Set<string>();

  for (const key of storedOrder) {
    const tile = tiles.get(key);
    if (tile) {
      ordered.push(tile);
      seen.add(key);
    }
  }

  const remaining = Array.from(tiles.values())
    .filter((tile) => !seen.has(tile.key))
    .sort((a, b) => tileLabel(a).localeCompare(tileLabel(b)));

  ordered.push(...remaining);

  return ordered;
}
