/**
 * Top-level tile button rendered in RootGrid for either a folder or a standalone link.
 */

import {
  tileLabel,
  type RootTile,
} from "@timber/core";
import KebabMenu, { type KebabMenuAction } from "./KebabMenu";
import BookmarkFavicon from "./components/BookmarkFavicon";

interface RootTileButtonProps {
  tile: RootTile;
  editMode: boolean;
  expanded: boolean;
  onToggleExpand: () => void;
  actions: KebabMenuAction[];
  childFolderCount?: number;
  isDragging: boolean;
  onPointerDown?: (event: React.PointerEvent<HTMLDivElement>) => void;
}

/**
 * Return the total direct item count (bookmarks + sub-folders) for a folder tile, or null for a link.
 */
function tileCount(tile: RootTile, childFolderCount: number): number | null {
  if (tile.kind !== "folder") return null;
  return (tile.page.bookmarkIds ?? []).length + childFolderCount;
}

/**
 * Render a root grid tile with expand chevron (for folders) or favicon (for links), title, item count badge, and kebab actions.
 */
export default function RootTileButton({
  tile,
  editMode,
  expanded,
  onToggleExpand,
  actions,
  childFolderCount = 0,
  isDragging,
  onPointerDown,
}: RootTileButtonProps) {
  const isExpandable = tile.kind !== "link";
  const count = tileCount(tile, childFolderCount);

  const className = [
    "root-tile",
    tile.kind === "folder" ? "root-tile--folder" : "root-tile--link",
    expanded && "root-tile--expanded",
    editMode && "root-tile--edit",
    isDragging && "root-tile--dragging",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div
      className={className}
      data-tile-key={tile.key}
      onPointerDown={onPointerDown}
    >
      {isExpandable ? (
        <button
          type="button"
          className="root-tile-chevron"
          onClick={onToggleExpand}
          aria-label={expanded ? "Collapse folder" : "Expand folder"}
        >
          {expanded ? "▾" : "▸"}
        </button>
      ) : (
        <BookmarkFavicon
          url={tile.bookmark.url}
          title={tile.bookmark.title}
        />
      )}

      <button
        type="button"
        className="root-tile-main"
        title={tile.kind === "link" ? `${tile.bookmark.title}\n${tile.bookmark.url}` : tile.page.name}
        onClick={() => {
          if (tile.kind === "link") {
            window.open(tile.bookmark.url, "_blank", "noopener,noreferrer");
          } else {
            onToggleExpand();
          }
        }}
      >
        {tile.kind === "folder" && (
          <span className="root-tile-folder-icon" aria-hidden="true">
            📁
          </span>
        )}
        <span className="root-tile-name">{tileLabel(tile)}</span>
        {count !== null && <span className="root-tile-count">{count}</span>}
      </button>

      <KebabMenu actions={actions} />
    </div>
  );
}
