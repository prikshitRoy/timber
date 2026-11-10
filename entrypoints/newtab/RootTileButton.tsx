import { useState, useRef, useEffect } from "react";
import type { RootTile } from "../../src/shared/bookmarks/root-layout";

interface MenuAction {
    label: string;
    onClick: () => void;
    danger?: boolean;
}

interface RootTileButtonProps {
    tile: RootTile;
    editMode: boolean;
    expanded: boolean;
    onToggleExpand: () => void;
    actions: MenuAction[];
    childFolderCount?: number;
    onDragStart: () => void;
    onDragOver: (event: React.DragEvent) => void;
    onDragLeave: () => void;
    onDrop: (event: React.DragEvent) => void;
    onDragEnd: () => void;
    isDragging: boolean;
    isDropTarget: boolean;
}

function tileIcon(tile: RootTile): string {
    return tile.kind === "link" ? "🔗" : "📁";
}

function tileLabel(tile: RootTile): string {
    return tile.kind === "folder" ? tile.page.name : tile.bookmark.title;
}

function tileCount(tile: RootTile, childFolderCount: number): number | null {
    if (tile.kind !== "folder") return null;
    return (tile.page.bookmarkIds ?? []).length + childFolderCount;
}

export default function RootTileButton({
    tile,
    editMode,
    expanded,
    onToggleExpand,
    actions,
    childFolderCount = 0,
    onDragStart,
    onDragOver,
    onDragLeave,
    onDrop,
    onDragEnd,
    isDragging,
    isDropTarget,
}: RootTileButtonProps) {
    const [menuOpen, setMenuOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!menuOpen) return;

        function handleOutside(event: MouseEvent) {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setMenuOpen(false);
            }
        }

        document.addEventListener("mousedown", handleOutside);
        return () => document.removeEventListener("mousedown", handleOutside);
    }, [menuOpen]);

    const isExpandable = tile.kind !== "link";
    const count = tileCount(tile, childFolderCount);

    const className = [
        "root-tile",
        editMode && "root-tile--edit",
        isDragging && "root-tile--dragging",
        isDropTarget && "root-tile--drop-target",
    ]
        .filter(Boolean)
        .join(" ");

    return (
        <div
            className={className}
            draggable={editMode}
            onDragStart={onDragStart}
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            onDrop={onDrop}
            onDragEnd={onDragEnd}
        >
            {isExpandable ? (
                <button type="button" className="root-tile-chevron" onClick={onToggleExpand}>
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

            {actions.length > 0 && (
                <div className="root-tile-menu" ref={menuRef}>
                    <button
                        type="button"
                        className="root-tile-kebab"
                        onClick={() => setMenuOpen((value) => !value)}
                    >
                        ⋮
                    </button>

                    {menuOpen && (
                        <div className="root-tile-menu-popover">
                            {actions.map((action) => (
                                <button
                                    type="button"
                                    key={action.label}
                                    className={action.danger ? "root-tile-menu-danger" : ""}
                                    onClick={() => {
                                        setMenuOpen(false);
                                        action.onClick();
                                    }}
                                >
                                    {action.label}
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
