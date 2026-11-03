
import { useEffect, useMemo, useState } from "react";

import { browser } from "wxt/browser";

import {
    hasBookmarkPermission,
    requestBookmarkPermission,
} from "../../src/shared/bookmarks/bookmark-synchronizer";

import { bookmarkRepository } from
    "../../src/shared/bookmarks/bookmark-repository";

import type { Bookmark } from "../../src/shared/types/timber";

import type { BookmarkSyncSummary } from
    "../../src/shared/bookmarks/bookmark.types";

interface DashboardBookmark extends Bookmark {
    sourceCount: number;
}

function App() {
    const [connected, setConnected] = useState(false);
    const [loading, setLoading] = useState(false);

    const [bookmarks, setBookmarks] = useState<DashboardBookmark[]>([]);
    const [query, setQuery] = useState("");

    const [status, setStatus] = useState("Checking bookmark access...");
    const [error, setError] = useState("");

    /**
     * Synchronize through the background process,
     * then read the updated catalog.
     */
    async function synchronizeAndLoad() {
        const summary = await browser.runtime.sendMessage({
            type: "TIMBER_SYNC_BOOKMARKS",
        }) as BookmarkSyncSummary;

        const state = await bookmarkRepository.getState();

        const sourceCounts = new Map<string, number>();

        for (const occurrence of state.bookmarkSources) {
            sourceCounts.set(
                occurrence.bookmarkId,
                (sourceCounts.get(occurrence.bookmarkId) ?? 0) + 1
            );
        }

        const dashboardBookmarks: DashboardBookmark[] =
            state.bookmarks.map((bookmark) => ({
                ...bookmark,
                sourceCount: sourceCounts.get(bookmark.id) ?? 0,
            }));

        setBookmarks(dashboardBookmarks);

        setStatus(
            `${summary.scanned} web bookmarks scanned · ` +
            `${summary.totalUniqueBookmarks} unique bookmarks`
        );
    }

    // 
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
    }

    /**
     * Check whether permission was previously granted.
     */

    useEffect(() => {
        let cancelled = false;

        // Listen for bookmark synchronization notifications
        const handleMessage = (message: unknown) => {
            if (
                typeof message === "object" &&
                message !== null &&
                "type" in message &&
                message.type === "TIMBER_BOOKMARKS_UPDATED"
            ) {
                void loadCatalog().catch((error) => {
                    console.error("Failed to reload bookmark catalog:", error);

                    if (!cancelled) {
                        setError("Failed to refresh bookmarks.");
                    }
                });
            }
        };

        // Register listener when component mounts.
        browser.runtime.onMessage.addListener(handleMessage);

        async function initialize() {
            try {
                const permitted = await hasBookmarkPermission();

                if (cancelled) return;

                setConnected(permitted);

                if (!permitted) {
                    setStatus(
                        "Connect your browser bookmarks to get started."
                    );
                    return;
                }

                await synchronizeAndLoad();

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

        // Cleanup when component unmounts.
        return () => {
            cancelled = true;

            browser.runtime.onMessage.removeListener(handleMessage);
        };
    }, []);

    /**
     * Request bookmark permission from a user click.
     */
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
            setStatus("Synchronizing bookmarks...");

            await synchronizeAndLoad();
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

    /**
     * Manually refresh native bookmarks.
     */
    async function handleRefresh() {
        try {
            setLoading(true);
            setError("");

            await synchronizeAndLoad();
        } catch (error) {
            setError(
                error instanceof Error
                    ? error.message
                    : "Synchronization failed."
            );
        } finally {
            setLoading(false);
        }
    }

    const filteredBookmarks = useMemo(() => {
        const value = query.trim().toLowerCase();

        if (!value) return bookmarks;

        return bookmarks.filter(
            (bookmark) =>
                bookmark.title.toLowerCase().includes(value) ||
                bookmark.url.toLowerCase().includes(value)
        );
    }, [bookmarks, query]);

    return (
        <main className="timber-dashboard">

            <header className="dashboard-header">
                <div>
                    <h1>Timber</h1>
                    <p>Your universal bookmark dashboard</p>
                </div>

                <div className="header-actions">
                    {connected && (
                        <button
                            onClick={handleRefresh}
                            disabled={loading}
                            type="button"
                        >
                            {loading ? "Syncing..." : "Refresh"}
                        </button>
                    )}
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
                        <div>
                            <h2>All Bookmarks</h2>
                            <span>
                                {filteredBookmarks.length} bookmarks
                            </span>
                        </div>

                        <input
                            type="search"
                            placeholder="Search bookmarks..."
                            value={query}
                            onChange={(event) => setQuery(event.target.value)}
                        />
                    </section>

                    {filteredBookmarks.length === 0 ? (
                        <section className="empty-state">
                            <h3>No bookmarks found</h3>
                            <p>
                                {query
                                    ? "Try a different search."
                                    : "Your browser doesn't have any supported web bookmarks yet."}
                            </p>
                        </section>
                    ) : (
                        <section className="bookmark-grid">
                            {filteredBookmarks.map((bookmark) => (
                                <article
                                    className="bookmark-card"
                                    key={bookmark.id}
                                >
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
                                        {bookmark.sourceCount} browser
                                        {bookmark.sourceCount === 1 ? "" : "s"}
                                    </footer>
                                </article>
                            ))}
                        </section>
                    )}
                </>
            )}

            <div className="dashboard-status">
                <span>{status}</span>

                {error && (
                    <span className="error-message">{error}</span>
                )}
            </div>

        </main>
    );
}

export default App;
