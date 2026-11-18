/**
 * React hook that loads Timber's bookmark catalog, listens for background sync events,
 * and computes derived dashboard views.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { browser } from "wxt/browser";
import { bookmarkRepository } from "../../../src/shared/bookmarks/bookmark-repository";
import { hasBookmarkPermission } from "../../../src/shared/bookmarks/bookmark-synchronizer";
import { computeRootTiles } from "../../../src/shared/bookmarks/root-layout";
import {
  TIMBER_MESSAGE_TYPES,
  hasMessageType,
} from "../../../src/shared/messages/runtime-messages";
import type {
  BookmarkPage,
  BookmarkSource,
  BrowserSource,
} from "../../../src/shared/types/timber";
import type { BookmarkSummary, DashboardBookmark } from "../types";

/**
 * Manage the dashboard's persisted catalog state, runtime listeners, and derived tile maps.
 */
export function useDashboardCatalog() {
  const [connected, setConnected] = useState(false);
  const [bookmarks, setBookmarks] = useState<DashboardBookmark[]>([]);
  const [sources, setSources] = useState<BrowserSource[]>([]);
  const [bookmarkSources, setBookmarkSources] = useState<BookmarkSource[]>([]);
  const [folders, setFolders] = useState<BookmarkPage[]>([]);
  const [rootOrder, setRootOrderState] = useState<string[]>([]);
  const [rootBookmarkIds, setRootBookmarkIds] = useState<string[]>([]);
  const [status, setStatus] = useState("Checking bookmark access...");
  const [error, setError] = useState("");
  const [nativeChanged, setNativeChanged] = useState(false);

  /**
   * Reload the full bookmark catalog from storage and recompute per-bookmark browser counts.
   */
  const loadCatalog = useCallback(async () => {
    const state = await bookmarkRepository.getState();
    const sourceCounts = new Map<string, number>();

    for (const occurrence of state.bookmarkSources) {
      sourceCounts.set(
        occurrence.bookmarkId,
        (sourceCounts.get(occurrence.bookmarkId) ?? 0) + 1
      );
    }

    setBookmarks(
      state.bookmarks.map((bookmark) => ({
        ...bookmark,
        sourceCount: sourceCounts.get(bookmark.id) ?? 0,
      }))
    );

    setSources(state.sources);
    setBookmarkSources(state.bookmarkSources);
    setFolders(state.pages.filter((page) => page.type === "custom"));
    setRootOrderState(state.rootOrder ?? []);
    setRootBookmarkIds(state.rootBookmarkIds ?? []);
    setStatus(`${state.bookmarks.length} unique bookmarks`);
  }, []);

  useEffect(() => {
    let isCancelled = false;

    const handleMessage = (message: unknown) => {
      if (!hasMessageType(message)) return;

      if (message.type === TIMBER_MESSAGE_TYPES.BOOKMARKS_CHANGED) {
        setNativeChanged(true);
        return;
      }

      if (message.type === TIMBER_MESSAGE_TYPES.BOOKMARKS_UPDATED) {
        void loadCatalog().catch((loadError) => {
          console.error("Failed to reload bookmark catalog:", loadError);
          if (!isCancelled) {
            setError("Failed to refresh bookmarks.");
          }
        });
      }
    };

    browser.runtime.onMessage.addListener(handleMessage);

    async function initialize() {
      try {
        const permitted = await hasBookmarkPermission();
        if (isCancelled) return;

        setConnected(permitted);

        // Timber's own data (imported backups, manual links) works without native bookmark permission.
        let hasLoaded = false;
        try {
          await loadCatalog();
          hasLoaded = true;
        } catch {
          // Fresh install has no persisted state yet.
        }

        if (!permitted && !hasLoaded) {
          setStatus("Connect your browser bookmarks to get started.");
        }
      } catch (initError) {
        if (!isCancelled) {
          setError(
            initError instanceof Error
              ? initError.message
              : "Failed to load bookmarks."
          );
        }
      }
    }

    void initialize();

    return () => {
      isCancelled = true;
      browser.runtime.onMessage.removeListener(handleMessage);
    };
  }, [loadCatalog]);

  const bookmarksById = useMemo(() => {
    const map = new Map<string, BookmarkSummary>();
    for (const bookmark of bookmarks) {
      map.set(bookmark.id, { title: bookmark.title, url: bookmark.url });
    }
    return map;
  }, [bookmarks]);

  const rootTiles = useMemo(
    () =>
      computeRootTiles({
        pages: folders,
        bookmarks,
        rootOrder,
        rootBookmarkIds,
      }),
    [folders, bookmarks, rootOrder, rootBookmarkIds]
  );

  const hasLocalData = bookmarks.length > 0 || folders.length > 0;

  return {
    connected,
    setConnected,
    bookmarks,
    sources,
    bookmarkSources,
    folders,
    rootBookmarkIds,
    status,
    setStatus,
    error,
    setError,
    nativeChanged,
    setNativeChanged,
    loadCatalog,
    bookmarksById,
    rootTiles,
    hasLocalData,
  };
}
