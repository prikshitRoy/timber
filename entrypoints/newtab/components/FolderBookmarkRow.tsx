/**
 * Single draggable bookmark row rendered inside an expanded Timber folder panel.
 */

import type { BookmarkInstanceTarget } from "../../../src/shared/bookmarks/operations/bookmark-instances";
import KebabMenu from "../KebabMenu";
import type { BookmarkSummary } from "../types";
import BookmarkFavicon from "./BookmarkFavicon";

interface FolderBookmarkRowProps {
  tileKey: string;
  bookmarkId: string;
  folderId: string;
  bookmark: BookmarkSummary;
  editMode: boolean;
  isDragging: boolean;
  onPointerDown?: (event: React.PointerEvent<HTMLDivElement>) => void;
  onEditBookmark: (bookmarkId: string, title: string, url: string) => void;
  onCopyBookmark: (url: string) => void;
  onRemoveBookmarkFromFolder: (pageId: string, bookmarkId: string) => void;
  onDeleteBookmark: (
    bookmarkId: string,
    title: string,
    target: BookmarkInstanceTarget
  ) => void;
}

/**
 * Render a compact horizontal bookmark link row with favicon, title, drag support, and kebab menu.
 */
export default function FolderBookmarkRow({
  tileKey,
  bookmarkId,
  folderId,
  bookmark,
  editMode,
  isDragging,
  onPointerDown,
  onEditBookmark,
  onCopyBookmark,
  onRemoveBookmarkFromFolder,
  onDeleteBookmark,
}: FolderBookmarkRowProps) {
  const className = [
    "folder-bookmark-row",
    editMode && "folder-bookmark-row--edit",
    isDragging && "folder-bookmark-row--dragging",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div
      className={className}
      data-tile-key={tileKey}
      onPointerDown={onPointerDown}
    >
      <BookmarkFavicon url={bookmark.url} title={bookmark.title} />

      <a
        className="folder-bookmark-link"
        href={bookmark.url}
        target="_blank"
        rel="noopener noreferrer"
        draggable={false}
        title={`${bookmark.title}\n${bookmark.url}`}
      >
        {bookmark.title}
      </a>

      <KebabMenu
        actions={[
          {
            label: "Edit",
            onClick: () =>
              onEditBookmark(bookmarkId, bookmark.title, bookmark.url),
          },
          {
            label: "Copy link",
            onClick: () => onCopyBookmark(bookmark.url),
          },
          {
            label: "Remove from folder",
            onClick: () => onRemoveBookmarkFromFolder(folderId, bookmarkId),
          },
          {
            label: "Delete",
            danger: true,
            onClick: () =>
              onDeleteBookmark(bookmarkId, bookmark.title, {
                kind: "folder",
                folderId,
              }),
          },
        ]}
      />
    </div>
  );
}
