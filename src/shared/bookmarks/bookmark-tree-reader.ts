
import { browser } from "wxt/browser";
import type { NativeBookmarkRecord } from "./bookmark.types";

type NativeTreeNode = Browser.bookmarks.BookmarkTreeNode;

/**
 * Check whether a URL is supported by Timber's
 * initial bookmark catalog.
 */
function isSupportedUrl(url: string): boolean {
  try {
    const parsed = new URL(url);

    return (
      parsed.protocol === "http:" ||
      parsed.protocol === "https:"
    );
  } catch {
    return false;
  }
}

/**
 * Recursively convert the native browser bookmark tree
 * into flat bookmark records.
 */
function flattenBookmarkTree(
  nodes: NativeTreeNode[],
  folderPath: string[] = [],
  records: NativeBookmarkRecord[] = []
): NativeBookmarkRecord[] {
  for (const node of nodes) {
    // This is an actual bookmark.
    if (node.url) {
      if (!isSupportedUrl(node.url)) {
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

    // This is a folder.
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
 * Read all native bookmarks from the current browser.
 */
export async function readNativeBookmarkTree():
  Promise<NativeBookmarkRecord[]> {

  const tree = await browser.bookmarks.getTree();

  return flattenBookmarkTree(tree);
}
