/**
 * React hook for connecting browser bookmark permissions, scanning for diffs,
 * and applying user-approved native bookmark additions.
 */

import { useState } from "react";
import { browser } from "wxt/browser";
import type { BookmarkSyncSelection } from "@timber/core";
import { requestBookmarkPermission } from "../../../src/shared/bookmarks/bookmark-synchronizer";
import {
  TIMBER_MESSAGE_TYPES,
  type TimberSyncBookmarksResponse,
} from "../../../src/shared/messages/runtime-messages";
import type { PendingSyncState } from "../types";

interface UseBookmarkSyncParams {
  setConnected: (connected: boolean) => void;
  setNativeChanged: (changed: boolean) => void;
  setStatus: (status: string) => void;
  setError: (error: string) => void;
  loadCatalog: () => Promise<void>;
}

/**
 * Manage browser permission requests, native bookmark scans, and sync diff application.
 */
export function useBookmarkSync({
  setConnected,
  setNativeChanged,
  setStatus,
  setError,
  loadCatalog,
}: UseBookmarkSyncParams) {
  const [loading, setLoading] = useState(false);
  const [pendingSync, setPendingSync] = useState<PendingSyncState | null>(null);

  /**
   * Scan the current browser's bookmarks and open the review modal if new bookmarks exist.
   */
  async function handleScan() {
    try {
      setLoading(true);
      setError("");

      const result = (await browser.runtime.sendMessage({
        type: TIMBER_MESSAGE_TYPES.SYNC_BOOKMARKS,
      })) as TimberSyncBookmarksResponse;

      setNativeChanged(false);

      if (result.diff.additions.length === 0) {
        setStatus("Timber already has all your bookmarks.");
        await loadCatalog();
        return;
      }

      setPendingSync(result);
    } catch (error) {
      setError(error instanceof Error ? error.message : "Scan failed.");
    } finally {
      setLoading(false);
    }
  }

  /**
   * Request optional browser bookmark permission and trigger an initial scan when granted.
   */
  async function handleConnect() {
    try {
      setLoading(true);
      setError("");

      const granted = await requestBookmarkPermission();
      if (!granted) {
        setStatus("Bookmark permission was not granted.");
        return;
      }

      setConnected(true);
      await handleScan();
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "Failed to connect bookmarks."
      );
    } finally {
      setLoading(false);
    }
  }

  /**
   * Send the user's selected native bookmark additions to the background script and refresh the catalog.
   */
  async function handleApplySync(selection: BookmarkSyncSelection) {
    if (!pendingSync) return;

    try {
      setLoading(true);

      await browser.runtime.sendMessage({
        type: TIMBER_MESSAGE_TYPES.APPLY_SYNC_SELECTION,
        sourceId: pendingSync.sourceId,
        nativeBookmarks: pendingSync.nativeBookmarks,
        selection,
      });

      await loadCatalog();
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "Failed to apply changes."
      );
    } finally {
      setPendingSync(null);
      setLoading(false);
    }
  }

  return {
    loading,
    pendingSync,
    clearPendingSync: () => setPendingSync(null),
    handleConnect,
    handleScan,
    handleApplySync,
  };
}
