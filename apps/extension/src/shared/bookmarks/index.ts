/**
 * Public barrel export for the Timber extension bookmarks module.
 */

export {
  ROOT_FOLDER_KEY_PREFIX,
  ROOT_LINK_KEY_PREFIX,
  SUPPORTED_BOOKMARK_PROTOCOLS,
  applyStoredOrder,
  computeRootTiles,
  countBookmarkInstances,
  countBookmarkInstancesInState,
  deleteBookmarkInstanceInState,
  findFolderChainInState,
  findOrCreateFolderChainInState,
  isSupportedBookmarkUrl,
  migrateFoldersFromPaths,
  normalizeBookmarkUrl,
  sortAlphabetically,
  stripBrowserContainer,
  tileLabel,
  type BookmarkInstanceTarget,
  type BookmarkSyncAddition,
  type BookmarkSyncDiff,
  type BookmarkSyncSelection,
  type BookmarkSyncSummary,
  type NativeBookmarkInput,
  type NativeBookmarkRecord,
  type OrderableItem,
  type RootFolderTile,
  type RootLinkTile,
  type RootTile,
} from "@timber/core";

export { readNativeBookmarkTree } from "./bookmark-tree-reader";
export { bookmarkRepository } from "./bookmark-repository";
export {
  applyCurrentBrowserSyncSelection,
  computeCurrentBrowserSyncDiff,
  hasBookmarkPermission,
  requestBookmarkPermission,
  syncCurrentBrowserBookmarks,
} from "./bookmark-synchronizer";
