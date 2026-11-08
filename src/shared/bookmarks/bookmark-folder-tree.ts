import type { BookmarkSource } from "../types/timber";

export interface NativeFolderNode {
  name: string;
  path: string[];
  children: Map<string, NativeFolderNode>;
  bookmarkIds: string[];
}

export function buildNativeFolderTree(
  bookmarkSources: BookmarkSource[],
  sourceId: string
): NativeFolderNode {
  const root: NativeFolderNode = {
    name: "",
    path: [],
    children: new Map(),
    bookmarkIds: [],
  };

  for (const occurrence of bookmarkSources) {
    if (occurrence.sourceId !== sourceId) continue;

    let node = root;

    for (const segment of occurrence.folderPath) {
      let child = node.children.get(segment);

      if (!child) {
        child = {
          name: segment,
          path: [...node.path, segment],
          children: new Map(),
          bookmarkIds: [],
        };

        node.children.set(segment, child);
      }

      node = child;
    }

    node.bookmarkIds.push(occurrence.bookmarkId);
  }

  return root;
}



// Recursively flatten every bookmark ID under a folder node,
// including ones nested inside sub-folders — used by the
// "Edit links" bulk-selection popup.
export function collectBookmarkIds(node: NativeFolderNode): string[] {
  const ids = [...node.bookmarkIds];

  for (const child of node.children.values()) {
    ids.push(...collectBookmarkIds(child));
  }

  return ids;
}

