/**
 * Collapsible tile representing a nested sub-folder inside an expanded Timber folder panel.
 */

import { Fragment, useState, type ReactNode } from "react";
import type { BookmarkPage } from "@timber/core";
import KebabMenu from "../KebabMenu";

interface SubFolderTileProps {
  folder: BookmarkPage;
  editMode: boolean;
  isDragging: boolean;
  onPointerDown?: (event: React.PointerEvent<HTMLDivElement>) => void;
  onRenameFolder: (pageId: string, currentName: string) => void;
  onEditFolderLinks: (pageId: string) => void;
  onAddLinkToFolder: (pageId: string) => void;
  onAddSubFolder: (parentId: string) => void;
  onDeleteFolder: (pageId: string, name: string) => void;
  children: ReactNode;
}

/**
 * Render a nested folder tile with chevron, folder icon, item count badge, kebab menu, and expandable panel.
 */
export default function SubFolderTile({
  folder,
  editMode,
  isDragging,
  onPointerDown,
  onRenameFolder,
  onEditFolderLinks,
  onAddLinkToFolder,
  onAddSubFolder,
  onDeleteFolder,
  children,
}: SubFolderTileProps) {
  const [isCollapsed, setIsCollapsed] = useState(true);
  const bookmarkCount = (folder.bookmarkIds ?? []).length;

  const className = [
    "root-tile",
    "root-tile--folder",
    !isCollapsed && "root-tile--expanded",
    editMode && "root-tile--edit",
    isDragging && "root-tile--dragging",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <Fragment>
      <div
        className={className}
        data-tile-key={`sf:${folder.id}`}
        onPointerDown={onPointerDown}
      >
        <button
          type="button"
          className="root-tile-chevron"
          onClick={() => setIsCollapsed((value) => !value)}
          aria-label={isCollapsed ? "Expand folder" : "Collapse folder"}
        >
          {isCollapsed ? "▸" : "▾"}
        </button>

        <button
          type="button"
          className="root-tile-main"
          onClick={() => setIsCollapsed((value) => !value)}
        >
          <span className="root-tile-folder-icon" aria-hidden="true">
            📁
          </span>
          <span className="root-tile-name">{folder.name}</span>
          <span className="root-tile-count">{bookmarkCount}</span>
        </button>

        <KebabMenu
          actions={[
            {
              label: "Rename",
              onClick: () => onRenameFolder(folder.id, folder.name),
            },
            {
              label: "Edit links",
              onClick: () => onEditFolderLinks(folder.id),
            },
            {
              label: "Add link",
              onClick: () => onAddLinkToFolder(folder.id),
            },
            {
              label: "Add folder",
              onClick: () => onAddSubFolder(folder.id),
            },
            {
              label: "Delete folder",
              danger: true,
              onClick: () => onDeleteFolder(folder.id, folder.name),
            },
          ]}
        />
      </div>

      {!isCollapsed && <div className="root-expanded-panel">{children}</div>}
    </Fragment>
  );
}
