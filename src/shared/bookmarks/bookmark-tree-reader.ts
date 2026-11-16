
/**
 * Reads the browser's native bookmark tree and flattens it into NativeBookmarkRecord items.
 */

import { browser } from "wxt/browser";
import { isSupportedBookmarkUrl } from "./bookmark-normalizer";
import type { NativeBookmarkRecord } from "./bookmark.types";

type NativeTreeNode = Browser.bookmarks.BookmarkTreeNode;

/**
 * Recursively convert the native browser bookmark tree into flat bookmark records with folder paths.
 */
function flattenBookmarkTree(
  nodes: NativeTreeNode[],
  folderPath: string[] = [],
  records: NativeBookmarkRecord[] = []
): NativeBookmarkRecord[] {
  for (const node of nodes) {
    // Leaf nodes have a URL; skip any non-http(s) bookmarklets or internal browser pages.
    if (node.url) {
      if (!isSupportedBookmarkUrl(node.url)) {
        continue;
      }

      records.push({
        nativeBookmarkId: node.id,
        url: node.url,
        title: node.title || node.url,

        parentNativeId: node.parentId,
        folderPath: [...folderPath],

        index: node.index,
        dateAdded: node.dateAdded,
      });

      continue;
    }

    // Folder nodes have children; append non-empty folder titles to the path before recursing.
    if (node.children?.length) {
      const nextFolderPath = node.title
        ? [...folderPath, node.title]
        : folderPath;

      flattenBookmarkTree(
        node.children,
        nextFolderPath,
        records
      );
    }
  }

  return records;
}

/**
 * Read all supported native bookmarks from the current browser's bookmark tree.
 */
export async function readNativeBookmarkTree():
  Promise<NativeBookmarkRecord[]> {

  const tree = await browser.bookmarks.getTree();

  return flattenBookmarkTree(tree);
}
