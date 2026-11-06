import { Fragment, useState } from "react";
import type { NativeFolderNode } from "../../src/shared/bookmarks/bookmark-folder-tree";
import type { BookmarkPage } from "../../src/shared/types/timber";
import AddToFolderMenu from "./AddToFolderMenu";

interface TileBookmark {
    title: string;
    url: string;
}

interface NativeFolderContentsProps {
    node: NativeFolderNode;
    bookmarksById: Map<string, TileBookmark>;
    folders: BookmarkPage[];
    onDeleteBookmark: (bookmarkId: string, title: string) => void;
    onAddBookmarkToFolder: (bookmarkId: string, folderId: string) => void;
    onCreateFolderAndAdd: (bookmarkId: string, name: string) => void;
}

// A sub-folder renders as a chip (grid item) plus, when expanded, a
// full-width sibling grid item holding its own nested grid of
// children — same pattern RootGrid uses at the top level, applied
// recursively so every nesting depth stays horizontal.
function SubFolder(props: NativeFolderContentsProps) {
    const [collapsed, setCollapsed] = useState(true);
    const { node } = props;

    return (
        <Fragment>
            <button
                type="button"
                className="folder-header"
                onClick={() => setCollapsed((value) => !value)}
            >
                {collapsed ? "▶" : "▼"} {node.name}
            </button>

            {!collapsed && (
                <div className="root-expanded-panel">
                    <NativeFolderContents {...props} />
                </div>
            )}
        </Fragment>
    );
}

export default function NativeFolderContents({
    node,
    bookmarksById,
    folders,
    onDeleteBookmark,
    onAddBookmarkToFolder,
    onCreateFolderAndAdd,
}: NativeFolderContentsProps) {
    return (
        <>
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

                        <div className="folder-bookmark-actions">
                            <AddToFolderMenu
                                bookmarkId={id}
                                folders={folders}
                                onAdd={onAddBookmarkToFolder}
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
                    </div>
                );
            })}

            {Array.from(node.children.values()).map((child) => (
                <SubFolder
                    key={child.path.join("/")}
                    node={child}
                    bookmarksById={bookmarksById}
                    folders={folders}
                    onDeleteBookmark={onDeleteBookmark}
                    onAddBookmarkToFolder={onAddBookmarkToFolder}
                    onCreateFolderAndAdd={onCreateFolderAndAdd}
                />
            ))}
        </>
    );
}
