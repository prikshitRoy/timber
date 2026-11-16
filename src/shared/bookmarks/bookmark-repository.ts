/**
 * Serialized repository coordinating persisted TimberState reads/writes and delegating
 * domain mutations to pure operation modules.
 */

import type {
  BrowserKind,
  BrowserSource,
  Bookmark,
  BookmarkSource,
  BookmarkPage,
  TimberState,
} from "@/src/shared/types/timber";
import {
  createInitialState,
  loadState,
  saveState,
} from "@/src/shared/storage/timber-storage";
import type {
  NativeBookmarkInput,
  NativeBookmarkRecord,
  BookmarkSyncSummary,
  BookmarkSyncDiff,
  BookmarkSyncSelection,
} from "./bookmark.types";
import { findOrCreateFolderChainInState } from "./folder-chain";
import { migrateFoldersFromPaths } from "./bookmark-folder-migration";
import {
  mergeBackupIntoState,
  type MergeSummary,
} from "../backup/timber-backup";
import {
  addBookmarkToRootInState,
  createManualLinkInState,
  deleteBookmarksInState,
  registerSourceInState,
  removeNativeBookmarkInState,
  updateBookmarkInState,
  updateBookmarksInState,
  upsertNativeBookmarkInState,
} from "./operations/bookmark-mutations";
import {
  deleteBookmarkInstanceInState,
  type BookmarkInstanceTarget,
} from "./operations/bookmark-instances";
import {
  addBookmarkToPageInState,
  createPageInState,
  deletePageInState,
  getBookmarksForPageInState,
  removeBookmarkFromPageInState,
  renamePageInState,
  setFolderChildOrderInState,
} from "./operations/folder-mutations";
import {
  applySyncDiffInState,
  computeSyncDiffInState,
  syncNativeBookmarksInState,
} from "./operations/sync-mutations";

/**
 * Provides serialized async CRUD, folder, sync, and backup operations over persisted TimberState.
 */
class BookmarkRepository {
  // Promise queue that serializes all storage mutations to prevent lost-update race conditions.
  private writeQueue: Promise<void> = Promise.resolve();

  /**
   * Load the latest state inside the serialized write queue, run `callback`, and persist the mutated state.
   */
  private async mutate<T>(
    callback: (state: TimberState) => T | Promise<T>
  ): Promise<T> {
    const operation = this.writeQueue.then(async () => {
      const state = await loadState();
      if (!state) {
        throw new Error("Timber has not been initialized.");
      }

      const result = await callback(state);
      await saveState(state);
      return result;
    });

    this.writeQueue = operation.then(
      () => undefined,
      () => undefined
    );

    return operation;
  }

  /**
   * Run the one-time legacy folderPath migration if the persisted state has not yet been migrated.
   */
  private async ensureFoldersMigrated(): Promise<void> {
    const snapshot = await loadState();
    if (!snapshot || snapshot.foldersMigrated) {
      return;
    }

    await this.mutate((state) => {
      if (state.foldersMigrated) return;
      migrateFoldersFromPaths(state);
      state.foldersMigrated = true;
    });
  }

  /**
   * Wait for any pending writes, ensure folder migration has run, and return the current TimberState.
   */
  private async read(): Promise<TimberState> {
    await this.ensureFoldersMigrated();
    await this.writeQueue;

    const state = await loadState();
    if (!state) {
      throw new Error("Timber has not been initialized.");
    }

    return state;
  }

  /**
   * Initialize persisted TimberState for `browserKind` if none exists yet, and return the active state.
   */
  async initialize(browserKind: BrowserKind): Promise<TimberState> {
    const operation = this.writeQueue.then(async () => {
      const existing = await loadState();
      if (existing) {
        return existing;
      }

      const initialState = createInitialState(browserKind);
      await saveState(initialState);
      return initialState;
    });

    this.writeQueue = operation.then(
      () => undefined,
      () => undefined
    );

    await operation;
    return this.read();
  }

  /**
   * Return the complete current TimberState snapshot.
   */
  async getState(): Promise<TimberState> {
    return this.read();
  }

  /**
   * Register a new browser source and its corresponding source page.
   */
  async registerSource(
    browserKind: BrowserKind,
    name: string
  ): Promise<BrowserSource> {
    return this.mutate((state) =>
      registerSourceInState(state, browserKind, name)
    );
  }

  /**
   * Insert or update a single native browser bookmark and its source occurrence.
   */
  async upsertNativeBookmark(input: NativeBookmarkInput): Promise<Bookmark> {
    return this.mutate((state) => upsertNativeBookmarkInState(state, input));
  }

  /**
   * Return all canonical bookmarks in the catalog.
   */
  async getAllBookmarks(): Promise<Bookmark[]> {
    const state = await this.read();
    return state.bookmarks;
  }

  /**
   * Return all canonical bookmarks associated with a specific browser source.
   */
  async getBookmarksBySource(sourceId: string): Promise<Bookmark[]> {
    const state = await this.read();
    const bookmarkIds = new Set(
      state.bookmarkSources
        .filter((item) => item.sourceId === sourceId)
        .map((item) => item.bookmarkId)
    );

    return state.bookmarks.filter((bookmark) => bookmarkIds.has(bookmark.id));
  }

  /**
   * Return all native browser source occurrences linked to a canonical bookmark.
   */
  async getBookmarkSources(bookmarkId: string): Promise<BookmarkSource[]> {
    const state = await this.read();
    return state.bookmarkSources.filter(
      (item) => item.bookmarkId === bookmarkId
    );
  }

  /**
   * Update a single bookmark's title and/or URL.
   */
  async updateBookmark(
    bookmarkId: string,
    updates: Partial<Pick<Bookmark, "title" | "url">>
  ): Promise<void> {
    await this.mutate((state) =>
      updateBookmarkInState(state, bookmarkId, updates)
    );
  }

  /**
   * Batch-update multiple bookmarks' titles and URLs.
   */
  async updateBookmarks(
    updates: { id: string; title: string; url: string }[]
  ): Promise<void> {
    await this.mutate((state) => updateBookmarksInState(state, updates));
  }

  /**
   * Remove a single native bookmark association and clean up unreferenced bookmarks.
   */
  async removeNativeBookmark(
    sourceId: string,
    nativeBookmarkId: string
  ): Promise<void> {
    await this.mutate((state) =>
      removeNativeBookmarkInState(state, sourceId, nativeBookmarkId)
    );
  }

  /**
   * Delete a single bookmark from Timber's catalog and all folders.
   */
  async deleteBookmark(bookmarkId: string): Promise<void> {
    await this.mutate((state) => deleteBookmarksInState(state, [bookmarkId]));
  }

  /**
   * Delete only a single placement (root or a specific folder) of a bookmark without removing other copies.
   */
  async deleteBookmarkInstance(
    bookmarkId: string,
    target: BookmarkInstanceTarget
  ): Promise<void> {
    await this.mutate((state) =>
      deleteBookmarkInstanceInState(state, bookmarkId, target)
    );
  }

  /**
   * Delete multiple bookmarks from Timber's catalog and all folders.
   */
  async deleteBookmarks(bookmarkIds: string[]): Promise<void> {
    await this.mutate((state) => deleteBookmarksInState(state, bookmarkIds));
  }

  /**
   * Create a manual bookmark link or return the existing bookmark if the URL is already present.
   */
  async createManualLink(url: string, title: string): Promise<Bookmark> {
    return this.mutate((state) => createManualLinkInState(state, url, title));
  }

  /**
   * Mark a bookmark for explicit display on the root grid even if it also belongs to a folder.
   */
  async addBookmarkToRoot(bookmarkId: string): Promise<void> {
    await this.mutate((state) => addBookmarkToRootInState(state, bookmarkId));
  }

  /**
   * Return all pages (built-in and custom folders) in the catalog.
   */
  async getPages(): Promise<BookmarkPage[]> {
    const state = await this.read();
    return state.pages;
  }

  /**
   * Create a new custom folder page, optionally nested under `parentId`.
   */
  async createPage(name: string, parentId?: string): Promise<BookmarkPage> {
    return this.mutate((state) => createPageInState(state, name, parentId));
  }

  /**
   * Return all custom folders that are direct children of `parentId`.
   */
  async getChildPages(parentId?: string): Promise<BookmarkPage[]> {
    const state = await this.read();
    return state.pages.filter(
      (page) => page.type === "custom" && page.parentId === parentId
    );
  }

  /**
   * Find or create a nested custom folder chain matching `folderPath` by name.
   */
  async findOrCreateFolderChain(
    folderPath: string[]
  ): Promise<BookmarkPage | null> {
    return this.mutate((state) =>
      findOrCreateFolderChainInState(state, folderPath)
    );
  }

  /**
   * Rename an existing folder/page.
   */
  async renamePage(pageId: string, name: string): Promise<void> {
    await this.mutate((state) => renamePageInState(state, pageId, name));
  }

  /**
   * Add a bookmark to a custom folder page.
   */
  async addBookmarkToPage(pageId: string, bookmarkId: string): Promise<void> {
    await this.mutate((state) =>
      addBookmarkToPageInState(state, pageId, bookmarkId)
    );
  }

  /**
   * Remove a bookmark from a custom folder page without deleting the bookmark from the catalog.
   */
  async removeBookmarkFromPage(
    pageId: string,
    bookmarkId: string
  ): Promise<void> {
    await this.mutate((state) =>
      removeBookmarkFromPageInState(state, pageId, bookmarkId)
    );
  }

  /**
   * Persist custom drag/sort ordering for a folder's direct children.
   */
  async setFolderChildOrder(folderId: string, order: string[]): Promise<void> {
    await this.mutate((state) =>
      setFolderChildOrderInState(state, folderId, order)
    );
  }

  /**
   * Persist custom drag/sort ordering for top-level tiles on the root grid.
   */
  async setRootOrder(order: string[]): Promise<void> {
    await this.mutate((state) => {
      state.rootOrder = order;
    });
  }

  /**
   * Delete a custom folder and recursively delete all sub-folders and bookmarks inside it.
   */
  async deletePage(pageId: string): Promise<void> {
    await this.mutate((state) => deletePageInState(state, pageId));
  }

  /**
   * Return all bookmarks belonging to the specified page/folder.
   */
  async getBookmarksForPage(pageId: string): Promise<Bookmark[]> {
    const state = await this.read();
    return getBookmarksForPageInState(state, pageId);
  }

  /**
   * Synchronize all native bookmarks for `sourceId` in a full-replace pass.
   */
  async syncNativeBookmarks(
    sourceId: string,
    nativeBookmarks: NativeBookmarkRecord[]
  ): Promise<BookmarkSyncSummary> {
    return this.mutate((state) =>
      syncNativeBookmarksInState(state, sourceId, nativeBookmarks)
    );
  }

  /**
   * Compute a diff of new native bookmarks not yet linked to `sourceId` in Timber.
   */
  async computeSyncDiff(
    sourceId: string,
    nativeBookmarks: NativeBookmarkRecord[]
  ): Promise<BookmarkSyncDiff> {
    const state = await this.read();
    return computeSyncDiffInState(state, sourceId, nativeBookmarks);
  }

  /**
   * Apply the user-selected native bookmark additions from a sync review diff.
   */
  async applySyncDiff(
    sourceId: string,
    nativeBookmarks: NativeBookmarkRecord[],
    selection: BookmarkSyncSelection
  ): Promise<BookmarkSyncSummary> {
    return this.mutate((state) =>
      applySyncDiffInState(state, sourceId, nativeBookmarks, selection)
    );
  }

  /**
   * Replace the entire persisted state with a sanitized backup state.
   */
  async replaceState(next: TimberState): Promise<void> {
    const operation = this.writeQueue.then(async () => {
      await saveState(next);
    });

    this.writeQueue = operation.then(
      () => undefined,
      () => undefined
    );

    return operation;
  }

  /**
   * Non-destructively merge a sanitized backup state into the current persisted state.
   */
  async mergeBackup(imported: TimberState): Promise<MergeSummary> {
    return this.mutate((state) => mergeBackupIntoState(state, imported));
  }
}

export const bookmarkRepository = new BookmarkRepository();
