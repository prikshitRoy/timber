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

  // Serialize writes within this JavaScript context.
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

  private async read(): Promise<TimberState> {
    await this.writeQueue;

    const state = await loadState();

    if (!state) {
      throw new Error("Timber has not been initialized.");
    }

    return state;
  }

  // Initialize Timber for the current browser.
  
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

    return operation;
    }


  // Register an additional browser source.
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

  // Add or update a bookmark from a browser.
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

      // Find an existing unique bookmark.
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

      // Identify the native occurrence.
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

  // Get every unique bookmark.
  async getAllBookmarks(): Promise<Bookmark[]> {
    const state = await this.read();

    return state.bookmarks;
  }

  // Get bookmarks belonging to a browser source.
  async getBookmarksBySource(
    sourceId: string
  ): Promise<Bookmark[]> {
    const state = await this.read();

    const bookmarkIds = new Set(
      state.bookmarkSources
        .filter((item) => item.sourceId === sourceId)
        .map((item) => item.bookmarkId)
    );

    return state.bookmarks.filter(
      (bookmark) => bookmarkIds.has(bookmark.id)
    );
  }

  // Get the browser sources containing a bookmark.
  async getBookmarkSources(
    bookmarkId: string
  ): Promise<BookmarkSource[]> {
    const state = await this.read();

    return state.bookmarkSources.filter(
      (item) => item.bookmarkId === bookmarkId
    );
  }

  // Update canonical bookmark metadata.
    async updateBookmark(
    bookmarkId: string,
    updates: Partial<Pick<Bookmark, "title" | "url">>
  ): Promise<void> {
    await this.mutate((state) => {
      const bookmark = state.bookmarks.find(
        (item) => item.id === bookmarkId
      );

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

  // Remove one native browser occurrence.
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

        const [removed] = state.bookmarkSources.splice(
        occurrenceIndex,
        1
        );

        // TypeScript safety check
        if (!removed) return;

        // Preserve the canonical bookmark if another browser
        // still contains it.
        const hasOtherSources = state.bookmarkSources.some(
        (item) => item.bookmarkId === removed.bookmarkId
        );

        // Preserve it if a custom page still references it.
        const usedByPage = state.pages.some(
        (page) =>
            page.type === "custom" &&
            page.bookmarkIds?.includes(removed.bookmarkId)
        );

        // Remove the canonical bookmark only when nobody references it.
        if (!hasOtherSources && !usedByPage) {
        state.bookmarks = state.bookmarks.filter(
            (item) => item.id !== removed.bookmarkId
        );
        }
    });
    }

  // Delete a canonical bookmark everywhere.
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

  // Delete several canonical bookmarks in one atomic operation —
  // used by the folder "Edit links" bulk delete action.
  async deleteBookmarks(bookmarkIds: string[]): Promise<void> {
    const idSet = new Set(bookmarkIds);

    await this.mutate((state) => {
      state.bookmarks = state.bookmarks.filter(
        (item) => !idSet.has(item.id)
      );

      state.bookmarkSources = state.bookmarkSources.filter(
        (item) => !idSet.has(item.bookmarkId)
      );

      for (const page of state.pages) {
        if (page.type === "custom") {
          page.bookmarkIds = page.bookmarkIds?.filter(
            (id) => !idSet.has(id)
          );

          page.updatedAt = now();
        }
      }
    });
  }

  // Get all pages.
  async getPages(): Promise<BookmarkPage[]> {
    const state = await this.read();

    return state.pages;
  }

  // Create a custom page.
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

  // Timber-created folders/pages nested under a parent
  // (omit parentId for top-level custom pages/folders).
  async getChildPages(parentId?: string): Promise<BookmarkPage[]> {
    const state = await this.read();

    return state.pages.filter(
      (page) => page.type === "custom" && page.parentId === parentId
    );
  }

  // Rename a page.
  async renamePage(
    pageId: string,
    name: string
  ): Promise<void> {
    await this.mutate((state) => {
      const page = state.pages.find(
        (item) => item.id === pageId
      );

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

  // Add a bookmark reference to a custom page.
  async addBookmarkToPage(
    pageId: string,
    bookmarkId: string
  ): Promise<void> {
    await this.mutate((state) => {
      const page = state.pages.find(
        (item) => item.id === pageId
      );

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

  // Remove a bookmark reference without deleting the bookmark.
  async removeBookmarkFromPage(
    pageId: string,
    bookmarkId: string
  ): Promise<void> {
    await this.mutate((state) => {
      const page = state.pages.find(
        (item) => item.id === pageId
      );

      if (!page || page.type !== "custom") {
        throw new Error("Custom page not found.");
      }

      page.bookmarkIds = page.bookmarkIds?.filter(
        (id) => id !== bookmarkId
      );

      page.updatedAt = now();
    });
  }

  // Delete a custom page.
  async deletePage(pageId: string): Promise<void> {
    await this.mutate((state) => {
      const page = state.pages.find(
        (item) => item.id === pageId
      );

      if (!page || page.type !== "custom") {
        throw new Error("Only custom pages can be deleted.");
      }

      // Move any nested folders up a level instead of orphaning them.
      for (const child of state.pages) {
        if (child.type === "custom" && child.parentId === pageId) {
          child.parentId = page.parentId;
          child.updatedAt = now();
        }
      }

      state.pages = state.pages.filter(
        (item) => item.id !== pageId
      );

      if (state.activePageId === pageId) {
        state.activePageId = state.pages.find(
          (item) => item.type === "all"
        )!.id;
      }
    });
  }

  // Read the entire database.
  async getState(): Promise<TimberState> {
    return this.read();
  }
  
  // page-based bookmark retrieval
    async getBookmarksForPage(pageId: string): Promise<Bookmark[]> {
    const state = await this.read();

    const page = state.pages.find(
        (item) => item.id === pageId
    );

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

        return state.bookmarks.filter(
            (bookmark) => ids.has(bookmark.id)
        );
        }

        case "custom": {
        const ids = new Set(page.bookmarkIds ?? []);

        return state.bookmarks.filter(
            (bookmark) => ids.has(bookmark.id)
        );
        }
    }
    }

  // Create canonical bookmark(New URL), Reuse canonical ID(Same URL in another browser), Update source association(Existing bookmark moved or renamed), Remove stale association(Native bookmark deleted)
  async syncNativeBookmarks(
    sourceId: string,
    nativeBookmarks: NativeBookmarkRecord[]
  ): Promise<BookmarkSyncSummary> {
    return this.mutate((state) => {
      const source = state.sources.find(
        (item) => item.id === sourceId
      );

      if (!source) {
        throw new Error("Browser source not found.");
      }

      const seenNativeIds = new Set<string>();

      let uniqueAdded = 0;
      let associationsAdded = 0;
      let associationsUpdated = 0;

      for (const input of nativeBookmarks) {
        // Ignore duplicate native IDs in an unexpected tree response.
        if (seenNativeIds.has(input.nativeBookmarkId)) {
          continue;
        }

        seenNativeIds.add(input.nativeBookmarkId);

        const normalizedUrl = normalizeBookmarkUrl(input.url);

        // Find the canonical bookmark.
        let bookmark = state.bookmarks.find(
          (item) => item.normalizedUrl === normalizedUrl
        );

        // Create it only when it doesn't already exist.
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
          // When a URL exists in only one source, keep its
          // canonical title synchronized with that source.
          const existingSourceCount = state.bookmarkSources.filter(
            (item) => item.bookmarkId === bookmark!.id
          ).length;

          if (existingSourceCount <= 1) {
            bookmark.title = input.title || input.url;
            bookmark.url = input.url;
            bookmark.updatedAt = now();
          }
        }

        // Find this bookmark's occurrence in the current browser.
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

      // Remove associations that no longer exist in this browser.
      const previousAssociationCount = state.bookmarkSources.length;

      state.bookmarkSources = state.bookmarkSources.filter(
        (item) =>
          item.sourceId !== sourceId ||
          seenNativeIds.has(item.nativeBookmarkId)
      );

      const associationsRemoved =
        previousAssociationCount - state.bookmarkSources.length;

      // Keep canonical records that are still referenced
      // by a browser source or a custom page.
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


  // Compare native bookmarks against Timber's catalog without
  // changing anything — used to drive the scan review popup.
  async computeSyncDiff(
    sourceId: string,
    nativeBookmarks: NativeBookmarkRecord[]
  ): Promise<BookmarkSyncDiff> {
    const state = await this.read();

    const source = state.sources.find((item) => item.id === sourceId);

    if (!source) {
      throw new Error("Browser source not found.");
    }

    // A native bookmark is "new" only if Timber has no occurrence
    // linking it, for this source, already. Title/folder changes on
    // bookmarks Timber already has are intentionally ignored.
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

  // Apply only the parts of a diff the user approved. Removals are
  // never applied unless their bookmarkSourceId is explicitly listed
  // in selection.confirmedRemovalIds.
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

        // Defensive — computeSyncDiff should never offer an
        // occurrence that already exists for this source.
        const alreadyLinked = state.bookmarkSources.some(
          (item) =>
            item.sourceId === sourceId &&
            item.nativeBookmarkId === input.nativeBookmarkId
        );

        if (alreadyLinked) continue;

        const normalizedUrl = normalizeBookmarkUrl(input.url);

        // URL is the canonical identity — reuse the existing Timber
        // bookmark if another browser source already added this URL.
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

    // Persist the user's drag-and-drop order of root-level tiles.
  async setRootOrder(order: string[]): Promise<void> {
    await this.mutate((state) => {
      state.rootOrder = order;
    });
  }

  // Create a bookmark directly in Timber, with no browser-source
  // occurrence at all — used by the "+ Link" button.
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
