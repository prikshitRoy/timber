/**
 * Toolbar popup for quick-saving the active browser tab into Timber.
 */

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { browser } from "wxt/browser";
import {
  resolveThemeMode,
  type Bookmark,
  type BookmarkPage,
  type TimberState,
} from "@timber/core";
import { bookmarkRepository } from "@/src/shared/bookmarks/bookmark-repository";
import { loadAppearanceSettings } from "@/src/shared/appearance/appearance-storage";
import "./App.css";

interface FolderOption {
  id: string;
  label: string;
}

const SUPPORTED_PROTOCOLS = new Set(["http:", "https:"]);

function isBookmarkableUrl(rawUrl: string): boolean {
  try {
    const parsed = new URL(rawUrl);
    return SUPPORTED_PROTOCOLS.has(parsed.protocol);
  } catch {
    return false;
  }
}

function normalizeForMatch(rawUrl: string): string {
  try {
    const parsed = new URL(rawUrl.trim());
    parsed.hash = "";
    const pathname = parsed.pathname.replace(/\/+$/, "") || "/";
    return `${parsed.protocol.toLowerCase()}//${parsed.host.toLowerCase()}${pathname}${parsed.search}`;
  } catch {
    return rawUrl.trim().toLowerCase();
  }
}

function buildFolderOptions(pages: BookmarkPage[]): FolderOption[] {
  const customPages = pages.filter((page) => page.type === "custom");
  const byParent = new Map<string, BookmarkPage[]>();

  for (const page of customPages) {
    const key = page.parentId ?? "";
    const list = byParent.get(key) ?? [];
    list.push(page);
    byParent.set(key, list);
  }

  for (const list of byParent.values()) {
    list.sort((a, b) => a.name.localeCompare(b.name));
  }

  const options: FolderOption[] = [];
  const visited = new Set<string>();

  function visit(parentId: string, prefix: string[]) {
    const children = byParent.get(parentId) ?? [];
    for (const child of children) {
      if (visited.has(child.id)) continue;
      visited.add(child.id);
      const path = [...prefix, child.name];
      options.push({ id: child.id, label: path.join(" / ") });
      visit(child.id, path);
    }
  }

  visit("", []);

  // Append any orphaned custom folders whose parentId no longer exists.
  for (const page of customPages) {
    if (!visited.has(page.id)) {
      options.push({ id: page.id, label: page.name });
    }
  }

  return options;
}

function findMatchingBookmark(
  bookmarks: Bookmark[],
  tabUrl: string
): Bookmark | null {
  const target = normalizeForMatch(tabUrl);
  return (
    bookmarks.find(
      (bookmark) =>
        bookmark.url === tabUrl ||
        normalizeForMatch(bookmark.normalizedUrl) === target ||
        normalizeForMatch(bookmark.url) === target
    ) ?? null
  );
}

export default function App() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [state, setState] = useState<TimberState | null>(null);

  const [tabUrl, setTabUrl] = useState("");
  const [title, setTitle] = useState("");
  const [targetFolderId, setTargetFolderId] = useState<string>("");

  const [creatingFolder, setCreatingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");

  const [status, setStatus] = useState("");
  const [error, setError] = useState("");

  const folderOptions = useMemo(
    () => (state ? buildFolderOptions(state.pages) : []),
    [state]
  );

  const existingBookmark = useMemo(
    () =>
      state && tabUrl ? findMatchingBookmark(state.bookmarks, tabUrl) : null,
    [state, tabUrl]
  );

  const assignedFolders = useMemo(() => {
    if (!state || !existingBookmark) return [];
    const labelById = new Map(folderOptions.map((opt) => [opt.id, opt.label]));
    return state.pages
      .filter(
        (page) =>
          page.type === "custom" &&
          page.bookmarkIds?.includes(existingBookmark.id)
      )
      .map((page) => ({
        id: page.id,
        label: labelById.get(page.id) ?? page.name,
      }));
  }, [state, existingBookmark, folderOptions]);

  const isOnRoot = useMemo(() => {
    if (!state || !existingBookmark) return false;
    return (
      Boolean(state.rootBookmarkIds?.includes(existingBookmark.id)) ||
      assignedFolders.length === 0
    );
  }, [state, existingBookmark, assignedFolders.length]);

  useEffect(() => {
    let isCancelled = false;

    async function bootstrap() {
      try {
        const [appearance, tabs, timberState] = await Promise.all([
          loadAppearanceSettings().catch(() => null),
          browser.tabs.query({ active: true, currentWindow: true }),
          bookmarkRepository.initialize("unknown"),
        ]);

        if (isCancelled) return;

        if (appearance) {
          const prefersDark =
            typeof window.matchMedia === "function" &&
            window.matchMedia("(prefers-color-scheme: dark)").matches;
          const resolved = resolveThemeMode(appearance.themeMode, prefersDark);
          document.documentElement.setAttribute("data-theme", resolved);
        }

        const activeTab = tabs[0];
        const activeUrl = activeTab?.url?.trim() ?? "";
        const activeTitle = activeTab?.title?.trim() ?? "";

        setState(timberState);
        setTabUrl(activeUrl);

        const match = activeUrl
          ? findMatchingBookmark(timberState.bookmarks, activeUrl)
          : null;
        setTitle(match?.title || activeTitle || activeUrl);
      } catch (err) {
        if (!isCancelled) {
          setError(
            err instanceof Error
              ? err.message
              : "Failed to load current tab or Timber state."
          );
        }
      } finally {
        if (!isCancelled) {
          setLoading(false);
        }
      }
    }

    void bootstrap();
    return () => {
      isCancelled = true;
    };
  }, []);

  async function refreshState() {
    const nextState = await bookmarkRepository.getState();
    setState(nextState);
  }

  async function handleSave(event: FormEvent) {
    event.preventDefault();
    if (!tabUrl || !isBookmarkableUrl(tabUrl)) return;

    const cleanTitle = title.trim() || tabUrl;
    setSaving(true);
    setError("");
    setStatus("");

    try {
      let folderIdToAssign = targetFolderId;

      if (creatingFolder && newFolderName.trim()) {
        const createdPage = await bookmarkRepository.createPage(
          newFolderName.trim()
        );
        folderIdToAssign = createdPage.id;
        setTargetFolderId(createdPage.id);
        setCreatingFolder(false);
        setNewFolderName("");
      }

      if (existingBookmark) {
        if (existingBookmark.title !== cleanTitle) {
          await bookmarkRepository.updateBookmark(existingBookmark.id, {
            title: cleanTitle,
          });
        }

        if (folderIdToAssign) {
          await bookmarkRepository.addBookmarkToPage(
            folderIdToAssign,
            existingBookmark.id
          );
        } else {
          await bookmarkRepository.addBookmarkToRoot(existingBookmark.id);
        }

        await refreshState();
        setStatus("Updated in Timber.");
      } else {
        const bookmark = await bookmarkRepository.createManualLink(
          tabUrl,
          cleanTitle
        );

        if (folderIdToAssign) {
          await bookmarkRepository.addBookmarkToPage(
            folderIdToAssign,
            bookmark.id
          );
        } else {
          await bookmarkRepository.addBookmarkToRoot(bookmark.id);
        }

        await refreshState();
        setStatus("Saved to Timber.");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save bookmark.");
    } finally {
      setSaving(false);
    }
  }

  async function handleRemoveFromFolder(folderId: string) {
    if (!existingBookmark) return;
    setSaving(true);
    setError("");
    setStatus("");

    try {
      await bookmarkRepository.removeBookmarkFromPage(
        folderId,
        existingBookmark.id
      );
      await refreshState();
      setStatus("Removed from folder.");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to remove from folder."
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteBookmark() {
    if (!existingBookmark) return;
    setSaving(true);
    setError("");
    setStatus("");

    try {
      await bookmarkRepository.deleteBookmark(existingBookmark.id);
      await refreshState();
      setStatus("Removed from Timber.");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to delete bookmark."
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleOpenDashboard() {
    await browser.tabs.create({});
    window.close();
  }

  const canBookmark = Boolean(tabUrl) && isBookmarkableUrl(tabUrl);

  return (
    <main className="popup-shell">
      <header className="popup-header">
        <div className="popup-brand">
          <img src="/icon/32.png" alt="" className="popup-logo" />
          <span className="popup-title">Timber</span>
        </div>
        <button
          type="button"
          className="popup-link-btn"
          onClick={() => void handleOpenDashboard()}
        >
          Open Dashboard
        </button>
      </header>

      {loading ? (
        <p className="popup-muted">Loading current page…</p>
      ) : !canBookmark ? (
        <section className="popup-empty">
          <p className="popup-empty-title">This page can&apos;t be bookmarked</p>
          <p className="popup-muted">
            Open any web page (`http://` or `https://`) to save it into Timber.
          </p>
          <button
            type="button"
            className="popup-btn-primary"
            onClick={() => void handleOpenDashboard()}
          >
            Open Timber Dashboard
          </button>
        </section>
      ) : (
        <form className="popup-form" onSubmit={(e) => void handleSave(e)}>
          {existingBookmark && (
            <div className="popup-saved-banner">
              <span className="popup-badge">Saved in Timber</span>
              <div className="popup-chips">
                {isOnRoot && <span className="popup-chip">Root</span>}
                {assignedFolders.map((folder) => (
                  <span key={folder.id} className="popup-chip">
                    <span>{folder.label}</span>
                    <button
                      type="button"
                      className="popup-chip-remove"
                      title={`Remove from ${folder.label}`}
                      disabled={saving}
                      onClick={() => void handleRemoveFromFolder(folder.id)}
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            </div>
          )}

          <label className="popup-field">
            <span className="popup-label">Title</span>
            <input
              type="text"
              className="popup-input"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Page title"
              required
            />
          </label>

          <div className="popup-field">
            <span className="popup-label">URL</span>
            <p className="popup-url" title={tabUrl}>
              {tabUrl}
            </p>
          </div>

          <div className="popup-field">
            <div className="popup-label-row">
              <label htmlFor="popup-folder-select" className="popup-label">
                {existingBookmark ? "Add to Folder" : "Save to"}
              </label>
              <button
                type="button"
                className="popup-link-btn"
                onClick={() => {
                  setCreatingFolder((prev) => !prev);
                  setNewFolderName("");
                }}
              >
                {creatingFolder ? "Use existing" : "+ New folder"}
              </button>
            </div>

            {creatingFolder ? (
              <input
                type="text"
                className="popup-input"
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                placeholder="New folder name"
                autoFocus
                required
              />
            ) : (
              <select
                id="popup-folder-select"
                className="popup-select"
                value={targetFolderId}
                onChange={(e) => setTargetFolderId(e.target.value)}
              >
                <option value="">Root Grid</option>
                {folderOptions.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.label}
                  </option>
                ))}
              </select>
            )}
          </div>

          {error && <p className="popup-error">{error}</p>}
          {status && <p className="popup-status">{status}</p>}

          <div className="popup-actions">
            <button
              type="submit"
              className="popup-btn-primary"
              disabled={saving}
            >
              {saving
                ? "Saving…"
                : existingBookmark
                  ? "Save Changes"
                  : "Save to Timber"}
            </button>

            {existingBookmark && (
              <button
                type="button"
                className="popup-btn-danger"
                disabled={saving}
                onClick={() => void handleDeleteBookmark()}
              >
                Remove
              </button>
            )}
          </div>
        </form>
      )}
    </main>
  );
}
