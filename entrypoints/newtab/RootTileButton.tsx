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
    extraMenuContent?: React.ReactNode;
    onDragStart: () => void;
    onDragOver: (event: React.DragEvent) => void;
    onDrop: (event: React.DragEvent) => void;
}

function tileIcon(tile: RootTile): string {
    return tile.kind === "link" ? "🔗" : "📁";
}

function tileLabel(tile: RootTile): string {
    if (tile.kind === "timber-folder") return tile.page.name;
    if (tile.kind === "native-folder") return tile.folderName;
    return tile.bookmark.title;
}

function tileCount(tile: RootTile): number | null {
    if (tile.kind === "timber-folder") return (tile.page.bookmarkIds ?? []).length;
    if (tile.kind === "native-folder") {
        return tile.node.bookmarkIds.length + tile.node.children.size;
    }
    return null;
}

export default function RootTileButton({
    tile,
    editMode,
    expanded,
    onToggleExpand,
    actions,
    extraMenuContent,
    onDragStart,
    onDragOver,
    onDrop,
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
    const count = tileCount(tile);

    return (
        <div
            className={`root-tile${editMode ? " root-tile--edit" : ""}`}
            draggable={editMode}
            onDragStart={onDragStart}
            onDragOver={onDragOver}
            onDrop={onDrop}
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

            {(actions.length > 0 || extraMenuContent) && (
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
                            {extraMenuContent}
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
