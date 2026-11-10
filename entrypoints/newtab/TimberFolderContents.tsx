import { Fragment, useState } from "react";
import type { BookmarkPage } from "../../src/shared/types/timber";
import { applyStoredOrder, sortAlphabetically } from "../../src/shared/bookmarks/tile-ordering";
import KebabMenu from "./KebabMenu";
import SortControls from "./SortControls";
import { useTileDragReorder } from "./useTileDragReorder";

interface TileBookmark {
    title: string;
    url: string;
}

export interface TimberFolderHandlers {
    onDeleteBookmark: (bookmarkId: string, title: string) => void;
    onEditBookmark: (bookmarkId: string, title: string, url: string) => void;
    onCopyBookmark: (url: string) => void;
    onRemoveBookmarkFromFolder: (pageId: string, bookmarkId: string) => void;
    onRenameFolder: (pageId: string, currentName: string) => void;
    onDeleteFolder: (pageId: string, name: string) => void;
    onEditFolderLinks: (pageId: string) => void;
    onAddLinkToFolder: (pageId: string) => void;
    onAddSubFolder: (parentId: string) => void;
    onReorderFolderChildren: (folderId: string, order: string[]) => void;
}

interface TimberFolderContentsProps extends TimberFolderHandlers {
    folderId: string;
    bookmarkIds: string[];
    childOrder: string[] | undefined;
    editMode: boolean;
    folders: BookmarkPage[]; // every custom page, so children can be found by parentId
    bookmarksById: Map<string, TileBookmark>;
}

type ChildItem =
    | { kind: "bookmark"; key: string; label: string; id: string }
    | { kind: "folder"; key: string; label: string; folder: BookmarkPage };

interface SubFolderTileProps extends TimberFolderHandlers {
    folder: BookmarkPage;
    editMode: boolean;
    folders: BookmarkPage[];
    bookmarksById: Map<string, TileBookmark>;
    dragHandlers: {
        onDragStart: () => void;
        onDragOver: (event: React.DragEvent) => void;
        onDrop: (event: React.DragEvent) => void;
    };
}

// A nested Timber folder — same tile language as the root grid
// (chevron, name, count, kebab), draggable among its siblings and
// expanding into its own merged, sortable grid row.
function SubFolderTile({
    folder,
    folders,
    bookmarksById,
    editMode,
    dragHandlers,
    ...handlers
}: SubFolderTileProps) {
    const [collapsed, setCollapsed] = useState(true);
    const bookmarkCount = (folder.bookmarkIds ?? []).length;

    return (
        <Fragment>
            <div
                className={`root-tile${editMode ? " root-tile--edit" : ""}`}
                draggable={editMode}
                {...dragHandlers}
            >
                <button
                    type="button"
                    className="root-tile-chevron"
                    onClick={() => setCollapsed((value) => !value)}
                >
                    {collapsed ? "▸" : "▾"}
                </button>

                <button
                    type="button"
                    className="root-tile-main"
                    onClick={() => setCollapsed((value) => !value)}
                >
                    <span className="root-tile-name">{folder.name}</span>
                    <span className="root-tile-count">{bookmarkCount}</span>
                </button>

                <KebabMenu
                    actions={[
                        { label: "Rename", onClick: () => handlers.onRenameFolder(folder.id, folder.name) },
                        { label: "Edit links", onClick: () => handlers.onEditFolderLinks(folder.id) },
                        { label: "Add link", onClick: () => handlers.onAddLinkToFolder(folder.id) },
                        { label: "Add folder", onClick: () => handlers.onAddSubFolder(folder.id) },
                        { label: "Delete folder", danger: true, onClick: () => handlers.onDeleteFolder(folder.id, folder.name) },
                    ]}
                />
            </div>

            {!collapsed && (
                <div className="root-expanded-panel">
                    <TimberFolderContents
                        folderId={folder.id}
                        bookmarkIds={folder.bookmarkIds ?? []}
                        childOrder={folder.childOrder}
                        editMode={editMode}
                        folders={folders}
                        bookmarksById={bookmarksById}
                        {...handlers}
                    />
                </div>
            )}
        </Fragment>
    );
}

export default function TimberFolderContents({
    folderId,
    bookmarkIds,
    childOrder,
    editMode,
    folders,
    bookmarksById,
    ...handlers
}: TimberFolderContentsProps) {
    const childFolders = folders.filter((item) => item.parentId === folderId);

    const bookmarkItems: ChildItem[] = bookmarkIds
        .map((id): ChildItem | null => {
            const bookmark = bookmarksById.get(id);
            if (!bookmark) return null;
            return { kind: "bookmark", key: `bk:${id}`, label: bookmark.title, id };
        })
        .filter((item): item is ChildItem => item !== null);

    const folderItems: ChildItem[] = childFolders.map((folder) => ({
        kind: "folder",
        key: `sf:${folder.id}`,
        label: folder.name,
        folder,
    }));

    const items: ChildItem[] = [...bookmarkItems, ...folderItems];

    const orderedItems = applyStoredOrder(items, childOrder);

    const { getDragHandlers } = useTileDragReorder(
        orderedItems.map((item) => item.key),
        (order) => handlers.onReorderFolderChildren(folderId, order)
    );

    if (orderedItems.length === 0) {
        return (
            <p className="timber-folder-empty">
                No bookmarks or folders yet — use this folder's "Add link" or "Add
                folder" option.
            </p>
        );
    }

    function handleSort(direction: "asc" | "desc") {
        const order = sortAlphabetically(
            items.map((item) => ({ key: item.key, label: item.label })),
            direction
        );
        handlers.onReorderFolderChildren(folderId, order);
    }

    return (
        <>
            <SortControls
                onSortAsc={() => handleSort("asc")}
                onSortDesc={() => handleSort("desc")}
            />

            {orderedItems.map((item) => {
                if (item.kind === "bookmark") {
                    const bookmark = bookmarksById.get(item.id);
                    if (!bookmark) return null;

                    return (
                        <div
                            className={`folder-bookmark-row${editMode ? " folder-bookmark-row--edit" : ""}`}
                            key={item.key}
                            draggable={editMode}
                            {...getDragHandlers(item.key)}
                        >
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
                                        { label: "Edit", onClick: () => handlers.onEditBookmark(item.id, bookmark.title, bookmark.url) },
                                        { label: "Copy link", onClick: () => handlers.onCopyBookmark(bookmark.url) },
                                        { label: "Remove from folder", onClick: () => handlers.onRemoveBookmarkFromFolder(folderId, item.id) },
                                        { label: "Delete", danger: true, onClick: () => handlers.onDeleteBookmark(item.id, bookmark.title) },
                                    ]}
                                />
                            </div>
                        </div>
                    );
                }

                return (
                    <SubFolderTile
                        key={item.key}
                        folder={item.folder}
                        editMode={editMode}
                        folders={folders}
                        bookmarksById={bookmarksById}
                        dragHandlers={getDragHandlers(item.key)}
                        {...handlers}
                    />
                );
            })}
        </>
    );
}
