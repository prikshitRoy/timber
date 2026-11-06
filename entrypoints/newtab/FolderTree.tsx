import { useState } from "react";
import type { NativeFolderNode } from "../../src/shared/bookmarks/bookmark-folder-tree";
import type { BrowserSource, BookmarkPage } from "../../src/shared/types/timber";
import AddToFolderMenu from "./AddToFolderMenu";

export interface FolderTreeBookmark {
    title: string;
    url: string;
}

type DeleteHandler = (bookmarkId: string, title: string) => void;

interface FolderNodeViewProps {
    node: NativeFolderNode;
    bookmarksById: Map<string, FolderTreeBookmark>;
    onDeleteBookmark: DeleteHandler;
    folders: BookmarkPage[];
    onAddToFolder: (bookmarkId: string, folderId: string) => void;
    onCreateFolderAndAdd: (bookmarkId: string, name: string) => void;
}

function FolderNodeView({
    node,
    bookmarksById,
    onDeleteBookmark,
    folders,
    onAddToFolder,
    onCreateFolderAndAdd,
}: FolderNodeViewProps) {
    const [collapsed, setCollapsed] = useState(false);
    const childFolders = Array.from(node.children.values());

    return (
        <div className="folder-node">
            {node.name && (
                <button
                    type="button"
                    className="folder-header"
                    onClick={() => setCollapsed((value) => !value)}
                >
                    {collapsed ? "▶" : "▼"} {node.name}
                </button>
            )}

            {!collapsed && (
                <div className="folder-body">
                    {node.bookmarkIds.map((id) => {
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

                                <AddToFolderMenu
                                    bookmarkId={id}
                                    folders={folders}
                                    onAdd={onAddToFolder}
                                    onCreateAndAdd={onCreateFolderAndAdd}
                                />

                                <button
                                    type="button"
                                    className="delete-button"
                                    onClick={() => onDeleteBookmark(id, bookmark.title)}
                                >
                                    Delete
                                </button>
                            </div>
                        );
                    })}

                    {childFolders.map((child) => (
                        <FolderNodeView
                            key={child.path.join("/")}
                            node={child}
                            bookmarksById={bookmarksById}
                            onDeleteBookmark={onDeleteBookmark}
                            folders={folders}
                            onAddToFolder={onAddToFolder}
                            onCreateFolderAndAdd={onCreateFolderAndAdd}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}

interface FolderTreeProps {
    source: BrowserSource;
    tree: NativeFolderNode;
    bookmarksById: Map<string, FolderTreeBookmark>;
    onDeleteBookmark: DeleteHandler;
    folders: BookmarkPage[];
    onAddToFolder: (bookmarkId: string, folderId: string) => void;
    onCreateFolderAndAdd: (bookmarkId: string, name: string) => void;
}

export default function FolderTree({
    source,
    tree,
    bookmarksById,
    onDeleteBookmark,
    folders,
    onAddToFolder,
    onCreateFolderAndAdd,
}: FolderTreeProps) {
    return (
        <section className="folder-tree-source">
            <h3>{source.name}</h3>
            <FolderNodeView
                node={tree}
                bookmarksById={bookmarksById}
                onDeleteBookmark={onDeleteBookmark}
                folders={folders}
                onAddToFolder={onAddToFolder}
                onCreateFolderAndAdd={onCreateFolderAndAdd}
            />
        </section>
    );
}