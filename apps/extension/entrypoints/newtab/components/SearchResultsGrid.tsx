/**
 * Displays filtered bookmark cards when the user types a search query in the dashboard header.
 */

import type { BookmarkInstanceTarget } from "../../../src/shared/bookmarks/operations/bookmark-instances";
import type { BookmarkPage } from "../../../src/shared/types/timber";
import AddToFolderMenu from "../AddToFolderMenu";
import KebabMenu from "../KebabMenu";
import type { DashboardBookmark } from "../types";
import BookmarkFavicon from "./BookmarkFavicon";

interface SearchResultsGridProps {
  bookmarks: DashboardBookmark[];
  folders: BookmarkPage[];
  onAddBookmarkToFolder: (bookmarkId: string, folderId: string) => void;
  onCreateFolderAndAdd: (bookmarkId: string, name: string) => void;
  onEditBookmark: (bookmarkId: string, title: string, url: string) => void;
  onCopyBookmark: (url: string) => void;
  onDeleteBookmark: (
    bookmarkId: string,
    title: string,
    target: BookmarkInstanceTarget
  ) => void;
}

/**
 * Render matching bookmark cards for the active search query, or an empty state when none match.
 */
export default function SearchResultsGrid({
  bookmarks,
  folders,
  onAddBookmarkToFolder,
  onCreateFolderAndAdd,
  onEditBookmark,
  onCopyBookmark,
  onDeleteBookmark,
}: SearchResultsGridProps) {
  if (bookmarks.length === 0) {
    return (
      <section className="empty-state">
        <h3>No bookmarks found</h3>
        <p>Try a different search.</p>
      </section>
    );
  }

  return (
    <section className="bookmark-grid">
      {bookmarks.map((bookmark) => (
        <article className="bookmark-card" key={bookmark.id}>
          <a
            className="bookmark-link"
            href={bookmark.url}
            target="_blank"
            rel="noopener noreferrer"
          >
            <div className="bookmark-card-header">
              <BookmarkFavicon url={bookmark.url} title={bookmark.title} />
              <h3>{bookmark.title}</h3>
            </div>
            <p>{bookmark.url}</p>
          </a>

          <footer>
            <span>
              {bookmark.sourceCount} browser
              {bookmark.sourceCount === 1 ? "" : "s"}
            </span>

            <AddToFolderMenu
              bookmarkId={bookmark.id}
              folders={folders}
              onAdd={onAddBookmarkToFolder}
              onCreateAndAdd={onCreateFolderAndAdd}
            />

            <KebabMenu
              actions={[
                {
                  label: "Edit",
                  onClick: () =>
                    onEditBookmark(bookmark.id, bookmark.title, bookmark.url),
                },
                {
                  label: "Copy link",
                  onClick: () => onCopyBookmark(bookmark.url),
                },
                {
                  label: "Delete",
                  danger: true,
                  onClick: () =>
                    onDeleteBookmark(bookmark.id, bookmark.title, {
                      kind: "root",
                    }),
                },
              ]}
            />
          </footer>
        </article>
      ))}
    </section>
  );
}
