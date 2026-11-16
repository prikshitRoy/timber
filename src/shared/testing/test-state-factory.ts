/**
 * Shared test builders for constructing deterministic TimberState, Bookmark, and BookmarkPage records.
 */

import { normalizeBookmarkUrl } from "../bookmarks/bookmark-normalizer.ts";
import {
  TIMBER_SCHEMA_VERSION,
  type Bookmark,
  type BookmarkPage,
  type BrowserKind,
  type TimberState,
} from "../types/timber.ts";

const FIXED_TIMESTAMP = 1_700_000_000_000;

/**
 * Create a clean, deterministic TimberState with one default browser source and an "all" page.
 */
export function createEmptyTestState(
  browserKind: BrowserKind = "brave",
  sourceId = "source-1"
): TimberState {
  return {
    schemaVersion: TIMBER_SCHEMA_VERSION,
    sources: [
      {
        id: sourceId,
        browser: browserKind,
        name: "Brave",
        createdAt: FIXED_TIMESTAMP,
      },
    ],
    bookmarks: [],
    bookmarkSources: [],
    pages: [
      {
        id: "page-all",
        name: "All Bookmarks",
        type: "all",
        createdAt: FIXED_TIMESTAMP,
        updatedAt: FIXED_TIMESTAMP,
      },
    ],
    activePageId: "page-all",
    rootOrder: [],
    rootBookmarkIds: [],
    foldersMigrated: true,
  };
}

/**
 * Build a deterministic Bookmark record for unit tests.
 */
export function createTestBookmark(
  overrides: Partial<Bookmark> & { id: string; url: string }
): Bookmark {
  return {
    id: overrides.id,
    url: overrides.url,
    normalizedUrl:
      overrides.normalizedUrl ?? normalizeBookmarkUrl(overrides.url),
    title: overrides.title ?? overrides.url,
    createdAt: overrides.createdAt ?? FIXED_TIMESTAMP,
    updatedAt: overrides.updatedAt ?? FIXED_TIMESTAMP,
  };
}

/**
 * Build a deterministic custom folder BookmarkPage record for unit tests.
 */
export function createTestFolder(
  overrides: Partial<BookmarkPage> & { id: string; name: string }
): BookmarkPage {
  return {
    id: overrides.id,
    name: overrides.name,
    type: "custom",
    bookmarkIds: overrides.bookmarkIds ?? [],
    parentId: overrides.parentId,
    childOrder: overrides.childOrder,
    createdAt: overrides.createdAt ?? FIXED_TIMESTAMP,
    updatedAt: overrides.updatedAt ?? FIXED_TIMESTAMP,
  };
}
