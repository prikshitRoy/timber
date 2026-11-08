import { Fragment, useState } from "react";
import type { RootTile } from "../../src/shared/bookmarks/root-layout";
import type { BookmarkPage } from "../../src/shared/types/timber";
import RootTileButton from "./RootTileButton";
import NativeFolderContents from "./NativeFolderContents";
import TimberFolderContents, { type TimberFolderHandlers } from "./TimberFolderContents";

interface TileBookmark {
    title: string;
    url: string;
}

interface RootGridProps {
    tiles: RootTile[];
    editMode: boolean;
    folders: BookmarkPage[];
    bookmarksById: Map<string, TileBookmark>;
    shadowPages: Record<string, string>;
    onReorder: (orderedKeys: string[]) => void;
    onRenameFolder: (pageId: string, currentName: string) => void;
    onDeleteFolder: (pageId: string, name: string) => void;
    onRemoveBookmarkFromFolder: (pageId: string, bookmarkId: string) => void;
    onDeleteBookmark: (bookmarkId: string, title: string) => void;
    onEditBookmark: (bookmarkId: string, title: string, url: string) => void;
    onCopyBookmark: (url: string) => void;
    onEditFolderLinks: (pageId: string) => void;
    onEditNativeFolderLinks: (key: string) => void;
    onDeleteNativeFolder: (label: string, bookmarkIds: string[]) => void;
    onAddLinkToFolder: (pageId: string) => void;
    onAddSubFolder: (parentId: string) => void;
    onAddLinkToNativeFolder: (key: string, label: string) => void;
    onAddSubFolderToNativeFolder: (key: string, label: string) => void;
}

export default function RootGrid({
    tiles,
    editMode,
    folders,
    bookmarksById,
    shadowPages,
    onReorder,
    onRenameFolder,
    onDeleteFolder,
    onRemoveBookmarkFromFolder,
    onDeleteBookmark,
    onEditBookmark,
    onCopyBookmark,
    onEditFolderLinks,
    onEditNativeFolderLinks,
    onDeleteNativeFolder,
    onAddLinkToFolder,
    onAddSubFolder,
    onAddLinkToNativeFolder,
    onAddSubFolderToNativeFolder,
}: RootGridProps) {
    const [expandedKeys, setExpandedKeys] = useState<Set<string>>(new Set());
    const [dragKey, setDragKey] = useState<string | null>(null);

    const timberHandlers: TimberFolderHandlers = {
        onDeleteBookmark,
        onEditBookmark,
        onCopyBookmark,
        onRemoveBookmarkFromFolder,
        onRenameFolder,
        onDeleteFolder,
        onEditFolderLinks,
        onAddLinkToFolder,
        onAddSubFolder,
    };

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
                            { label: "Edit links", onClick: () => onEditFolderLinks(tile.page.id) },
                            { label: "Add link", onClick: () => onAddLinkToFolder(tile.page.id) },
                            { label: "Add folder", onClick: () => onAddSubFolder(tile.page.id) },
                            { label: "Delete folder", danger: true, onClick: () => onDeleteFolder(tile.page.id, tile.page.name) },
                        ]
                        : tile.kind === "link"
                            ? [
                                { label: "Edit", onClick: () => onEditBookmark(tile.bookmark.id, tile.bookmark.title, tile.bookmark.url) },
                                { label: "Copy link", onClick: () => onCopyBookmark(tile.bookmark.url) },
                                { label: "Delete", danger: true, onClick: () => onDeleteBookmark(tile.bookmark.id, tile.bookmark.title) },
                            ]
                            : tile.kind === "native-folder"
                                ? [
                                    { label: "Edit links", onClick: () => onEditNativeFolderLinks(tile.key) },
                                    { label: "Add link", onClick: () => onAddLinkToNativeFolder(tile.key, tile.folderName) },
                                    { label: "Add folder", onClick: () => onAddSubFolderToNativeFolder(tile.key, tile.folderName) },
                                    { label: "Delete folder", danger: true, onClick: () => onDeleteNativeFolder(tile.folderName, tile.node.bookmarkIds) },
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
                                <TimberFolderContents
                                    folderId={tile.page.id}
                                    bookmarkIds={tile.page.bookmarkIds ?? []}
                                    folders={folders}
                                    bookmarksById={bookmarksById}
                                    {...timberHandlers}
                                />
                            </div>
                        )}

                        {expanded && tile.kind === "native-folder" && (
                            <div className="root-expanded-panel">
                                <NativeFolderContents
                                    node={tile.node}
                                    sourceId={tile.source.id}
                                    bookmarksById={bookmarksById}
                                    folders={folders}
                                    shadowPages={shadowPages}
                                    onDeleteBookmark={onDeleteBookmark}
                                    onEditBookmark={onEditBookmark}
                                    onCopyBookmark={onCopyBookmark}
                                    onEditNativeFolderLinks={onEditNativeFolderLinks}
                                    onDeleteNativeFolder={onDeleteNativeFolder}
                                    onAddLinkToNativeFolder={onAddLinkToNativeFolder}
                                    onAddSubFolderToNativeFolder={onAddSubFolderToNativeFolder}
                                    timberHandlers={timberHandlers}
                                />
                            </div>
                        )}
                    </Fragment>
                );
            })}
        </div>
    );
}
