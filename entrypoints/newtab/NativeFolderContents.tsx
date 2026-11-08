import { Fragment, useState } from "react";
import { nativeFolderKey, type NativeFolderNode } from "../../src/shared/bookmarks/bookmark-folder-tree";
import type { BookmarkPage } from "../../src/shared/types/timber";
import KebabMenu from "./KebabMenu";
import TimberFolderContents, { type TimberFolderHandlers } from "./TimberFolderContents";

interface TileBookmark {
    title: string;
    url: string;
}

interface NativeFolderContentsProps {
    node: NativeFolderNode;
    sourceId: string;
    bookmarksById: Map<string, TileBookmark>;
    folders: BookmarkPage[];
    shadowPages: Record<string, string>;
    onDeleteBookmark: (bookmarkId: string, title: string) => void;
    onEditBookmark: (bookmarkId: string, title: string, url: string) => void;
    onCopyBookmark: (url: string) => void;
    onEditNativeFolderLinks: (key: string) => void;
    onDeleteNativeFolder: (label: string, bookmarkIds: string[]) => void;
    onAddLinkToNativeFolder: (key: string, label: string) => void;
    onAddSubFolderToNativeFolder: (key: string, label: string) => void;
    timberHandlers: TimberFolderHandlers;
}

function SubFolder(props: NativeFolderContentsProps) {
    const [collapsed, setCollapsed] = useState(true);
    const { node, sourceId } = props;
    const key = nativeFolderKey(sourceId, node);

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
                    <span className="root-tile-name">{node.name}</span>
                    <span className="root-tile-count">
                        {node.bookmarkIds.length + node.children.size}
                    </span>
                </button>

                <KebabMenu
                    actions={[
                        { label: "Edit links", onClick: () => props.onEditNativeFolderLinks(key) },
                        { label: "Add link", onClick: () => props.onAddLinkToNativeFolder(key, node.name) },
                        { label: "Add folder", onClick: () => props.onAddSubFolderToNativeFolder(key, node.name) },
                        { label: "Delete folder", danger: true, onClick: () => props.onDeleteNativeFolder(node.name, node.bookmarkIds) },
                    ]}
                />
            </div>

            {!collapsed && (
                <div className="root-expanded-panel">
                    <NativeFolderContents {...props} />
                </div>
            )}
        </Fragment>
    );
}

export default function NativeFolderContents(props: NativeFolderContentsProps) {
    const {
        node,
        sourceId,
        bookmarksById,
        folders,
        shadowPages,
        onDeleteBookmark,
        onEditBookmark,
        onCopyBookmark,
        timberHandlers,
    } = props;

    const shadowPageId = shadowPages[nativeFolderKey(sourceId, node)];
    const shadowPage = shadowPageId
        ? folders.find((item) => item.id === shadowPageId)
        : undefined;

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
                            <KebabMenu
                                actions={[
                                    { label: "Edit", onClick: () => onEditBookmark(id, bookmark.title, bookmark.url) },
                                    { label: "Copy link", onClick: () => onCopyBookmark(bookmark.url) },
                                    { label: "Delete", danger: true, onClick: () => onDeleteBookmark(id, bookmark.title) },
                                ]}
                            />
                        </div>
                    </div>
                );
            })}

            {Array.from(node.children.values()).map((child) => (
                <SubFolder key={child.path.join("/")} {...props} node={child} />
            ))}

            {shadowPage && (
                <TimberFolderContents
                    folderId={shadowPage.id}
                    bookmarkIds={shadowPage.bookmarkIds ?? []}
                    folders={folders}
                    bookmarksById={bookmarksById}
                    {...timberHandlers}
                />
            )}
        </>
    );
}
