
/**
 * Core domain types and persisted state schema for the Timber bookmark catalog.
 */

// Current persisted storage schema version for TimberState.
export const TIMBER_SCHEMA_VERSION = 2 as const;

// Supported browser families that Timber can detect and sync with.
export type BrowserKind =
  | "brave"
  | "firefox"
  | "chromium"
  | "unknown";

// Discriminator for Timber pages: built-in views ("all", "source") vs user/synced folders ("custom").
export type BookmarkPageType =
  | "all"
  | "source"
  | "custom";

// Represents a connected browser profile that contributes native bookmarks to Timber.
export interface BrowserSource {
  id: string;
  browser: BrowserKind;
  name: string;
  createdAt: number;
  lastSyncedAt?: number;
}

// Canonical, deduplicated bookmark record identified by its normalized URL.
export interface Bookmark {
  id: string;
  url: string;
  normalizedUrl: string;
  title: string;
  createdAt: number;
  updatedAt: number;
}

// Links a canonical Bookmark to a specific native browser bookmark node and its original folder path.
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

// Represents either a built-in catalog view ("all", "source") or a nestable Timber folder ("custom").
export interface BookmarkPage {
  id: string;
  name: string;
  type: BookmarkPageType;

  sourceId?: string;
  bookmarkIds?: string[];
  parentId?: string; // Parent custom page ID when nested inside another Timber folder.
  childOrder?: string[]; // Custom drag or A-Z order of direct children ("bk:<id>" and "sf:<id>").

  createdAt: number;
  updatedAt: number;
}

// Top-level state persisted in browser.storage.local and exported in Timber backup files.
export interface TimberState {
  schemaVersion: typeof TIMBER_SCHEMA_VERSION;

  sources: BrowserSource[];
  bookmarks: Bookmark[];
  bookmarkSources: BookmarkSource[];
  pages: BookmarkPage[];

  activePageId: string;
  rootOrder?: string[];
  rootBookmarkIds?: string[]; // Bookmarks explicitly placed on the root grid even if also in a folder.
  foldersMigrated?: boolean; // One-time flag indicating folderPath strings were migrated to custom pages.
}
