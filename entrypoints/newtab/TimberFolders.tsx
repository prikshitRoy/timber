import { useState } from "react";
import type { BookmarkPage } from "../../src/shared/types/timber";

interface TimberFolderBookmark {
    title: string;
    url: string;
}

interface FolderRowProps {
    folder: BookmarkPage;
    bookmarksById: Map<string, TimberFolderBookmark>;
    onRemoveBookmark: (folderId: string, bookmarkId: string) => void;
    onDeleteFolder: (folderId: string, name: string) => void;
}

function FolderRow({ folder, bookmarksById, onRemoveBookmark, onDeleteFolder }: FolderRowProps) {
    const [collapsed, setCollapsed] = useState(false);
    const bookmarkIds = folder.bookmarkIds ?? [];

    return (
        <div className="timber-folder">
            <div className="timber-folder-header">
                <button
                    type="button"
                    className="folder-header"
                    onClick={() => setCollapsed((value) => !value)}
                >
                    {collapsed ? "▶" : "▼"} {folder.name}
                    <span className="timber-folder-count">{bookmarkIds.length}</span>
                </button>

                <button
                    type="button"
                    className="delete-button"
                    onClick={() => onDeleteFolder(folder.id, folder.name)}
                >
                    Delete folder
                </button>
            </div>

            {!collapsed && (
                <div className="folder-body">
                    {bookmarkIds.length === 0 ? (
                        <p className="timber-folder-empty">No bookmarks yet.</p>
                    ) : (
                        bookmarkIds.map((id) => {
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

                                    <button
                                        type="button"
                                        className="delete-button"
                                        onClick={() => onRemoveBookmark(folder.id, id)}
                                    >
                                        Remove
                                    </button>
                                </div>
                            );
                        })
                    )}
                </div>
            )}
        </div>
    );
}

interface TimberFoldersProps {
    folders: BookmarkPage[];
    bookmarksById: Map<string, TimberFolderBookmark>;
    onCreateFolder: () => void;
    onRemoveBookmark: (folderId: string, bookmarkId: string) => void;
    onDeleteFolder: (folderId: string, name: string) => void;
}

export default function TimberFolders({
    folders,
    bookmarksById,
    onCreateFolder,
    onRemoveBookmark,
    onDeleteFolder,
}: TimberFoldersProps) {
    return (
        <section className="timber-folders-section">
            <div className="timber-folders-header">
                <h2>Your Folders</h2>
                <button type="button" onClick={onCreateFolder}>
                    New Folder
                </button>
            </div>

            {folders.length === 0 ? (
                <p className="timber-folder-empty">
                    No folders yet — create one, then add bookmarks to it below.
                </p>
            ) : (
                folders.map((folder) => (
                    <FolderRow
                        key={folder.id}
                        folder={folder}
                        bookmarksById={bookmarksById}
                        onRemoveBookmark={onRemoveBookmark}
                        onDeleteFolder={onDeleteFolder}
                    />
                ))
            )}
        </section>
    );
}