
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

export interface BookmarkSyncDiff {
  sourceId: string;
  additions: BookmarkSyncAddition[];
}

export interface BookmarkSyncSelection {
  acceptedNativeIds: string[]; // additions the user checked in the review popup
}