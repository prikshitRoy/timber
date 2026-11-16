/**
 * Renders the ordered contents (bookmarks and nested sub-folders) inside an expanded Timber folder.
 */

import {
  applyStoredOrder,
  sortAlphabetically,
} from "../../src/shared/bookmarks/tile-ordering";
import type { BookmarkPage } from "../../src/shared/types/timber";
import SortControls from "./SortControls";
import FolderBookmarkRow from "./components/FolderBookmarkRow";
import SubFolderTile from "./components/SubFolderTile";
import type { BookmarkSummary } from "./types";
import { useTileDragReorder } from "./useTileDragReorder";

export interface TimberFolderHandlers {
  onDeleteBookmark: (bookmarkId: string, title: string) => void;
  onEditBookmark: (bookmarkId: string, title: string, url: string) => void;
  onCopyBookmark: (url: string) => void;
  onRemoveBookmarkFromFolder: (pageId: string, bookmarkId: string) => void;
  onRenameFolder: (pageId: string, currentName: string) => void;
  onDeleteFolder: (pageId: string, name: string) => void;
  onEditFolderLinks: (pageId: string) => void;
  onAddLinkToFolder: (pageId: string) => void;
  onAddSubFolder: (parentId: string) => void;
  onReorderFolderChildren: (folderId: string, order: string[]) => void;
}

interface TimberFolderContentsProps extends TimberFolderHandlers {
  folderId: string;
  bookmarkIds: string[];
  childOrder: string[] | undefined;
  editMode: boolean;
  folders: BookmarkPage[];
  bookmarksById: Map<string, BookmarkSummary>;
}

type ChildItem =
  | { kind: "bookmark"; key: string; label: string; id: string }
  | { kind: "folder"; key: string; label: string; folder: BookmarkPage };

/**
 * Render a folder's sortable, drag-reorderable bookmark rows and nested SubFolderTile items.
 */
export default function TimberFolderContents({
  folderId,
  bookmarkIds,
  childOrder,
  editMode,
  folders,
  bookmarksById,
  ...handlers
}: TimberFolderContentsProps) {
  const childFolders = folders.filter((item) => item.parentId === folderId);

  const bookmarkItems: ChildItem[] = bookmarkIds
    .map((id): ChildItem | null => {
      const bookmark = bookmarksById.get(id);
      if (!bookmark) return null;
      return { kind: "bookmark", key: `bk:${id}`, label: bookmark.title, id };
    })
    .filter((item): item is ChildItem => item !== null);

  const folderItems: ChildItem[] = childFolders.map((folder) => ({
    kind: "folder",
    key: `sf:${folder.id}`,
    label: folder.name,
    folder,
  }));

  const items: ChildItem[] = [...bookmarkItems, ...folderItems];
  const storedOrderItems = applyStoredOrder(items, childOrder);

  const { orderedItems, isDragging, getPointerDownHandler } =
    useTileDragReorder(
      storedOrderItems,
      (item) => item.key,
      (order) => handlers.onReorderFolderChildren(folderId, order)
    );

  if (items.length === 0) {
    return (
      <p className="timber-folder-empty">
        No bookmarks or folders yet — use this folder's "Add link" or "Add
        folder" option.
      </p>
    );
  }

  /**
   * Sort all direct children of this folder A-Z or Z-A and persist the new order.
   */
  function handleSort(direction: "asc" | "desc") {
    const order = sortAlphabetically(
      items.map((item) => ({ key: item.key, label: item.label })),
      direction
    );
    handlers.onReorderFolderChildren(folderId, order);
  }

  return (
    <>
      <SortControls
        onSortAsc={() => handleSort("asc")}
        onSortDesc={() => handleSort("desc")}
      />

      {orderedItems.map((item) => {
        if (item.kind === "bookmark") {
          const bookmark = bookmarksById.get(item.id);
          if (!bookmark) return null;

          return (
            <FolderBookmarkRow
              key={item.key}
              tileKey={item.key}
              bookmarkId={item.id}
              folderId={folderId}
              bookmark={bookmark}
              editMode={editMode}
              isDragging={isDragging(item.key)}
              onPointerDown={
                editMode ? getPointerDownHandler(item.key) : undefined
              }
              onEditBookmark={handlers.onEditBookmark}
              onCopyBookmark={handlers.onCopyBookmark}
              onRemoveBookmarkFromFolder={handlers.onRemoveBookmarkFromFolder}
              onDeleteBookmark={handlers.onDeleteBookmark}
            />
          );
        }

        return (
          <SubFolderTile
            key={item.key}
            folder={item.folder}
            editMode={editMode}
            isDragging={isDragging(item.key)}
            onPointerDown={
              editMode ? getPointerDownHandler(item.key) : undefined
            }
            onRenameFolder={handlers.onRenameFolder}
            onEditFolderLinks={handlers.onEditFolderLinks}
            onAddLinkToFolder={handlers.onAddLinkToFolder}
            onAddSubFolder={handlers.onAddSubFolder}
            onDeleteFolder={handlers.onDeleteFolder}
          >
            <TimberFolderContents
              folderId={item.folder.id}
              bookmarkIds={item.folder.bookmarkIds ?? []}
              childOrder={item.folder.childOrder}
              editMode={editMode}
              folders={folders}
              bookmarksById={bookmarksById}
              {...handlers}
            />
          </SubFolderTile>
        );
      })}
    </>
  );
}
