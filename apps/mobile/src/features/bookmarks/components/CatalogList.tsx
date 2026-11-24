/**
 * Main mobile bookmark list rendering either filtered search results or ordered root tiles.
 */

import type { Bookmark, BookmarkPage, RootTile } from "@timber/core";
import type { BookmarkActionLocation } from "../state/bookmark-item-mutations";
import BookmarkRow from "./BookmarkRow";
import FolderItem from "./FolderItem";

interface CatalogListProps {
  query: string;
  searchResults: Bookmark[];
  rootTiles: RootTile[];
  folders: BookmarkPage[];
  bookmarksById: Map<string, Bookmark>;
  defaultBrowserLabel: string;
  onOpenUrl: (url: string) => void;
  onChooseBrowser: (bookmark: Bookmark) => void;
  onCopyUrl: (url: string) => void;
  onOpenBookmarkActions: (
    bookmark: Bookmark,
    location: BookmarkActionLocation
  ) => void;
}

/**
 * Render matching bookmarks when a search query is active, or the root folder/bookmark tree otherwise.
 */
export default function CatalogList({
  query,
  searchResults,
  rootTiles,
  folders,
  bookmarksById,
  defaultBrowserLabel,
  onOpenUrl,
  onChooseBrowser,
  onCopyUrl,
  onOpenBookmarkActions,
}: CatalogListProps) {
  const hasActiveQuery = query.trim().length > 0;

  if (hasActiveQuery) {
    if (searchResults.length === 0) {
      return (

      <div className="py-16 text-center">
          <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
            No bookmarks found
          </p>
          <p className="mt-1 text-xs text-zinc-500">
            Try a different title or URL search term.
          </p>
        </div>
      );
    }

    return (
      <section className="flex flex-col gap-2">
        <p className="px-1 text-xs font-medium text-zinc-500 dark:text-zinc-400">
          {searchResults.length} matching bookmark
          {searchResults.length === 1 ? "" : "s"}
        </p>

        {searchResults.map((bookmark) => (
          <BookmarkRow
            key={bookmark.id}
            bookmark={bookmark}
            defaultBrowserLabel={defaultBrowserLabel}
            onOpenUrl={onOpenUrl}
            onChooseBrowser={onChooseBrowser}
            onCopyUrl={onCopyUrl}
            onOpenActions={(bm) =>
              onOpenBookmarkActions(bm, { kind: "search" })
            }
          />
        ))}
      </section>
    );
  }

  return (
    <section className="flex flex-col gap-2.5">
      {rootTiles.map((tile) =>
        tile.kind === "folder" ? (
          <FolderItem
            key={tile.key}
            folder={tile.page}
            allFolders={folders}
            bookmarksById={bookmarksById}
            defaultBrowserLabel={defaultBrowserLabel}
            onOpenUrl={onOpenUrl}
            onChooseBrowser={onChooseBrowser}
            onCopyUrl={onCopyUrl}
            onOpenBookmarkActions={onOpenBookmarkActions}
          />
        ) : (
          <BookmarkRow
            key={tile.key}
            bookmark={tile.bookmark}
            defaultBrowserLabel={defaultBrowserLabel}
            onOpenUrl={onOpenUrl}
            onChooseBrowser={onChooseBrowser}
            onCopyUrl={onCopyUrl}
            onOpenActions={(bm) => onOpenBookmarkActions(bm, { kind: "root" })}
          />
        )
      )}
    </section>
  );
}
