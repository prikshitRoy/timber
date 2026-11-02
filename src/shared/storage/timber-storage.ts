import { browser } from "wxt/browser";

import type {
  BrowserKind,
  TimberState,
} from "../types/timber";

const STORAGE_KEY = "timber.state.v1";

export async function loadTimberState(
  browserKind: BrowserKind
): Promise<TimberState> {
  const result = await browser.storage.local.get(STORAGE_KEY);

  const existing = result[STORAGE_KEY] as TimberState | undefined;

  if (existing) {
    if (existing.schemaVersion !== 1) {
      throw new Error("Unsupported Timber storage version.");
    }

    return existing;
  }

  const now = Date.now();

  const sourceId = crypto.randomUUID();
  const pageId = crypto.randomUUID();

  const browserName = {
    brave: "Brave",
    firefox: "Firefox",
    chromium: "Chromium",
    unknown: "Browser",
  }[browserKind];

  const initialState: TimberState = {
    schemaVersion: 1,

    source: {
      id: sourceId,
      browser: browserKind,
      name: browserName,
    },

    pages: [
      {
        id: pageId,
        name: `${browserName} Bookmarks`,
        bookmarkIds: null,
        sourceId,
        createdAt: now,
        updatedAt: now,
      },
    ],

    activePageId: pageId,
  };

  await browser.storage.local.set({
    [STORAGE_KEY]: initialState,
  });

  return initialState;
}

export async function saveTimberState(
  state: TimberState
): Promise<void> {
  await browser.storage.local.set({
    [STORAGE_KEY]: state,
  });
}