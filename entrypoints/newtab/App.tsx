import { useEffect, useMemo, useState } from "react";

import { browser } from "wxt/browser";

import {
    hasBookmarkPermission,
    requestBookmarkPermission,
} from "../../src/shared/bookmarks/bookmark-synchronizer";

import { bookmarkRepository } from
    "../../src/shared/bookmarks/bookmark-repository";

import type {
    Bookmark,
    BrowserSource,
    BookmarkSource,
    BookmarkPage,
} from "../../src/shared/types/timber";

import type {
    BookmarkSyncDiff,
    BookmarkSyncSelection,
    NativeBookmarkRecord,
} from "../../src/shared/bookmarks/bookmark.types";

import { computeRootTiles, type RootTile } from "../../src/shared/bookmarks/root-layout";
import { collectBookmarkIds } from "../../src/shared/bookmarks/bookmark-folder-tree";

import RootGrid from "./RootGrid";
import AddToFolderMenu from "./AddToFolderMenu";
import AddLinkModal from "./AddLinkModal";
import SettingsModal from "./SettingsModal";
import SyncReviewModal from "./SyncReviewModal";
import KebabMenu from "./KebabMenu";
import EditBookmarkModal from "./EditBookmarkModal";
import EditFolderLinksModal from "./EditFolderLinksModal";

interface DashboardBookmark extends Bookmark {
    sourceCount: number;
}

function App() {
    const [connected, setConnected] = useState(false);
    const [loading, setLoading] = useState(false);

    const [bookmarks, setBookmarks] = useState<DashboardBookmark[]>([]);
    const [sources, setSources] = useState<BrowserSource[]>([]);
    const [bookmarkSources, setBookmarkSources] = useState<BookmarkSource[]>([]);
    const [folders, setFolders] = useState<BookmarkPage[]>([]);
    const [rootOrder, setRootOrderState] = useState<string[]>([]);

    const [query, setQuery] = useState("");

    const [status, setStatus] = useState("Checking bookmark access...");
    const [error, setError] = useState("");

    const [nativeChanged, setNativeChanged] = useState(false);
    const [pendingSync, setPendingSync] = useState<{
        sourceId: string;
        nativeBookmarks: NativeBookmarkRecord[];
        diff: BookmarkSyncDiff;
    } | null>(null);

    const [editMode, setEditMode] = useState(false);
    const [showSettings, setShowSettings] = useState(false);
    const [showAddLink, setShowAddLink] = useState(false);

    const [editingBookmark, setEditingBookmark] = useState<{ id: string; title: string; url: string } | null>(null);
    const [editingFolderLinksId, setEditingFolderLinksId] = useState<string | null>(null);
    const [editingNativeFolderKey, setEditingNativeFolderKey] = useState<string | null>(null);

    async function loadCatalog() {
        const state = await bookmarkRepository.getState();

        const sourceCounts = new Map<string, number>();

        for (const occurrence of state.bookmarkSources) {
            sourceCounts.set(
                occurrence.bookmarkId,
                (sourceCounts.get(occurrence.bookmarkId) ?? 0) + 1
            );
        }

        setBookmarks(
            state.bookmarks.map((bookmark) => ({
                ...bookmark,
                sourceCount: sourceCounts.get(bookmark.id) ?? 0,
            }))
        );

        setSources(state.sources);
        setBookmarkSources(state.bookmarkSources);
        setFolders(state.pages.filter((page) => page.type === "custom"));
        setRootOrderState(state.rootOrder ?? []);

        setStatus(`${state.bookmarks.length} unique bookmarks`);
    }

    useEffect(() => {
        let cancelled = false;

        const handleMessage = (message: unknown) => {
            if (
                typeof message !== "object" ||
                message === null ||
                !("type" in message)
            ) {
                return;
            }

            if (message.type === "TIMBER_BOOKMARKS_CHANGED") {
                setNativeChanged(true);
                return;
            }

            if (message.type === "TIMBER_BOOKMARKS_UPDATED") {
                void loadCatalog().catch((error) => {
                    console.error("Failed to reload bookmark catalog:", error);

                    if (!cancelled) {
                        setError("Failed to refresh bookmarks.");
                    }
                });
            }
        };

        browser.runtime.onMessage.addListener(handleMessage);

        async function initialize() {
            try {
                const permitted = await hasBookmarkPermission();

                if (cancelled) return;

                setConnected(permitted);

                if (!permitted) {
                    setStatus("Connect your browser bookmarks to get started.");
                    return;
                }

                await loadCatalog();
            } catch (error) {
                if (!cancelled) {
                    setError(
                        error instanceof Error
                            ? error.message
                            : "Failed to load bookmarks."
                    );
                }
            }
        }

        void initialize();

        return () => {
            cancelled = true;
            browser.runtime.onMessage.removeListener(handleMessage);
        };
    }, []);

    async function handleConnect() {
        try {
            setLoading(true);
            setError("");

            const granted = await requestBookmarkPermission();

            if (!granted) {
                setStatus("Bookmark permission was not granted.");
                return;
            }

            setConnected(true);
            await handleScan();
        } catch (error) {
            setError(
                error instanceof Error
                    ? error.message
                    : "Failed to connect bookmarks."
            );
        } finally {
            setLoading(false);
        }
    }

    async function handleScan() {
        try {
            setLoading(true);
            setError("");

            const result = (await browser.runtime.sendMessage({
                type: "TIMBER_SYNC_BOOKMARKS",
            })) as {
                sourceId: string;
                nativeBookmarks: NativeBookmarkRecord[];
                diff: BookmarkSyncDiff;
            };

            setNativeChanged(false);

            if (result.diff.additions.length === 0) {
                setStatus("Timber already has all your bookmarks.");
                await loadCatalog();
                return;
            }

            setPendingSync(result);
        } catch (error) {
            setError(error instanceof Error ? error.message : "Scan failed.");
        } finally {
            setLoading(false);
        }
    }

    async function handleApplySync(selection: BookmarkSyncSelection) {
        if (!pendingSync) return;

        try {
            setLoading(true);

            await browser.runtime.sendMessage({
                type: "TIMBER_APPLY_SYNC_SELECTION",
                sourceId: pendingSync.sourceId,
                nativeBookmarks: pendingSync.nativeBookmarks,
                selection,
            });

            await loadCatalog();
        } catch (error) {
            setError(
                error instanceof Error ? error.message : "Failed to apply changes."
            );
        } finally {
            setPendingSync(null);
            setLoading(false);
        }
    }

    async function handleDeleteBookmark(bookmarkId: string, title: string) {
        const confirmed = window.confirm(
            `Remove "${title}" from Timber? It stays in your browser bookmarks, and will show up again next time you scan.`
        );

        if (!confirmed) return;

        try {
            await bookmarkRepository.deleteBookmark(bookmarkId);
            await loadCatalog();
        } catch (error) {
            setError(
                error instanceof Error ? error.message : "Failed to delete bookmark."
            );
        }
    }

    async function handleCreateFolder() {
        const name = window.prompt("Folder name?");
        if (!name || !name.trim()) return;

        try {
            await bookmarkRepository.createPage(name.trim());
            await loadCatalog();
        } catch (error) {
            setError(
                error instanceof Error ? error.message : "Failed to create folder."
            );
        }
    }

    async function handleRenameFolder(pageId: string, currentName: string) {
        const name = window.prompt("Rename folder", currentName);
        if (!name || !name.trim() || name.trim() === currentName) return;

        try {
            await bookmarkRepository.renamePage(pageId, name.trim());
            await loadCatalog();
        } catch (error) {
            setError(
                error instanceof Error ? error.message : "Failed to rename folder."
            );
        }
    }

    async function handleDeleteFolder(folderId: string, name: string) {
        const confirmed = window.confirm(
            `Delete folder "${name}"? Bookmarks inside stay in Timber — only the folder is removed.`
        );

        if (!confirmed) return;

        try {
            await bookmarkRepository.deletePage(folderId);
            await loadCatalog();
        } catch (error) {
            setError(
                error instanceof Error ? error.message : "Failed to delete folder."
            );
        }
    }

    async function handleAddBookmarkToFolder(bookmarkId: string, folderId: string) {
        try {
            await bookmarkRepository.addBookmarkToPage(folderId, bookmarkId);
            await loadCatalog();
        } catch (error) {
            setError(
                error instanceof Error
                    ? error.message
                    : "Failed to add bookmark to folder."
            );
        }
    }

    async function handleCreateFolderAndAdd(bookmarkId: string, name: string) {
        try {
            const page = await bookmarkRepository.createPage(name);
            await bookmarkRepository.addBookmarkToPage(page.id, bookmarkId);
            await loadCatalog();
        } catch (error) {
            setError(
                error instanceof Error ? error.message : "Failed to create folder."
            );
        }
    }

    async function handleRemoveBookmarkFromFolder(folderId: string, bookmarkId: string) {
        try {
            await bookmarkRepository.removeBookmarkFromPage(folderId, bookmarkId);
            await loadCatalog();
        } catch (error) {
            setError(
                error instanceof Error
                    ? error.message
                    : "Failed to remove bookmark from folder."
            );
        }
    }

    async function handleReorderRoot(order: string[]) {
        try {
            await bookmarkRepository.setRootOrder(order);
            await loadCatalog();
        } catch (error) {
            setError(
                error instanceof Error ? error.message : "Failed to save order."
            );
        }
    }

    async function handleCreateLink(url: string, title: string) {
        try {
            await bookmarkRepository.createManualLink(url, title);
            await loadCatalog();
        } catch (error) {
            setError(error instanceof Error ? error.message : "Failed to add link.");
        } finally {
            setShowAddLink(false);
        }
    }



    function handleStartEditBookmark(bookmarkId: string, title: string, url: string) {
        setEditingBookmark({ id: bookmarkId, title, url });
    }

    async function handleSaveBookmarkEdit(bookmarkId: string, title: string, url: string) {
        try {
            await bookmarkRepository.updateBookmark(bookmarkId, { title, url });
            await loadCatalog();
        } catch (error) {
            setError(error instanceof Error ? error.message : "Failed to update link.");
        } finally {
            setEditingBookmark(null);
        }
    }

    async function handleCopyBookmarkLink(url: string) {
        try {
            await navigator.clipboard.writeText(url);
            setStatus("Link copied to clipboard.");
        } catch {
            setError("Failed to copy link.");
        }
    }



    async function handleDeleteFolderLinks(
        folderId: string,
        bookmarkIds: string[],
        alsoDeleteFolder: boolean
    ) {
        try {
            await bookmarkRepository.deleteBookmarks(bookmarkIds);

            if (alsoDeleteFolder) {
                await bookmarkRepository.deletePage(folderId);
                setEditingFolderLinksId(null);
            }

            await loadCatalog();
        } catch (error) {
            setError(
                error instanceof Error ? error.message : "Failed to delete links."
            );
        }
    }

    async function handleCopyFolderLinks(urls: string[]) {
        try {
            await navigator.clipboard.writeText(urls.join("\n"));
            setStatus(
                `${urls.length} link${urls.length === 1 ? "" : "s"} copied to clipboard.`
            );
        } catch {
            setError("Failed to copy links.");
        }
    }


    async function handleDeleteNativeFolderLinks(bookmarkIds: string[]) {
        try {
            await bookmarkRepository.deleteBookmarks(bookmarkIds);
            await loadCatalog();
        } catch (error) {
            setError(
                error instanceof Error ? error.message : "Failed to delete links."
            );
        }
    }


    async function handleDeleteNativeFolder(folderName: string, bookmarkIds: string[]) {
        if (bookmarkIds.length === 0) return;

        const confirmed = window.confirm(
            `Remove "${folderName}" and all ${bookmarkIds.length} link${bookmarkIds.length === 1 ? "" : "s"} inside it from Timber? They stay in your browser bookmarks, and will show up again next time you scan.`
        );

        if (!confirmed) return;

        try {
            await bookmarkRepository.deleteBookmarks(bookmarkIds);
            await loadCatalog();
        } catch (error) {
            setError(
                error instanceof Error ? error.message : "Failed to delete folder."
            );
        }
    }








    const filteredBookmarks = useMemo(() => {
        const value = query.trim().toLowerCase();

        if (!value) return [];

        return bookmarks.filter(
            (bookmark) =>
                bookmark.title.toLowerCase().includes(value) ||
                bookmark.url.toLowerCase().includes(value)
        );
    }, [bookmarks, query]);

    const bookmarksById = useMemo(() => {
        const map = new Map<string, { title: string; url: string }>();
        for (const bookmark of bookmarks) {
            map.set(bookmark.id, { title: bookmark.title, url: bookmark.url });
        }
        return map;
    }, [bookmarks]);

    const rootTiles = useMemo(
        () =>
            computeRootTiles({
                pages: folders,
                sources,
                bookmarkSources,
                bookmarks,
                rootOrder,
            }),
        [folders, sources, bookmarkSources, bookmarks, rootOrder]
    );

    const editingFolder = editingFolderLinksId
        ? folders.find((folder) => folder.id === editingFolderLinksId) ?? null
        : null;

    const editingNativeFolderTile = editingNativeFolderKey
        ? (rootTiles.find(
            (tile): tile is Extract<RootTile, { kind: "native-folder" }> =>
                tile.kind === "native-folder" && tile.key === editingNativeFolderKey
        ) ?? null)
        : null;

    return (
        <main className="timber-dashboard">
            <header className="dashboard-header">
                <input
                    type="search"
                    className="dashboard-search"
                    placeholder="Search bookmarks..."
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                />

                <div className="header-actions">
                    {connected && nativeChanged && (
                        <span className="native-changed-badge">Bookmarks changed</span>
                    )}

                    {connected && (
                        <button onClick={handleScan} disabled={loading} type="button">
                            {loading ? "Scanning..." : "Scan"}
                        </button>
                    )}

                    <button type="button" onClick={() => setShowAddLink(true)}>
                        + Link
                    </button>

                    <button type="button" onClick={handleCreateFolder}>
                        + Folder
                    </button>
                </div>
            </header>

            {!connected ? (
                <section className="connect-section">
                    <h2>Connect your bookmarks</h2>

                    <p>
                        Allow Timber to read your browser bookmarks
                        and organize them into one dashboard.
                    </p>

                    <button
                        onClick={handleConnect}
                        disabled={loading}
                        type="button"
                    >
                        {loading ? "Connecting..." : "Connect Bookmarks"}
                    </button>
                </section>
            ) : (
                <>
                    <section className="bookmark-toolbar">
                        <span>{bookmarks.length} bookmarks</span>
                    </section>

                    {query ? (
                        filteredBookmarks.length === 0 ? (
                            <section className="empty-state">
                                <h3>No bookmarks found</h3>
                                <p>Try a different search.</p>
                            </section>
                        ) : (
                            <section className="bookmark-grid">
                                {filteredBookmarks.map((bookmark) => (
                                    <article className="bookmark-card" key={bookmark.id}>
                                        <a
                                            className="bookmark-link"
                                            href={bookmark.url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                        >
                                            <h3>{bookmark.title}</h3>
                                            <p>{bookmark.url}</p>
                                        </a>

                                        <footer>
                                            <span>
                                                {bookmark.sourceCount} browser
                                                {bookmark.sourceCount === 1 ? "" : "s"}
                                            </span>

                                            <AddToFolderMenu
                                                bookmarkId={bookmark.id}
                                                folders={folders}
                                                onAdd={handleAddBookmarkToFolder}
                                                onCreateAndAdd={handleCreateFolderAndAdd}
                                            />

                                            <KebabMenu
                                                actions={[
                                                    { label: "Edit", onClick: () => handleStartEditBookmark(bookmark.id, bookmark.title, bookmark.url) },
                                                    { label: "Copy link", onClick: () => handleCopyBookmarkLink(bookmark.url) },
                                                    { label: "Delete", danger: true, onClick: () => handleDeleteBookmark(bookmark.id, bookmark.title) },
                                                ]}
                                            />
                                        </footer>
                                    </article>
                                ))}
                            </section>
                        )
                    ) : (
                        <RootGrid
                            tiles={rootTiles}
                            editMode={editMode}
                            bookmarksById={bookmarksById}
                            onReorder={handleReorderRoot}
                            onRenameFolder={handleRenameFolder}
                            onDeleteFolder={handleDeleteFolder}
                            onRemoveBookmarkFromFolder={handleRemoveBookmarkFromFolder}
                            onDeleteBookmark={handleDeleteBookmark}
                            onEditBookmark={handleStartEditBookmark}
                            onCopyBookmark={handleCopyBookmarkLink}
                            onEditFolderLinks={setEditingFolderLinksId}
                            onEditNativeFolderLinks={setEditingNativeFolderKey}
                            onDeleteNativeFolder={handleDeleteNativeFolder}
                        />
                    )}
                </>
            )}

            <div className="dashboard-status">
                <span>{status}</span>

                {error && <span className="error-message">{error}</span>}

                <div className="dashboard-footer-actions">
                    <button
                        type="button"
                        className={editMode ? "edit-active" : ""}
                        onClick={() => setEditMode((value) => !value)}
                    >
                        {editMode ? "Done Editing" : "Edit"}
                    </button>

                    <button type="button" onClick={() => setShowSettings(true)}>
                        Settings
                    </button>
                </div>
            </div>

            {pendingSync && (
                <SyncReviewModal
                    diff={pendingSync.diff}
                    onCancel={() => setPendingSync(null)}
                    onApply={handleApplySync}
                />
            )}

            {showAddLink && (
                <AddLinkModal
                    onClose={() => setShowAddLink(false)}
                    onCreate={handleCreateLink}
                />
            )}

            {editingBookmark && (
                <EditBookmarkModal
                    bookmarkId={editingBookmark.id}
                    initialTitle={editingBookmark.title}
                    initialUrl={editingBookmark.url}
                    onClose={() => setEditingBookmark(null)}
                    onSave={handleSaveBookmarkEdit}
                />
            )}

            {editingFolder && (
                <EditFolderLinksModal
                    folderName={editingFolder.name}
                    bookmarkIds={editingFolder.bookmarkIds ?? []}
                    bookmarksById={bookmarksById}
                    onClose={() => setEditingFolderLinksId(null)}
                    onCopySelected={handleCopyFolderLinks}
                    onDeleteSelected={(bookmarkIds, alsoDeleteFolder) =>
                        handleDeleteFolderLinks(editingFolder.id, bookmarkIds, alsoDeleteFolder)
                    }
                />
            )}

            {editingNativeFolderTile && (
                <EditFolderLinksModal
                    folderName={editingNativeFolderTile.folderName}
                    bookmarkIds={collectBookmarkIds(editingNativeFolderTile.node)}
                    bookmarksById={bookmarksById}
                    onClose={() => setEditingNativeFolderKey(null)}
                    onCopySelected={handleCopyFolderLinks}
                    onDeleteSelected={(bookmarkIds) =>
                        handleDeleteNativeFolderLinks(bookmarkIds)
                    }
                    allowFolderDeletion={false}
                />
            )}

            {showSettings && (
                <SettingsModal
                    connected={connected}
                    loading={loading}
                    onClose={() => setShowSettings(false)}
                    onConnect={handleConnect}
                />
            )}
        </main>
    );
}

export default App;
