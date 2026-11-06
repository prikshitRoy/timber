import type {
  TimberState,
  BrowserSource,
  BookmarkPage,
  Bookmark,
} from "../types/timber";
import { buildNativeFolderTree, type NativeFolderNode } from "./bookmark-folder-tree";

export interface RootTimberFolderTile {
  kind: "timber-folder";
  key: string;
  page: BookmarkPage;
}

export interface RootNativeFolderTile {
  kind: "native-folder";
  key: string;
  source: BrowserSource;
  folderName: string;
  node: NativeFolderNode;
}

export interface RootLinkTile {
  kind: "link";
  key: string;
  bookmark: Bookmark;
}

export type RootTile = RootTimberFolderTile | RootNativeFolderTile | RootLinkTile;

type RootLayoutState = Pick<
  TimberState,
  "pages" | "sources" | "bookmarkSources" | "bookmarks" | "rootOrder"
>;

function tileLabel(tile: RootTile): string {
  if (tile.kind === "timber-folder") return tile.page.name;
  if (tile.kind === "native-folder") return tile.folderName;
  return tile.bookmark.title;
}

/**
 * Build every root-level tile that currently exists — Timber
 * folders, top-level native folders per source, and standalone
 * root-level links (native bookmarks with no folder, or bookmarks
 * added manually via "+ Link") — then order them using the
 * persisted rootOrder, appending anything newly discovered at the
 * end (alphabetically, for a stable default).
 */
export function computeRootTiles(state: RootLayoutState): RootTile[] {
  const tiles = new Map<string, RootTile>();

  for (const page of state.pages) {
    if (page.type !== "custom") continue;
    if (page.parentId) continue; // Flat layout only.

    const key = `tf:${page.id}`;
    tiles.set(key, { kind: "timber-folder", key, page });
  }

  const standaloneLinkIds = new Set<string>();

    for (const source of state.sources) {
    const tree = buildNativeFolderTree(state.bookmarkSources, source.id);

    // The browser's own top-level containers ("Bookmarks bar",
    // "Other bookmarks", "Mobile bookmarks") are just organizational
    // wrappers — skip rendering them as tiles and surface their
    // contents directly at the root instead.
    for (const container of tree.children.values()) {
      for (const [folderName, node] of container.children) {
        const key = `nf:${source.id}:${container.name}:${folderName}`;
        tiles.set(key, { kind: "native-folder", key, source, folderName, node });
      }

      for (const bookmarkId of container.bookmarkIds) {
        standaloneLinkIds.add(bookmarkId);
      }
    }

    // Edge case: a bookmark sitting at the browser root with no
    // container folder at all. Rare, but keep it visible.
    for (const bookmarkId of tree.bookmarkIds) {
      standaloneLinkIds.add(bookmarkId);
    }
  }

  const linkedElsewhere = new Set(
    state.bookmarkSources.map((item) => item.bookmarkId)
  );

  for (const bookmark of state.bookmarks) {
    // Standalone = a root-level native bookmark, or one with no
    // browser-source occurrence at all (manually added).
    if (standaloneLinkIds.has(bookmark.id) || !linkedElsewhere.has(bookmark.id)) {
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
