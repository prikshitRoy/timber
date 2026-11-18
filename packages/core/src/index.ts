/**
 * Public barrel export for @timber/core shared domain types, backup parser, and layout utilities.
 */

export {
  TIMBER_SCHEMA_VERSION,
  type Bookmark,
  type BookmarkPage,
  type BookmarkPageType,
  type BookmarkSource,
  type BrowserKind,
  type BrowserSource,
  type TimberState,
} from "./types/timber.ts";

export {
  DEFAULT_APPEARANCE_SETTINGS,
  resolveThemeMode,
  sanitizeAppearanceSettings,
  type AppearanceSettings,
  type ResolvedTheme,
  type ThemeMode,
} from "./appearance/appearance.types.ts";

export {
  BACKUP_FORMAT,
  BACKUP_VERSION,
  createBackup,
  dropStaleNativeLinks,
  mergeBackupIntoState,
  parseBackup,
  type MergeSummary,
  type ParsedBackup,
  type TimberBackupFile,
} from "./backup/timber-backup.ts";

export { exportBookmarksHtml } from "./backup/bookmarks-html.ts";

export type {
  BookmarkSyncAddition,
  BookmarkSyncDiff,
  BookmarkSyncSelection,
  BookmarkSyncSummary,
  NativeBookmarkInput,
  NativeBookmarkRecord,
} from "./bookmarks/bookmark.types.ts";

export {
  SUPPORTED_BOOKMARK_PROTOCOLS,
  isSupportedBookmarkUrl,
  normalizeBookmarkUrl,
} from "./bookmarks/bookmark-normalizer.ts";

export {
  findFolderChainInState,
  findOrCreateFolderChainInState,
  stripBrowserContainer,
} from "./bookmarks/folder-chain.ts";

export { migrateFoldersFromPaths } from "./bookmarks/bookmark-folder-migration.ts";

export {
  applyStoredOrder,
  hasCrossedTileMidpoint,
  moveKeyInOrder,
  sortAlphabetically,
  type OrderableItem,
} from "./bookmarks/tile-ordering.ts";

export {
  ROOT_FOLDER_KEY_PREFIX,
  ROOT_LINK_KEY_PREFIX,
  computeRootTiles,
  tileLabel,
  type RootFolderTile,
  type RootLinkTile,
  type RootTile,
} from "./bookmarks/root-layout.ts";

export {
  countBookmarkInstances,
  countBookmarkInstancesInState,
  deleteBookmarkInstanceInState,
  type BookmarkInstanceTarget,
} from "./bookmarks/operations/bookmark-instances.ts";

export {
  addBookmarkToRootInState,
  createManualLinkInState,
  deleteBookmarksInState,
  registerSourceInState,
  removeNativeBookmarkInState,
  updateBookmarkInState,
  updateBookmarksInState,
  upsertNativeBookmarkInState,
} from "./bookmarks/operations/bookmark-mutations.ts";

export {
  addBookmarkToPageInState,
  createPageInState,
  deletePageInState,
  getBookmarksForPageInState,
  removeBookmarkFromPageInState,
  renamePageInState,
  setFolderChildOrderInState,
} from "./bookmarks/operations/folder-mutations.ts";

export {
  applySyncDiffInState,
  computeSyncDiffInState,
  ensureNativeFoldersInState,
  syncNativeBookmarksInState,
} from "./bookmarks/operations/sync-mutations.ts";

export {
  createEmptyTestState,
  createTestBookmark,
  createTestFolder,
} from "./testing/test-state-factory.ts";
