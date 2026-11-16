
/**
 * Low-level persistence adapter for reading, writing, and initializing
 * TimberState in browser.storage.local.
 */

import { browser } from "wxt/browser";

import { getBrowserDisplayName } from "@/src/shared/browser/browser-info";
import {
  TIMBER_SCHEMA_VERSION,
  type BrowserKind,
  type TimberState,
} from "@/src/shared/types/timber";

// Key under which the entire Timber catalog state is stored in browser.storage.local.
const STORAGE_KEY = "timber.state.v2";

// Default page title for the built-in all-bookmarks view.
const ALL_BOOKMARKS_PAGE_NAME = "All Bookmarks";

/**
 * Load the persisted Timber catalog state from browser.storage.local, or null if not yet initialized.
 */
export async function loadState(): Promise<TimberState | null> {
  const result = await browser.storage.local.get(STORAGE_KEY);

  return (result[STORAGE_KEY] as TimberState | undefined) ?? null;
}

/**
 * Persist the complete Timber catalog state to browser.storage.local.
 */
export async function saveState(state: TimberState): Promise<void> {
  await browser.storage.local.set({
    [STORAGE_KEY]: state,
  });
}

/**
 * Build a fresh initial TimberState seeded with a default source and built-in pages for the current browser.
 */
export function createInitialState(
  browserKind: BrowserKind
): TimberState {
  const now = Date.now();

  const sourceId = crypto.randomUUID();
  const allPageId = crypto.randomUUID();
  const sourcePageId = crypto.randomUUID();

  const name = getBrowserDisplayName(browserKind);

  return {
    schemaVersion: TIMBER_SCHEMA_VERSION,

    sources: [
      {
        id: sourceId,
        browser: browserKind,
        name,
        createdAt: now,
      },
    ],

    bookmarks: [],

    bookmarkSources: [],

    pages: [
      {
        id: allPageId,
        name: ALL_BOOKMARKS_PAGE_NAME,
        type: "all",
        createdAt: now,
        updatedAt: now,
      },
      {
        id: sourcePageId,
        name: `${name} Bookmarks`,
        type: "source",
        sourceId,
        createdAt: now,
        updatedAt: now,
      },
    ],

    activePageId: allPageId,
    rootOrder: [],
    rootBookmarkIds: [],
    foldersMigrated: true,
  };
}
