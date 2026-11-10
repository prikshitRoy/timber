import type { TimberState, BookmarkPage, Bookmark } from "../types/timber";
import { applyStoredOrder, type OrderableItem } from "./tile-ordering";

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

export function tileLabel(tile: RootTile): string {
  return tile.kind === "folder" ? tile.page.name : tile.bookmark.title;
}

export function computeRootTiles(state: RootLayoutState): RootTile[] {
  const tiles = new Map<string, RootTile>();

  for (const page of state.pages) {
    if (page.type !== "custom") continue;
    if (page.parentId) continue;

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
