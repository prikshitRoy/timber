import type { Bookmark, BookmarkPage, TimberState } from "../types/timber";
import { computeRootTiles } from "../bookmarks/root-layout";
import { applyStoredOrder } from "../bookmarks/tile-ordering";

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function toSeconds(ms: number): number {
  return Math.floor(ms / 1000);
}

function renderBookmark(bookmark: Bookmark, indent: string): string {
  return `${indent}<DT><A HREF="${escapeHtml(bookmark.url)}" ADD_DATE="${toSeconds(
    bookmark.createdAt
  )}">${escapeHtml(bookmark.title)}</A>\n`;
}

type FolderChild =
  | { kind: "bookmark"; key: string; label: string; bookmark: Bookmark }
  | { kind: "folder"; key: string; label: string; page: BookmarkPage };

function renderFolder(
  page: BookmarkPage,
  state: TimberState,
  bookmarksById: Map<string, Bookmark>,
  indent: string
): string {
  const children: FolderChild[] = [];

  for (const id of page.bookmarkIds ?? []) {
    const bookmark = bookmarksById.get(id);

    if (bookmark) {
      children.push({
        kind: "bookmark",
        key: `bk:${id}`,
        label: bookmark.title,
        bookmark,
      });
    }
  }

  for (const child of state.pages) {
    if (child.type === "custom" && child.parentId === page.id) {
      children.push({
        kind: "folder",
        key: `sf:${child.id}`,
        label: child.name,
        page: child,
      });
    }
  }

  const ordered = applyStoredOrder(children, page.childOrder);
  const inner = `${indent}    `;

  let html = `${indent}<DT><H3 ADD_DATE="${toSeconds(page.createdAt)}">${escapeHtml(
    page.name
  )}</H3>\n`;
  html += `${indent}<DL><p>\n`;

  for (const child of ordered) {
    html +=
      child.kind === "bookmark"
        ? renderBookmark(child.bookmark, inner)
        : renderFolder(child.page, state, bookmarksById, inner);
  }

  html += `${indent}</DL><p>\n`;

  return html;
}

/**
 * Standard "Netscape bookmark file" — the format every major browser
 * can import — laid out in the same custom order Timber shows.
 */
export function exportBookmarksHtml(state: TimberState): string {
  const bookmarksById = new Map(
    state.bookmarks.map((item) => [item.id, item] as const)
  );

  const rootTiles = computeRootTiles({
    pages: state.pages,
    bookmarks: state.bookmarks,
    rootOrder: state.rootOrder,
  });

  let body = "";

  for (const tile of rootTiles) {
    body +=
      tile.kind === "folder"
        ? renderFolder(tile.page, state, bookmarksById, "    ")
        : renderBookmark(tile.bookmark, "    ");
  }

  return [
    "<!DOCTYPE NETSCAPE-Bookmark-file-1>",
    "<!-- This is an automatically generated file by Timber. -->",
    '<META HTTP-EQUIV="Content-Type" CONTENT="text/html; charset=UTF-8">',
    "<TITLE>Bookmarks</TITLE>",
    "<H1>Bookmarks</H1>",
    "<DL><p>",
    body.trimEnd(),
    "</DL><p>",
    "",
  ].join("\n");
}
