import { useState } from "react";
import type { NativeFolderNode } from "../../src/shared/bookmarks/bookmark-folder-tree";
import type { BrowserSource } from "../../src/shared/types/timber";

export interface FolderTreeBookmark {
    title: string;
    url: string;
}

interface FolderNodeViewProps {
    node: NativeFolderNode;
    bookmarksById: Map<string, FolderTreeBookmark>;
}

function FolderNodeView({ node, bookmarksById }: FolderNodeViewProps) {
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
                            <a
                                key={id}
                                className="folder-bookmark-link"
                                href={bookmark.url}
                                target="_blank"
                                rel="noopener noreferrer"
                            >
                                {bookmark.title}
                            </a>
                        );
                    })}

                    {childFolders.map((child) => (
                        <FolderNodeView
                            key={child.path.join("/")}
                            node={child}
                            bookmarksById={bookmarksById}
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
}

export default function FolderTree({ source, tree, bookmarksById }: FolderTreeProps) {
    return (
        <section className="folder-tree-source">
            <h3>{source.name}</h3>
            <FolderNodeView node={tree} bookmarksById={bookmarksById} />
        </section>
    );
}
