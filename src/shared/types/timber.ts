
export type BrowserKind =
  | "brave"
  | "firefox"
  | "chromium"
  | "unknown";

export type BookmarkPageType =
  | "all"
  | "source"
  | "custom";

export interface BrowserSource {
  id: string;
  browser: BrowserKind;
  name: string;
  createdAt: number;
  lastSyncedAt?: number;
}

export interface Bookmark {
  id: string;
  url: string;
  normalizedUrl: string;
  title: string;
  createdAt: number;
  updatedAt: number;
}

export interface BookmarkSource {
  id: string;
  bookmarkId: string;
  sourceId: string;

  nativeBookmarkId: string;

  title: string;
  parentNativeId?: string;
  folderPath: string[];

  index?: number;
  dateAdded?: number;
}

export interface BookmarkPage {
  id: string;
  name: string;
  type: BookmarkPageType;

  sourceId?: string;
  bookmarkIds?: string[];
  parentId?: string; // lets custom pages nest as Timber folders

  createdAt: number;
  updatedAt: number;
}

/** 
export interface TimberState {
  schemaVersion: 2;

  sources: BrowserSource[];
  bookmarks: Bookmark[];
  bookmarkSources: BookmarkSource[];
  pages: BookmarkPage[];

  activePageId: string;
}
*/

export interface TimberState {
  schemaVersion: 2;

  sources: BrowserSource[];
  bookmarks: Bookmark[];
  bookmarkSources: BookmarkSource[];
  pages: BookmarkPage[];

  activePageId: string;
  rootOrder?: string[];
  foldersMigrated?: boolean; // one-time flag — see bookmark-folder-migration.ts
}
