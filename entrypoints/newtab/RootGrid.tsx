import { Fragment, useState } from "react";
import type { RootTile } from "../../src/shared/bookmarks/root-layout";
import RootTileButton from "./RootTileButton";
import NativeFolderContents from "./NativeFolderContents";
import KebabMenu from "./KebabMenu";

interface TileBookmark {
    title: string;
    url: string;
}

interface RootGridProps {
    tiles: RootTile[];
    editMode: boolean;
    bookmarksById: Map<string, TileBookmark>;
    onReorder: (orderedKeys: string[]) => void;
    onRenameFolder: (pageId: string, currentName: string) => void;
    onDeleteFolder: (pageId: string, name: string) => void;
    onRemoveBookmarkFromFolder: (pageId: string, bookmarkId: string) => void;
    onDeleteBookmark: (bookmarkId: string, title: string) => void;
    onEditBookmark: (bookmarkId: string, title: string, url: string) => void;
    onCopyBookmark: (url: string) => void;
}

export default function RootGrid({
    tiles,
    editMode,
    bookmarksById,
    onReorder,
    onRenameFolder,
    onDeleteFolder,
    onRemoveBookmarkFromFolder,
    onDeleteBookmark,
    onEditBookmark,
    onCopyBookmark,
}: RootGridProps) {
    const [expandedKeys, setExpandedKeys] = useState<Set<string>>(new Set());
    const [dragKey, setDragKey] = useState<string | null>(null);

    function toggleExpand(key: string) {
        setExpandedKeys((current) => {
            const next = new Set(current);
            next.has(key) ? next.delete(key) : next.add(key);
            return next;
        });
    }

    function handleDrop(overKey: string) {
        if (!dragKey || dragKey === overKey) {
            setDragKey(null);
            return;
        }

        const currentKeys = tiles.map((tile) => tile.key);
        const fromIndex = currentKeys.indexOf(dragKey);
        const toIndex = currentKeys.indexOf(overKey);

        setDragKey(null);

        if (fromIndex === -1 || toIndex === -1) return;

        const next = [...currentKeys];
        next.splice(fromIndex, 1);
        next.splice(toIndex, 0, dragKey);

        onReorder(next);
    }

    if (tiles.length === 0) {
        return (
            <p className="root-grid-empty">
                No folders or links yet — use "+ Folder" or "+ Link" above, or Scan to
                pull in your browser bookmarks.
            </p>
        );
    }

    return (
        <div className="root-grid">
            {tiles.map((tile) => {
                const expanded = expandedKeys.has(tile.key);

                const actions =
                    tile.kind === "timber-folder"
                        ? [
                            { label: "Rename", onClick: () => onRenameFolder(tile.page.id, tile.page.name) },
                            { label: "Delete folder", danger: true, onClick: () => onDeleteFolder(tile.page.id, tile.page.name) },
                        ]
                        : tile.kind === "link"
                            ? [
                                { label: "Edit", onClick: () => onEditBookmark(tile.bookmark.id, tile.bookmark.title, tile.bookmark.url) },
                                { label: "Copy link", onClick: () => onCopyBookmark(tile.bookmark.url) },
                                { label: "Delete", danger: true, onClick: () => onDeleteBookmark(tile.bookmark.id, tile.bookmark.title) },
                            ]
                            : [];

                return (
                    <Fragment key={tile.key}>
                        <RootTileButton
                            tile={tile}
                            editMode={editMode}
                            expanded={expanded}
                            onToggleExpand={() => toggleExpand(tile.key)}
                            actions={actions}
                            onDragStart={() => setDragKey(tile.key)}
                            onDragOver={(event) => {
                                if (dragKey && dragKey !== tile.key) event.preventDefault();
                            }}
                            onDrop={(event) => {
                                event.preventDefault();
                                handleDrop(tile.key);
                            }}
                        />

                        {expanded && tile.kind === "timber-folder" && (
                            <div className="root-expanded-panel">
                                {(tile.page.bookmarkIds ?? []).length === 0 ? (
                                    <p className="timber-folder-empty">
                                        No bookmarks yet — use "Add to folder" on any link.
                                    </p>
                                ) : (
                                    (tile.page.bookmarkIds ?? []).map((id) => {
                                        const bookmark = bookmarksById.get(id);
                                        if (!bookmark) return null;

                                        return (
                                            <div className="folder-bookmark-row" key={id}>
                                                <a
                                                    className="folder-bookmark-link"
                                                    href={bookmark.url}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                >
                                                    {bookmark.title}
                                                </a>

                                                <div className="folder-bookmark-actions">
                                                    <KebabMenu
                                                        actions={[
                                                            { label: "Edit", onClick: () => onEditBookmark(id, bookmark.title, bookmark.url) },
                                                            { label: "Copy link", onClick: () => onCopyBookmark(bookmark.url) },
                                                            { label: "Remove from folder", onClick: () => onRemoveBookmarkFromFolder(tile.page.id, id) },
                                                            { label: "Delete", danger: true, onClick: () => onDeleteBookmark(id, bookmark.title) },
                                                        ]}
                                                    />
                                                </div>
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        )}

                        {expanded && tile.kind === "native-folder" && (
                            <div className="root-expanded-panel">
                                <NativeFolderContents
                                    node={tile.node}
                                    bookmarksById={bookmarksById}
                                    onDeleteBookmark={onDeleteBookmark}
                                    onEditBookmark={onEditBookmark}
                                    onCopyBookmark={onCopyBookmark}
                                />
                            </div>
                        )}
                    </Fragment>
                );
            })}
        </div>
    );
}
