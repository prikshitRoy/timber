
// These are the records our tree reader will send to the repository.
export interface NativeBookmarkRecord {
  nativeBookmarkId: string;
  url: string;
  title: string;

  parentNativeId?: string;
  folderPath: string[];

  index?: number;
  dateAdded?: number;
}

export interface BookmarkSyncSummary {
  scanned: number;
  uniqueAdded: number;
  associationsAdded: number;
  associationsUpdated: number;
  associationsRemoved: number;
  totalUniqueBookmarks: number;
}

export interface BookmarkSyncAddition {
  native: NativeBookmarkRecord;
}

export interface BookmarkSyncUpdate {
  native: NativeBookmarkRecord;
  bookmarkId: string;
  previousTitle: string;
  previousFolderPath: string[];
}

export interface BookmarkSyncRemoval {
  bookmarkSourceId: string;
  bookmarkId: string;
  title: string;
  url: string;
  folderPath: string[];
}

export interface BookmarkSyncDiff {
  sourceId: string;
  additions: BookmarkSyncAddition[];
  updates: BookmarkSyncUpdate[];
  removals: BookmarkSyncRemoval[];
}

export interface BookmarkSyncSelection {
  acceptedNativeIds: string[];     // additions + updates the user checked
  confirmedRemovalIds: string[];   // removals the user explicitly approved
}
