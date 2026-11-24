/**
 * React hook managing the mobile bookmark catalog state, JSON file imports, and search filtering.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  applyBackupImportToState,
  computeRootTiles,
  filterBookmarksByQuery,
  type BackupImportMode,
  type Bookmark,
  type BookmarkPage,
  type RootTile,
  type TimberState,
} from "@timber/core";
import {
  clearMobileState,
  loadMobileState,
  saveMobileState,
} from "../storage/bookmark-storage";

// Duration in milliseconds before transient status feedback auto-dismisses.
const STATUS_AUTO_DISMISS_MS = 4000;

/**
 * Provide reactive catalog state, search results, and JSON backup import actions for the Android UI.
 */
export function useTimberCatalog() {
  const [state, setState] = useState<TimberState | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [query, setQuery] = useState("");
  const [importMode, setImportMode] = useState<BackupImportMode>("replace");
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const stored = loadMobileState();
    setState(stored);
    setIsLoaded(true);
  }, []);

  // Automatically clear transient status messages while leaving errors visible until dismissed.
  useEffect(() => {
    if (!status) return;

    const timerId = window.setTimeout(() => {
      setStatus("");
    }, STATUS_AUTO_DISMISS_MS);

    return () => window.clearTimeout(timerId);
  }, [status]);

  /**
   * Read an uploaded .json backup File, parse/merge it into state, and persist to localStorage.
   */
  const handleImportJsonFile = useCallback(
    async (file: File) => {
      try {
        setError("");
        const text = await file.text();
        const { nextState, statusMessage } = applyBackupImportToState(
          state,
          text,
          importMode
        );

        saveMobileState(nextState);
        setState(nextState);
        setStatus(statusMessage);
      } catch (importError) {
        setError(
          importError instanceof Error
            ? importError.message
            : "Failed to import backup JSON file."
        );
      }
    },
    [state, importMode]
  );

  /**
   * Clear all imported bookmarks from the mobile device.
   */
  const handleClearCatalog = useCallback(() => {
    clearMobileState();
    setState(null);
    setQuery("");
    setStatus("Catalog cleared.");
    setError("");
  }, []);

  /**
   * Persist an updated TimberState snapshot to localStorage and update React state.
   */
  const commitState = useCallback((nextState: TimberState) => {
    saveMobileState(nextState);
    setState(nextState);
  }, []);

  const bookmarks: Bookmark[] = useMemo(
    () => state?.bookmarks ?? [],
    [state]
  );

  const folders: BookmarkPage[] = useMemo(
    () => (state?.pages ?? []).filter((page) => page.type === "custom"),
    [state]
  );

  const bookmarksById = useMemo(() => {
    const map = new Map<string, Bookmark>();
    for (const bookmark of bookmarks) {
      map.set(bookmark.id, bookmark);
    }
    return map;
  }, [bookmarks]);

  const rootTiles: RootTile[] = useMemo(() => {
    if (!state) return [];
    return computeRootTiles({
      pages: folders,
      bookmarks,
      rootOrder: state.rootOrder,
      rootBookmarkIds: state.rootBookmarkIds,
    });
  }, [state, folders, bookmarks]);

  const searchResults: Bookmark[] = useMemo(
    () => filterBookmarksByQuery(bookmarks, query),
    [bookmarks, query]
  );

  const hasCatalogData = bookmarks.length > 0 || folders.length > 0;


  return {
    state,
    commitState,
    isLoaded,
    hasCatalogData,
    bookmarks,
    folders,
    bookmarksById,
    rootTiles,
    query,
    setQuery,
    searchResults,
    importMode,
    setImportMode,
    status,
    setStatus,
    error,
    setError,
    handleImportJsonFile,
    handleClearCatalog,
  };
}
