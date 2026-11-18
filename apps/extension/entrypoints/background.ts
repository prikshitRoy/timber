/**
 * Extension background service worker that listens for native browser bookmark events
 * and handles runtime sync requests from the New Tab dashboard.
 */

import { browser } from "wxt/browser";
import { defineBackground } from "wxt/utils/define-background";
import {
  applyCurrentBrowserSyncSelection,
  computeCurrentBrowserSyncDiff,
  hasBookmarkPermission,
} from "../src/shared/bookmarks/bookmark-synchronizer";
import {
  TIMBER_MESSAGE_TYPES,
  hasMessageType,
  isApplySyncSelectionMessage,
} from "../src/shared/messages/runtime-messages";

export default defineBackground(() => {
  let areListenersRegistered = false;

  /**
   * Broadcast a notification to any open Timber dashboard tab without failing if none is open.
   */
  async function notifyDashboard(payload: Record<string, unknown>): Promise<void> {
    try {
      await browser.runtime.sendMessage(payload);
    } catch {
      // No open Timber dashboard tab is listening right now.
    }
  }

  /**
   * Register native browser bookmark event listeners once bookmark permission has been granted.
   */
  async function registerBookmarkListeners(): Promise<void> {
    if (areListenersRegistered) return;

    const isPermitted = await hasBookmarkPermission();
    if (!isPermitted) return;

    const bookmarks = browser.bookmarks;

    // Native bookmark events only notify the UI; the user reviews changes via the Scan action.
    const handleBookmarkChange = () => {
      void notifyDashboard({ type: TIMBER_MESSAGE_TYPES.BOOKMARKS_CHANGED });
    };

    bookmarks.onCreated.addListener(handleBookmarkChange);
    bookmarks.onChanged.addListener(handleBookmarkChange);
    bookmarks.onMoved.addListener(handleBookmarkChange);
    bookmarks.onRemoved.addListener(handleBookmarkChange);
    bookmarks.onChildrenReordered?.addListener(handleBookmarkChange);

    areListenersRegistered = true;
  }

  void registerBookmarkListeners().catch(console.error);

  browser.runtime.onMessage.addListener((message: unknown) => {
    if (!hasMessageType(message)) {
      return undefined;
    }

    if (message.type === TIMBER_MESSAGE_TYPES.SYNC_BOOKMARKS) {
      return (async () => {
        await registerBookmarkListeners();
        return computeCurrentBrowserSyncDiff();
      })();
    }

    if (isApplySyncSelectionMessage(message)) {
      return (async () => {
        const summary = await applyCurrentBrowserSyncSelection(
          message.sourceId,
          message.nativeBookmarks,
          message.selection
        );

        await notifyDashboard({
          type: TIMBER_MESSAGE_TYPES.BOOKMARKS_UPDATED,
          summary,
        });

        return summary;
      })();
    }

    return undefined;
  });
});
