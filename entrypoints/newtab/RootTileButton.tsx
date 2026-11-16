/**
 * Top-level tile button rendered in RootGrid for either a folder or a standalone link.
 */

import {
  tileLabel,
  type RootTile,
} from "../../src/shared/bookmarks/root-layout";
import KebabMenu, { type KebabMenuAction } from "./KebabMenu";

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
 * Return the emoji icon for a root link or folder tile.
 */
function tileIcon(tile: RootTile): string {
  return tile.kind === "link" ? "🔗" : "📁";
}

/**
 * Return the total direct item count (bookmarks + sub-folders) for a folder tile, or null for a link.
 */
function tileCount(tile: RootTile, childFolderCount: number): number | null {
  if (tile.kind !== "folder") return null;
  return (tile.page.bookmarkIds ?? []).length + childFolderCount;
}

/**
 * Render a root grid tile with expand chevron (for folders), title, item count, and kebab actions.
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
        >
          {expanded ? "▾" : "▸"}
        </button>
      ) : (
        <span className="root-tile-icon">{tileIcon(tile)}</span>
      )}

      <button
        type="button"
        className="root-tile-main"
        onClick={() => {
          if (tile.kind === "link") {
            window.open(tile.bookmark.url, "_blank", "noopener,noreferrer");
          } else {
            onToggleExpand();
          }
        }}
      >
        <span className="root-tile-name">{tileLabel(tile)}</span>
        {count !== null && <span className="root-tile-count">{count}</span>}
      </button>

      <KebabMenu actions={actions} />
    </div>
  );
}
