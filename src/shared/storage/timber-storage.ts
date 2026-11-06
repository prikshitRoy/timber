
import { browser } from "wxt/browser";

import type {
  BrowserKind,
  TimberState,
} from "@/src/shared/types/timber";

const STORAGE_KEY = "timber.state.v2";

export async function loadState(): Promise<TimberState | null> {
  const result = await browser.storage.local.get(STORAGE_KEY);

  return (result[STORAGE_KEY] as TimberState | undefined) ?? null;
}

export async function saveState(state: TimberState): Promise<void> {
  await browser.storage.local.set({
    [STORAGE_KEY]: state,
  });
}

export function createInitialState(
  browserKind: BrowserKind
): TimberState {
  const now = Date.now();

  const sourceId = crypto.randomUUID();
  const allPageId = crypto.randomUUID();
  const sourcePageId = crypto.randomUUID();

  const browserName: Record<BrowserKind, string> = {
    brave: "Brave",
    firefox: "Firefox",
    chromium: "Chromium",
    unknown: "Browser",
  };

  const name = browserName[browserKind];

  return {
    schemaVersion: 2,

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
        name: "All Bookmarks",
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
  };
}
