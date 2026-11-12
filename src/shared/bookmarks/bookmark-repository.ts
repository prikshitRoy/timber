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
  NativeBookmarkRecord,
  BookmarkSyncSummary,
  BookmarkSyncDiff,
  BookmarkSyncSelection,
} from "./bookmark.types";

import { normalizeBookmarkUrl } from "./bookmark-normalizer";
import { findOrCreateFolderChainInState, stripBrowserContainer } from "./folder-chain";
import { migrateFoldersFromPaths } from "./bookmark-folder-migration";
import { mergeBackupIntoState, type MergeSummary } from "../backup/timber-backup";

const now = () => Date.now();

const createId = () => crypto.randomUUID();

interface NativeBookmarkInput {
  sourceId: string;
  nativeBookmarkId: string;
  url: string;
  title: string;
  parentNativeId?: string;
  folderPath?: string[];
  dateAdded?: number;
}

class BookmarkRepository {
  private writeQueue: Promise<void> = Promise.resolve();

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

  private async read(): Promise<TimberState> {
    await this.ensureFoldersMigrated();
    await this.writeQueue;

    const state = await loadState();

    if (!state) {
      throw new Error("Timber has not been initialized.");
    }

    return state;
  }

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

    // Existing installs from before folders were unified may still
    // need the one-time migration — read() runs it if so.
    return this.read();
  }

  async registerSource(
    browserKind: BrowserKind,
    name: string
  ): Promise<BrowserSource> {
    return this.mutate((state) => {
      const source: BrowserSource = {
        id: createId(),
        browser: browserKind,
        name,
        createdAt: now(),
      };

      state.sources.push(source);

      state.pages.push({
        id: createId(),
        name: `${name} Bookmarks`,
        type: "source",
        sourceId: source.id,
        createdAt: now(),
        updatedAt: now(),
      });

      return source;
    });
  }

  async upsertNativeBookmark(
    input: NativeBookmarkInput
  ): Promise<Bookmark> {
    const normalizedUrl = normalizeBookmarkUrl(input.url);

    return this.mutate((state) => {
      const sourceExists = state.sources.some(
        (source) => source.id === input.sourceId
      );

      if (!sourceExists) {
        throw new Error("Browser source not found.");
      }

      let bookmark = state.bookmarks.find(
        (item) => item.normalizedUrl === normalizedUrl
      );

      if (!bookmark) {
        bookmark = {
          id: createId(),
          url: input.url,
          normalizedUrl,
          title: input.title || input.url,
          createdAt: now(),
          updatedAt: now(),
        };

        state.bookmarks.push(bookmark);
      }

      const sourceBookmark = state.bookmarkSources.find(
        (item) =>
          item.sourceId === input.sourceId &&
          item.nativeBookmarkId === input.nativeBookmarkId
      );

      if (sourceBookmark) {
        sourceBookmark.bookmarkId = bookmark.id;
        sourceBookmark.title = input.title;
        sourceBookmark.parentNativeId = input.parentNativeId;
        sourceBookmark.folderPath = input.folderPath ?? [];
        sourceBookmark.dateAdded = input.dateAdded;
      } else {
        const occurrence: BookmarkSource = {
          id: createId(),
          bookmarkId: bookmark.id,
          sourceId: input.sourceId,
          nativeBookmarkId: input.nativeBookmarkId,
          title: input.title,
          parentNativeId: input.parentNativeId,
          folderPath: input.folderPath ?? [],
          dateAdded: input.dateAdded,
        };

        state.bookmarkSources.push(occurrence);
      }

      bookmark.updatedAt = now();

      return bookmark;
    });
  }

  async getAllBookmarks(): Promise<Bookmark[]> {
    const state = await this.read();
    return state.bookmarks;
  }

  async getBookmarksBySource(sourceId: string): Promise<Bookmark[]> {
    const state = await this.read();

    const bookmarkIds = new Set(
      state.bookmarkSources
        .filter((item) => item.sourceId === sourceId)
        .map((item) => item.bookmarkId)
    );

    return state.bookmarks.filter((bookmark) => bookmarkIds.has(bookmark.id));
  }

  async getBookmarkSources(bookmarkId: string): Promise<BookmarkSource[]> {
    const state = await this.read();

    return state.bookmarkSources.filter(
      (item) => item.bookmarkId === bookmarkId
    );
  }

  async updateBookmark(
    bookmarkId: string,
    updates: Partial<Pick<Bookmark, "title" | "url">>
  ): Promise<void> {
    await this.mutate((state) => {
      const bookmark = state.bookmarks.find((item) => item.id === bookmarkId);

      if (!bookmark) {
        throw new Error("Bookmark not found.");
      }

      if (updates.title !== undefined) {
        bookmark.title = updates.title;
      }

      if (updates.url !== undefined) {
        bookmark.url = updates.url;
        bookmark.normalizedUrl = normalizeBookmarkUrl(updates.url);
      }

      bookmark.updatedAt = now();
    });
  }

  async updateBookmarks(
    updates: { id: string; title: string; url: string }[]
  ): Promise<void> {
    await this.mutate((state) => {
      for (const update of updates) {
        const bookmark = state.bookmarks.find((item) => item.id === update.id);
        if (!bookmark) continue;

        bookmark.title = update.title;
        bookmark.url = update.url;
        bookmark.normalizedUrl = normalizeBookmarkUrl(update.url);
        bookmark.updatedAt = now();
      }
    });
  }

  async removeNativeBookmark(
    sourceId: string,
    nativeBookmarkId: string
  ): Promise<void> {
    await this.mutate((state) => {
      const occurrenceIndex = state.bookmarkSources.findIndex(
        (item) =>
          item.sourceId === sourceId &&
          item.nativeBookmarkId === nativeBookmarkId
      );

      if (occurrenceIndex === -1) return;

      const [removed] = state.bookmarkSources.splice(occurrenceIndex, 1);

      if (!removed) return;

      const hasOtherSources = state.bookmarkSources.some(
        (item) => item.bookmarkId === removed.bookmarkId
      );

      const usedByPage = state.pages.some(
        (page) =>
          page.type === "custom" &&
          page.bookmarkIds?.includes(removed.bookmarkId)
      );

      if (!hasOtherSources && !usedByPage) {
        state.bookmarks = state.bookmarks.filter(
          (item) => item.id !== removed.bookmarkId
        );
      }
    });
  }

  async deleteBookmark(bookmarkId: string): Promise<void> {
    await this.mutate((state) => {
      state.bookmarks = state.bookmarks.filter(
        (item) => item.id !== bookmarkId
      );

      state.bookmarkSources = state.bookmarkSources.filter(
        (item) => item.bookmarkId !== bookmarkId
      );

      for (const page of state.pages) {
        if (page.type === "custom") {
          page.bookmarkIds = page.bookmarkIds?.filter(
            (id) => id !== bookmarkId
          );

          page.updatedAt = now();
        }
      }
    });
  }

  async deleteBookmarks(bookmarkIds: string[]): Promise<void> {
    const idSet = new Set(bookmarkIds);

    await this.mutate((state) => {
      state.bookmarks = state.bookmarks.filter((item) => !idSet.has(item.id));

      state.bookmarkSources = state.bookmarkSources.filter(
        (item) => !idSet.has(item.bookmarkId)
      );

      for (const page of state.pages) {
        if (page.type === "custom") {
          page.bookmarkIds = page.bookmarkIds?.filter((id) => !idSet.has(id));
          page.updatedAt = now();
        }
      }
    });
  }

  async getPages(): Promise<BookmarkPage[]> {
    const state = await this.read();
    return state.pages;
  }

  async createPage(name: string, parentId?: string): Promise<BookmarkPage> {
    return this.mutate((state) => {
      if (parentId) {
        const parent = state.pages.find((item) => item.id === parentId);

        if (!parent || parent.type !== "custom") {
          throw new Error("Parent folder not found.");
        }
      }

      const page: BookmarkPage = {
        id: createId(),
        name: name.trim(),
        type: "custom",
        bookmarkIds: [],
        parentId,
        createdAt: now(),
        updatedAt: now(),
      };

      if (!page.name) {
        throw new Error("Page name cannot be empty.");
      }

      state.pages.push(page);

      return page;
    });
  }

  async getChildPages(parentId?: string): Promise<BookmarkPage[]> {
    const state = await this.read();

    return state.pages.filter(
      (page) => page.type === "custom" && page.parentId === parentId
    );
  }

  // Find (or create) a folder chain by name path — the same
  // merge-by-name-across-browsers logic Scan uses for auto-placement,
  // exposed for any other caller that needs it.
  async findOrCreateFolderChain(folderPath: string[]): Promise<BookmarkPage | null> {
    return this.mutate((state) => findOrCreateFolderChainInState(state, folderPath));
  }

  async renamePage(pageId: string, name: string): Promise<void> {
    await this.mutate((state) => {
      const page = state.pages.find((item) => item.id === pageId);

      if (!page) {
        throw new Error("Page not found.");
      }

      if (!name.trim()) {
        throw new Error("Page name cannot be empty.");
      }

      page.name = name.trim();
      page.updatedAt = now();
    });
  }

  async addBookmarkToPage(pageId: string, bookmarkId: string): Promise<void> {
    await this.mutate((state) => {
      const page = state.pages.find((item) => item.id === pageId);

      const bookmarkExists = state.bookmarks.some(
        (item) => item.id === bookmarkId
      );

      if (!page || page.type !== "custom") {
        throw new Error("Custom page not found.");
      }

      if (!bookmarkExists) {
        throw new Error("Bookmark not found.");
      }

      page.bookmarkIds ??= [];

      if (!page.bookmarkIds.includes(bookmarkId)) {
        page.bookmarkIds.push(bookmarkId);
      }

      page.updatedAt = now();
    });
  }

  async removeBookmarkFromPage(pageId: string, bookmarkId: string): Promise<void> {
    await this.mutate((state) => {
      const page = state.pages.find((item) => item.id === pageId);

      if (!page || page.type !== "custom") {
        throw new Error("Custom page not found.");
      }

      page.bookmarkIds = page.bookmarkIds?.filter((id) => id !== bookmarkId);
      page.updatedAt = now();
    });
  }

  // Save a folder's custom drag/A-Z order for its direct children
  // (bookmarks and sub-folders mixed together, keyed "bk:<id>" /
  // "sf:<id>") — used by TimberFolderContents' sort toolbar + drag.
  async setFolderChildOrder(folderId: string, order: string[]): Promise<void> {
    await this.mutate((state) => {
      const page = state.pages.find((item) => item.id === folderId);

      if (!page || page.type !== "custom") {
        throw new Error("Custom page not found.");
      }

      page.childOrder = order;
      page.updatedAt = now();
    });
  }
  

  // Delete a folder AND everything inside it — its own bookmarks,
  // every nested sub-folder at any depth, and their bookmarks too.
  // Deleted bookmarks are soft-deleted (same as deleteBookmark): they
  // stay in the real browser if they came from there, and reappear
  // next time you Scan.
  async deletePage(pageId: string): Promise<void> {
    await this.mutate((state) => {
      const page = state.pages.find((item) => item.id === pageId);

      if (!page || page.type !== "custom") {
        throw new Error("Only custom pages can be deleted.");
      }

      const toDelete = new Set<string>([pageId]);
      let grew = true;

      while (grew) {
        grew = false;

        for (const candidate of state.pages) {
          if (
            candidate.type === "custom" &&
            candidate.parentId &&
            toDelete.has(candidate.parentId) &&
            !toDelete.has(candidate.id)
          ) {
            toDelete.add(candidate.id);
            grew = true;
          }
        }
      }

      const bookmarkIdsToDelete = new Set<string>();

      for (const deletedId of toDelete) {
        const deletedPage = state.pages.find((item) => item.id === deletedId);
        for (const id of deletedPage?.bookmarkIds ?? []) {
          bookmarkIdsToDelete.add(id);
        }
      }

      state.bookmarks = state.bookmarks.filter(
        (item) => !bookmarkIdsToDelete.has(item.id)
      );

      state.bookmarkSources = state.bookmarkSources.filter(
        (item) => !bookmarkIdsToDelete.has(item.bookmarkId)
      );

      state.pages = state.pages.filter((item) => !toDelete.has(item.id));

      // A surviving folder may still reference a deleted bookmark —
      // bookmarks can live in more than one folder (tag-like model).
      for (const remaining of state.pages) {
        if (remaining.type === "custom" && remaining.bookmarkIds) {
          const filtered = remaining.bookmarkIds.filter(
            (id) => !bookmarkIdsToDelete.has(id)
          );

          if (filtered.length !== remaining.bookmarkIds.length) {
            remaining.bookmarkIds = filtered;
            remaining.updatedAt = now();
          }
        }
      }

      if (state.activePageId && toDelete.has(state.activePageId)) {
        const fallback = state.pages.find((item) => item.type === "all");
        if (fallback) state.activePageId = fallback.id;
      }
    });
  }

  async getState(): Promise<TimberState> {
    return this.read();
  }

  async getBookmarksForPage(pageId: string): Promise<Bookmark[]> {
    const state = await this.read();

    const page = state.pages.find((item) => item.id === pageId);

    if (!page) {
      throw new Error("Page not found.");
    }

    switch (page.type) {
      case "all":
        return state.bookmarks;

      case "source": {
        if (!page.sourceId) return [];

        const ids = new Set(
          state.bookmarkSources
            .filter((item) => item.sourceId === page.sourceId)
            .map((item) => item.bookmarkId)
        );

        return state.bookmarks.filter((bookmark) => ids.has(bookmark.id));
      }

      case "custom": {
        const ids = new Set(page.bookmarkIds ?? []);
        return state.bookmarks.filter((bookmark) => ids.has(bookmark.id));
      }
    }
  }

  // Legacy full-replace sync — unused by the product flow (kept only
  // for bookmark-repository.test.ts). Scan uses computeSyncDiff /
  // applySyncDiff instead.
  async syncNativeBookmarks(
    sourceId: string,
    nativeBookmarks: NativeBookmarkRecord[]
  ): Promise<BookmarkSyncSummary> {
    return this.mutate((state) => {
      const source = state.sources.find((item) => item.id === sourceId);

      if (!source) {
        throw new Error("Browser source not found.");
      }

      const seenNativeIds = new Set<string>();

      let uniqueAdded = 0;
      let associationsAdded = 0;
      let associationsUpdated = 0;

      for (const input of nativeBookmarks) {
        if (seenNativeIds.has(input.nativeBookmarkId)) continue;
        seenNativeIds.add(input.nativeBookmarkId);

        const normalizedUrl = normalizeBookmarkUrl(input.url);

        let bookmark = state.bookmarks.find(
          (item) => item.normalizedUrl === normalizedUrl
        );

        if (!bookmark) {
          bookmark = {
            id: createId(),
            url: input.url,
            normalizedUrl,
            title: input.title || input.url,
            createdAt: now(),
            updatedAt: now(),
          };

          state.bookmarks.push(bookmark);
          uniqueAdded++;
        } else {
          const existingSourceCount = state.bookmarkSources.filter(
            (item) => item.bookmarkId === bookmark!.id
          ).length;

          if (existingSourceCount <= 1) {
            bookmark.title = input.title || input.url;
            bookmark.url = input.url;
            bookmark.updatedAt = now();
          }
        }

        const occurrence = state.bookmarkSources.find(
          (item) =>
            item.sourceId === sourceId &&
            item.nativeBookmarkId === input.nativeBookmarkId
        );

        if (occurrence) {
          const changed =
            occurrence.bookmarkId !== bookmark.id ||
            occurrence.title !== input.title ||
            occurrence.parentNativeId !== input.parentNativeId ||
            occurrence.index !== input.index ||
            JSON.stringify(occurrence.folderPath) !==
              JSON.stringify(input.folderPath);

          occurrence.bookmarkId = bookmark.id;
          occurrence.title = input.title;
          occurrence.parentNativeId = input.parentNativeId;
          occurrence.folderPath = [...input.folderPath];
          occurrence.index = input.index;
          occurrence.dateAdded = input.dateAdded;

          if (changed) {
            associationsUpdated++;
          }
        } else {
          const newOccurrence: BookmarkSource = {
            id: createId(),
            bookmarkId: bookmark.id,
            sourceId,
            nativeBookmarkId: input.nativeBookmarkId,
            title: input.title,
            parentNativeId: input.parentNativeId,
            folderPath: [...input.folderPath],
            index: input.index,
            dateAdded: input.dateAdded,
          };

          state.bookmarkSources.push(newOccurrence);
          associationsAdded++;
        }
      }

      const previousAssociationCount = state.bookmarkSources.length;

      state.bookmarkSources = state.bookmarkSources.filter(
        (item) =>
          item.sourceId !== sourceId ||
          seenNativeIds.has(item.nativeBookmarkId)
      );

      const associationsRemoved =
        previousAssociationCount - state.bookmarkSources.length;

      const linkedBookmarkIds = new Set(
        state.bookmarkSources.map((item) => item.bookmarkId)
      );

      const customPageBookmarkIds = new Set(
        state.pages
          .filter((page) => page.type === "custom")
          .flatMap((page) => page.bookmarkIds ?? [])
      );

      state.bookmarks = state.bookmarks.filter(
        (bookmark) =>
          linkedBookmarkIds.has(bookmark.id) ||
          customPageBookmarkIds.has(bookmark.id)
      );

      source.lastSyncedAt = now();

      return {
        scanned: nativeBookmarks.length,
        uniqueAdded,
        associationsAdded,
        associationsUpdated,
        associationsRemoved,
        totalUniqueBookmarks: state.bookmarks.length,
      };
    });
  }

  async computeSyncDiff(
    sourceId: string,
    nativeBookmarks: NativeBookmarkRecord[]
  ): Promise<BookmarkSyncDiff> {
    const state = await this.read();

    const source = state.sources.find((item) => item.id === sourceId);

    if (!source) {
      throw new Error("Browser source not found.");
    }

    const existingNativeIds = new Set(
      state.bookmarkSources
        .filter((item) => item.sourceId === sourceId)
        .map((item) => item.nativeBookmarkId)
    );

    const additions: BookmarkSyncDiff["additions"] = [];
    const seenNativeIds = new Set<string>();

    for (const native of nativeBookmarks) {
      if (seenNativeIds.has(native.nativeBookmarkId)) continue;
      seenNativeIds.add(native.nativeBookmarkId);

      if (!existingNativeIds.has(native.nativeBookmarkId)) {
        additions.push({ native });
      }
    }

    return { sourceId, additions };
  }

  async applySyncDiff(
    sourceId: string,
    nativeBookmarks: NativeBookmarkRecord[],
    selection: BookmarkSyncSelection
  ): Promise<BookmarkSyncSummary> {
    const acceptedIds = new Set(selection.acceptedNativeIds);

    return this.mutate((state) => {
      const source = state.sources.find((item) => item.id === sourceId);

      if (!source) {
        throw new Error("Browser source not found.");
      }

      let uniqueAdded = 0;
      let associationsAdded = 0;

      const nativeById = new Map<string, NativeBookmarkRecord>(
        nativeBookmarks.map((item) => [item.nativeBookmarkId, item] as const)
      );

      for (const nativeId of acceptedIds) {
        const input = nativeById.get(nativeId);
        if (!input) continue;

        const alreadyLinked = state.bookmarkSources.some(
          (item) =>
            item.sourceId === sourceId &&
            item.nativeBookmarkId === input.nativeBookmarkId
        );

        if (alreadyLinked) continue;

        const normalizedUrl = normalizeBookmarkUrl(input.url);

        let bookmark = state.bookmarks.find(
          (item) => item.normalizedUrl === normalizedUrl
        );

        if (!bookmark) {
          bookmark = {
            id: createId(),
            url: input.url,
            normalizedUrl,
            title: input.title || input.url,
            createdAt: now(),
            updatedAt: now(),
          };

          state.bookmarks.push(bookmark);
          uniqueAdded++;
        }

        state.bookmarkSources.push({
          id: createId(),
          bookmarkId: bookmark.id,
          sourceId,
          nativeBookmarkId: input.nativeBookmarkId,
          title: input.title,
          parentNativeId: input.parentNativeId,
          folderPath: [...input.folderPath],
          index: input.index,
          dateAdded: input.dateAdded,
        });

        // Auto-place into the matching Timber folder chain — merged
        // by name across browsers, container segment stripped.
        const folder = findOrCreateFolderChainInState(
          state,
          stripBrowserContainer(input.folderPath)
        );

        if (folder) {
          folder.bookmarkIds ??= [];
          if (!folder.bookmarkIds.includes(bookmark.id)) {
            folder.bookmarkIds.push(bookmark.id);
            folder.updatedAt = now();
          }
        }

        associationsAdded++;
      }

      source.lastSyncedAt = now();

      return {
        scanned: nativeBookmarks.length,
        uniqueAdded,
        associationsAdded,
        associationsUpdated: 0,
        associationsRemoved: 0,
        totalUniqueBookmarks: state.bookmarks.length,
      };
    });
  }

  async setRootOrder(order: string[]): Promise<void> {
    await this.mutate((state) => {
      state.rootOrder = order;
    });
  }


  // Replace everything with an already-sanitized backup (full restore).
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

  // Merge an already-sanitized backup into current data. Nothing
  // existing is overwritten or removed.
  async mergeBackup(imported: TimberState): Promise<MergeSummary> {
    return this.mutate((state) => mergeBackupIntoState(state, imported));
  }


  async createManualLink(url: string, title: string): Promise<Bookmark> {
    const normalizedUrl = normalizeBookmarkUrl(url);

    return this.mutate((state) => {
      let bookmark = state.bookmarks.find(
        (item) => item.normalizedUrl === normalizedUrl
      );

      if (bookmark) {
        return bookmark;
      }

      bookmark = {
        id: createId(),
        url,
        normalizedUrl,
        title: title.trim() || url,
        createdAt: now(),
        updatedAt: now(),
      };

      state.bookmarks.push(bookmark);

      return bookmark;
    });
  }
}

export const bookmarkRepository = new BookmarkRepository();
