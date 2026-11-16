/**
 * Public barrel export for the Timber bookmarks domain module.
 */

export type {
  BookmarkSyncAddition,
  BookmarkSyncDiff,
  BookmarkSyncSelection,
  BookmarkSyncSummary,
  NativeBookmarkInput,
  NativeBookmarkRecord,
} from "./bookmark.types";

export {
  SUPPORTED_BOOKMARK_PROTOCOLS,
  isSupportedBookmarkUrl,
  normalizeBookmarkUrl,
} from "./bookmark-normalizer";

export { readNativeBookmarkTree } from "./bookmark-tree-reader";
export {
  findOrCreateFolderChainInState,
  stripBrowserContainer,
} from "./folder-chain";
export { migrateFoldersFromPaths } from "./bookmark-folder-migration";
export {
  applyStoredOrder,
  sortAlphabetically,
  type OrderableItem,
} from "./tile-ordering";
export {
  ROOT_FOLDER_KEY_PREFIX,
  ROOT_LINK_KEY_PREFIX,
  computeRootTiles,
  tileLabel,
  type RootFolderTile,
  type RootLinkTile,
  type RootTile,
} from "./root-layout";
export { bookmarkRepository } from "./bookmark-repository";
export {
  applyCurrentBrowserSyncSelection,
  computeCurrentBrowserSyncDiff,
  hasBookmarkPermission,
  requestBookmarkPermission,
  syncCurrentBrowserBookmarks,
} from "./bookmark-synchronizer";
