import { browser } from "wxt/browser";
import { defineBackground } from "wxt/utils/define-background";

import {
  hasBookmarkPermission,
  computeCurrentBrowserSyncDiff,
  applyCurrentBrowserSyncSelection,
} from "../src/shared/bookmarks/bookmark-synchronizer";

import type {
  BookmarkSyncSelection,
  NativeBookmarkRecord,
} from "../src/shared/bookmarks/bookmark.types";

export default defineBackground(() => {
  let listenersRegistered = false;

  /**
   * Native bookmark events now only notify — Timber never
   * auto-applies browser changes. The user reviews and applies
   * them via the Scan action in the UI.
   */
  async function registerBookmarkListeners(): Promise<void> {
    if (listenersRegistered) return;

    const permitted = await hasBookmarkPermission();
    if (!permitted) return;

    const bookmarks = browser.bookmarks;

    const handleBookmarkChange = () => {
      void browser.runtime
        .sendMessage({ type: "TIMBER_BOOKMARKS_CHANGED" })
        .catch(() => {
          // No open Timber page to notify.
        });
    };

    bookmarks.onCreated.addListener(handleBookmarkChange);
    bookmarks.onChanged.addListener(handleBookmarkChange);
    bookmarks.onMoved.addListener(handleBookmarkChange);
    bookmarks.onRemoved.addListener(handleBookmarkChange);
    bookmarks.onChildrenReordered?.addListener(handleBookmarkChange);

    listenersRegistered = true;
  }

  void registerBookmarkListeners().catch(console.error);

  browser.runtime.onMessage.addListener((message: unknown) => {
    if (
      typeof message !== "object" ||
      message === null ||
      !("type" in message)
    ) {
      return undefined;
    }

    if (message.type === "TIMBER_SYNC_BOOKMARKS") {
      return (async () => {
        await registerBookmarkListeners();
        return computeCurrentBrowserSyncDiff();
      })();
    }

    if (message.type === "TIMBER_APPLY_SYNC_SELECTION") {
      const { sourceId, nativeBookmarks, selection } = message as unknown as {
        sourceId: string;
        nativeBookmarks: NativeBookmarkRecord[];
        selection: BookmarkSyncSelection;
      };

      return (async () => {
        const summary = await applyCurrentBrowserSyncSelection(
          sourceId,
          nativeBookmarks,
          selection
        );

        try {
          await browser.runtime.sendMessage({
            type: "TIMBER_BOOKMARKS_UPDATED",
            summary,
          });
        } catch {
          // No open Timber page to notify.
        }

        return summary;
      })();
    }

    return undefined;
  });
});
