import { Fragment, useState } from "react";
import type { NativeFolderNode } from "../../src/shared/bookmarks/bookmark-folder-tree";

interface TileBookmark {
    title: string;
    url: string;
}

interface NativeFolderContentsProps {
    node: NativeFolderNode;
    bookmarksById: Map<string, TileBookmark>;
    onDeleteBookmark: (bookmarkId: string, title: string) => void;
}

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
    onDeleteBookmark,
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

            {Array.from(node.children.values()).map((child) => (
                <SubFolder
                    key={child.path.join("/")}
                    node={child}
                    bookmarksById={bookmarksById}
                    onDeleteBookmark={onDeleteBookmark}
                />
            ))}
        </>
    );
}
