/**
 * Shared UI state and view-model types for the New Tab bookmark dashboard.
 */

import type {
  Bookmark,
  BookmarkInstanceTarget,
  BookmarkSyncDiff,
  NativeBookmarkRecord,
} from "@timber/core";

// Bookmark record enriched with the number of connected browsers where it appears.
export interface DashboardBookmark extends Bookmark {
  sourceCount: number;
}

// Lightweight title/URL summary used by folder and tile views.
export interface BookmarkSummary {
  title: string;
  url: string;
}

// State held while the user reviews a newly scanned diff in SyncReviewModal.
export interface PendingSyncState {
  sourceId: string;
  nativeBookmarks: NativeBookmarkRecord[];
  diff: BookmarkSyncDiff;
}

// State held while the user edits a single bookmark in EditBookmarkModal.
export interface EditingBookmarkState {
  id: string;
  title: string;
  url: string;
}

// State held while the user chooses how to delete a link that has duplicates.
export interface DeletingBookmarkState {
  bookmarkId: string;
  title: string;
  target: BookmarkInstanceTarget;
  instanceCount: number;
}
