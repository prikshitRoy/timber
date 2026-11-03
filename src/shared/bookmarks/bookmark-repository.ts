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
    updates: Partial<Pick<Bookmark, "title">>
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

  // Get all pages.
  async getPages(): Promise<BookmarkPage[]> {
    const state = await this.read();

    return state.pages;
  }

  // Create a custom page.
  async createPage(name: string): Promise<BookmarkPage> {
    return this.mutate((state) => {
      const page: BookmarkPage = {
        id: createId(),
        name: name.trim(),
        type: "custom",
        bookmarkIds: [],
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
}

  

export const bookmarkRepository = new BookmarkRepository();
