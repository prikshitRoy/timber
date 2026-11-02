export type BrowserKind =
  | "brave"
  | "firefox"
  | "chromium"
  | "unknown";

export interface BrowserSource {
  id: string;
  browser: BrowserKind;
  name: string;
}

export interface BookmarkPage {
  id: string;
  name: string;

  // null means display all native bookmarks.
  // An array means display only selected bookmarks.
  bookmarkIds: string[] | null;

  sourceId: string;

  createdAt: number;
  updatedAt: number;
}

export interface TimberState {
  schemaVersion: 1;

  source: BrowserSource;

  pages: BookmarkPage[];

  activePageId: string;
}