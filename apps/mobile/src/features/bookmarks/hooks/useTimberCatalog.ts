/**
 * React hook managing the mobile bookmark catalog state, JSON file imports, and search filtering.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  TIMBER_SCHEMA_VERSION,
  addBookmarkToPageInState,
  addBookmarkToRootInState,
  applyBackupImportToState,
  computeRootTiles,
  createManualLinkInState,
  createPageInState,
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



function createEmptyMobileState(): TimberState {
  const now = Date.now();
  const allPageId = crypto.randomUUID();

  return {
    schemaVersion: TIMBER_SCHEMA_VERSION,
    sources: [],
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
    ],
    activePageId: allPageId,
    rootOrder: [],
    rootBookmarkIds: [],
    foldersMigrated: true,
  };
}





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

  /**
  * Save a manually added or shared link to the root grid, an existing folder, or a newly created folder.
  */
  const handleAddSharedBookmark = useCallback(
    (input: {
      url: string;
      title: string;
      folderId?: string;
      newFolderName?: string;
    }) => {
      try {
        setError("");
        const nextState: TimberState = state
          ? structuredClone(state)
          : createEmptyMobileState();

        const bookmark = createManualLinkInState(
          nextState,
          input.url.trim(),
          input.title.trim() || input.url.trim()
        );

        let targetFolderId = input.folderId?.trim() || "";
        const trimmedNewFolder = input.newFolderName?.trim() || "";

        if (trimmedNewFolder) {
          const createdFolder = createPageInState(nextState, trimmedNewFolder);
          targetFolderId = createdFolder.id;
        }

        if (targetFolderId) {
          addBookmarkToPageInState(nextState, targetFolderId, bookmark.id);
        } else {
          addBookmarkToRootInState(nextState, bookmark.id);
        }

        saveMobileState(nextState);
        setState(nextState);
        setStatus(`Saved "${bookmark.title}" to Timber.`);
        return true;
      } catch (saveError) {
        setError(
          saveError instanceof Error
            ? saveError.message
            : "Failed to save bookmark."
        );
        return false;
      }
    },
    [state]
  );

  return {
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
    handleAddSharedBookmark,
  };
}
