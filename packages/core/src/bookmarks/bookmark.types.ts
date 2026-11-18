
/**
 * Data shapes for reading native browser bookmarks and reviewing/applying sync diffs.
 */

// Input payload used when upserting a single native browser bookmark into the catalog.
export interface NativeBookmarkInput {
  sourceId: string;
  nativeBookmarkId: string;
  url: string;
  title: string;
  parentNativeId?: string;
  folderPath?: string[];
  dateAdded?: number;
}

// Flat bookmark record extracted from the browser's native bookmark tree.
export interface NativeBookmarkRecord {
  nativeBookmarkId: string;
  url: string;
  title: string;

  parentNativeId?: string;
  folderPath: string[];

  index?: number;
  dateAdded?: number;
}

// Summary statistics returned after synchronizing or applying native bookmark changes.
export interface BookmarkSyncSummary {
  scanned: number;
  uniqueAdded: number;
  associationsAdded: number;
  associationsUpdated: number;
  associationsRemoved: number;
  totalUniqueBookmarks: number;
}

// Represents a single new native bookmark discovered during a Scan diff.
export interface BookmarkSyncAddition {
  native: NativeBookmarkRecord;
}

// Diff result listing all new native bookmarks for a browser source awaiting user review.
export interface BookmarkSyncDiff {
  sourceId: string;
  additions: BookmarkSyncAddition[];
}

// User's selection of native bookmark IDs approved in the Sync Review modal.
export interface BookmarkSyncSelection {
  acceptedNativeIds: string[];
}