import { Fragment, useState } from "react";
import type { BookmarkPage } from "../../src/shared/types/timber";
import KebabMenu from "./KebabMenu";

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
}

interface TimberFolderContentsProps extends TimberFolderHandlers {
    folderId: string;
    bookmarkIds: string[];
    folders: BookmarkPage[]; // every custom page, so children can be found by parentId
    bookmarksById: Map<string, TileBookmark>;
}

interface SubFolderTileProps extends TimberFolderHandlers {
    folder: BookmarkPage;
    folders: BookmarkPage[];
    bookmarksById: Map<string, TileBookmark>;
}

// One nested Timber folder — same tile language as the root grid
// (chevron, name, count, kebab), expanding into its own grid row
// that can itself hold more sub-folders.
function SubFolderTile({ folder, folders, bookmarksById, ...handlers }: SubFolderTileProps) {
    const [collapsed, setCollapsed] = useState(true);
    const bookmarkCount = (folder.bookmarkIds ?? []).length;

    return (
        <Fragment>
            <div className="root-tile">
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
    folders,
    bookmarksById,
    ...handlers
}: TimberFolderContentsProps) {
    const childFolders = folders.filter((item) => item.parentId === folderId);

    if (bookmarkIds.length === 0 && childFolders.length === 0) {
        return (
            <p className="timber-folder-empty">
                No bookmarks or folders yet — use this folder's "Add link" or "Add
                folder" option.
            </p>
        );
    }

    return (
        <>
            {bookmarkIds.map((id) => {
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
                                    { label: "Edit", onClick: () => handlers.onEditBookmark(id, bookmark.title, bookmark.url) },
                                    { label: "Copy link", onClick: () => handlers.onCopyBookmark(bookmark.url) },
                                    { label: "Remove from folder", onClick: () => handlers.onRemoveBookmarkFromFolder(folderId, id) },
                                    { label: "Delete", danger: true, onClick: () => handlers.onDeleteBookmark(id, bookmark.title) },
                                ]}
                            />
                        </div>
                    </div>
                );
            })}

            {childFolders.map((folder) => (
                <SubFolderTile
                    key={folder.id}
                    folder={folder}
                    folders={folders}
                    bookmarksById={bookmarksById}
                    {...handlers}
                />
            ))}
        </>
    );
}
