/**
 * Exports Timber's bookmark catalog and custom folder hierarchy to the standard
 * Netscape Bookmark HTML format understood by all major browsers.
 */

import type { Bookmark, BookmarkPage, TimberState } from "../types/timber";
import { computeRootTiles } from "../bookmarks/root-layout";
import { applyStoredOrder } from "../bookmarks/tile-ordering";

// Milliseconds per second used to convert JS timestamps into Netscape ADD_DATE seconds.
const MS_PER_SECOND = 1000;

// Standard 4-space indentation step for nested HTML bookmark lists.
const INDENT_STEP = "    ";

type FolderChild =
  | { kind: "bookmark"; key: string; label: string; bookmark: Bookmark }
  | { kind: "folder"; key: string; label: string; page: BookmarkPage };

/**
 * Escape HTML special characters so titles and URLs render safely in attributes and text nodes.
 */
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Convert a millisecond Unix timestamp to whole seconds for the Netscape ADD_DATE attribute.
 */
function toSeconds(ms: number): number {
  return Math.floor(ms / MS_PER_SECOND);
}

/**
 * Render a single bookmark as a Netscape `<DT><A ...>` line with the given indentation.
 */
function renderBookmark(bookmark: Bookmark, indent: string): string {
  return `${indent}<DT><A HREF="${escapeHtml(bookmark.url)}" ADD_DATE="${toSeconds(
    bookmark.createdAt
  )}">${escapeHtml(bookmark.title)}</A>\n`;
}

/**
 * Collect and order the direct bookmark and sub-folder children of a custom folder page.
 */
function collectOrderedFolderChildren(
  page: BookmarkPage,
  state: TimberState,
  bookmarksById: Map<string, Bookmark>
): FolderChild[] {
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

  return applyStoredOrder(children, page.childOrder);
}

/**
 * Recursively render a folder and all of its ordered children as a Netscape `<DL>` block.
 */
function renderFolder(
  page: BookmarkPage,
  state: TimberState,
  bookmarksById: Map<string, Bookmark>,
  indent: string
): string {
  const ordered = collectOrderedFolderChildren(page, state, bookmarksById);
  const inner = `${indent}${INDENT_STEP}`;

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
 * Serialize TimberState into a complete Netscape Bookmark HTML document preserving custom tile order.
 */
export function exportBookmarksHtml(state: TimberState): string {
  const bookmarksById = new Map(
    state.bookmarks.map((item) => [item.id, item] as const)
  );

  const rootTiles = computeRootTiles({
    pages: state.pages,
    bookmarks: state.bookmarks,
    rootOrder: state.rootOrder,
    rootBookmarkIds: state.rootBookmarkIds,
  });

  let body = "";

  for (const tile of rootTiles) {
    body +=
      tile.kind === "folder"
        ? renderFolder(tile.page, state, bookmarksById, INDENT_STEP)
        : renderBookmark(tile.bookmark, INDENT_STEP);
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
