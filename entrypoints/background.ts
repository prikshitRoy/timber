import { browser } from "wxt/browser";
import { defineBackground } from "wxt/utils/define-background";

import {
  hasBookmarkPermission,
  syncCurrentBrowserBookmarks,
} from "../src/shared/bookmarks/bookmark-synchronizer";

import type { BookmarkSyncSummary } from
  "../src/shared/bookmarks/bookmark.types";

export default defineBackground(() => {
  let listenersRegistered = false;

  let currentSync: Promise<BookmarkSyncSummary> | null = null;
  let syncRequestedAgain = false;

  /**
   * Run synchronizations sequentially
   *
   * If another bookmark event arrives during synchronization,
   * request one more pass instead of starting concurrent writes.
   */
  async function synchronize(): Promise<BookmarkSyncSummary> {
    if (currentSync) {
      syncRequestedAgain = true;
      return currentSync;
    }

    currentSync = (async () => {
      let result: BookmarkSyncSummary;

      do {
        syncRequestedAgain = false;

        result = await syncCurrentBrowserBookmarks();
      } while (syncRequestedAgain);

      return result;
    })();

    try {
      return await currentSync;
    } finally {
      currentSync = null;
    }
  }

  /**
   * Register native bookmark events after permission is granted
   */
  async function registerBookmarkListeners(): Promise<void> {
    if (listenersRegistered) return;

    const permitted = await hasBookmarkPermission();

    if (!permitted) return;

    const bookmarks = browser.bookmarks;

    const handleBookmarkChange = () => {
      void synchronize()
        .then(async (summary) => {
          try {
            await browser.runtime.sendMessage({
              type: "TIMBER_BOOKMARKS_UPDATED",
              summary,
            });
          } catch {
            // No open Timber page to notify.
          }
        })
        .catch((error) => {
          console.error(
            "Timber bookmark synchronization failed:",
            error
          );
        });
    };

    bookmarks.onCreated.addListener(handleBookmarkChange);
    bookmarks.onChanged.addListener(handleBookmarkChange);
    bookmarks.onMoved.addListener(handleBookmarkChange);
    bookmarks.onRemoved.addListener(handleBookmarkChange);

    bookmarks.onChildrenReordered?.addListener(handleBookmarkChange);

    listenersRegistered = true;
  }

  // Register immediately when the permission already exists
  void registerBookmarkListeners().catch(console.error);

  // Listen for requests from Timber's New Tab application
  browser.runtime.onMessage.addListener((message: unknown) => {
    if (
      typeof message !== "object" ||
      message === null ||
      !("type" in message) ||
      message.type !== "TIMBER_SYNC_BOOKMARKS"
    ) {
      return undefined;
    }

    return (async () => {
      await registerBookmarkListeners();

      return synchronize();
    })();
  });
});
