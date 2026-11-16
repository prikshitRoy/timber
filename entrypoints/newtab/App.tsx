/**
 * Root New Tab dashboard component coordinating catalog state, search, root grid, and modals.
 */

import { useMemo, useState } from "react";
import AddLinkModal from "./AddLinkModal";
import EditBookmarkModal from "./EditBookmarkModal";
import EditFolderLinksModal from "./EditFolderLinksModal";
import RootGrid from "./RootGrid";
import SettingsModal from "./SettingsModal";
import SyncReviewModal from "./SyncReviewModal";
import ConnectBookmarksSection from "./components/ConnectBookmarksSection";
import DashboardFooter from "./components/DashboardFooter";
import DashboardHeader from "./components/DashboardHeader";
import SearchResultsGrid from "./components/SearchResultsGrid";
import { useBackupActions } from "./hooks/useBackupActions";
import { useBookmarkAndFolderActions } from "./hooks/useBookmarkAndFolderActions";
import { useBookmarkSync } from "./hooks/useBookmarkSync";
import { useDashboardCatalog } from "./hooks/useDashboardCatalog";
import type { EditingBookmarkState } from "./types";

/**
 * Render the Timber New Tab bookmark dashboard, toolbar, folder/link grid, and active modal dialogs.
 */
function App() {
  const {
    connected,
    setConnected,
    bookmarks,
    folders,
    status,
    setStatus,
    error,
    setError,
    nativeChanged,
    setNativeChanged,
    loadCatalog,
    bookmarksById,
    rootTiles,
    hasLocalData,
  } = useDashboardCatalog();

  const {
    loading,
    pendingSync,
    clearPendingSync,
    handleConnect,
    handleScan,
    handleApplySync,
  } = useBookmarkSync({
    setConnected,
    setNativeChanged,
    setStatus,
    setError,
    loadCatalog,
  });

  const actions = useBookmarkAndFolderActions({
    loadCatalog,
    setStatus,
    setError,
  });

  const backupActions = useBackupActions({
    loadCatalog,
    setStatus,
    setError,
  });

  const [query, setQuery] = useState("");
  const [editMode, setEditMode] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showAddLink, setShowAddLink] = useState(false);
  const [addLinkTargetFolderId, setAddLinkTargetFolderId] = useState<
    string | null
  >(null);
  const [editingBookmark, setEditingBookmark] =
    useState<EditingBookmarkState | null>(null);
  const [editingFolderLinksId, setEditingFolderLinksId] = useState<
    string | null
  >(null);

  const filteredBookmarks = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return [];

    return bookmarks.filter(
      (bookmark) =>
        bookmark.title.toLowerCase().includes(normalizedQuery) ||
        bookmark.url.toLowerCase().includes(normalizedQuery)
    );
  }, [bookmarks, query]);

  const editingFolder = editingFolderLinksId
    ? folders.find((folder) => folder.id === editingFolderLinksId) ?? null
    : null;

  /**
   * Open the single-bookmark edit modal pre-populated with the bookmark's current title and URL.
   */
  function handleStartEditBookmark(
    bookmarkId: string,
    title: string,
    url: string
  ) {
    setEditingBookmark({ id: bookmarkId, title, url });
  }

  return (
    <main className="timber-dashboard">
      <DashboardHeader
        query={query}
        onQueryChange={setQuery}
        connected={connected}
        nativeChanged={nativeChanged}
        loading={loading}
        onScan={handleScan}
        onAddRootLink={() => {
          setAddLinkTargetFolderId(null);
          setShowAddLink(true);
        }}
        onCreateFolder={actions.handleCreateFolder}
      />

      {!connected && !hasLocalData ? (
        <ConnectBookmarksSection loading={loading} onConnect={handleConnect} />
      ) : (
        <>
          <section className="bookmark-toolbar">
            <span>{bookmarks.length} bookmarks</span>
          </section>

          {query ? (
            <SearchResultsGrid
              bookmarks={filteredBookmarks}
              folders={folders}
              onAddBookmarkToFolder={actions.handleAddBookmarkToFolder}
              onCreateFolderAndAdd={actions.handleCreateFolderAndAdd}
              onEditBookmark={handleStartEditBookmark}
              onCopyBookmark={actions.handleCopyBookmarkLink}
              onDeleteBookmark={actions.handleDeleteBookmark}
            />
          ) : (
            <RootGrid
              tiles={rootTiles}
              editMode={editMode}
              folders={folders}
              bookmarksById={bookmarksById}
              onReorder={actions.handleReorderRoot}
              onRenameFolder={actions.handleRenameFolder}
              onDeleteFolder={actions.handleDeleteFolder}
              onRemoveBookmarkFromFolder={actions.handleRemoveBookmarkFromFolder}
              onDeleteBookmark={actions.handleDeleteBookmark}
              onEditBookmark={handleStartEditBookmark}
              onCopyBookmark={actions.handleCopyBookmarkLink}
              onEditFolderLinks={setEditingFolderLinksId}
              onAddLinkToFolder={(folderId) => {
                setAddLinkTargetFolderId(folderId);
                setShowAddLink(true);
              }}
              onAddSubFolder={actions.handleAddSubFolder}
              onReorderFolderChildren={actions.handleReorderFolderChildren}
            />
          )}
        </>
      )}

      <DashboardFooter
        status={status}
        error={error}
        editMode={editMode}
        onToggleEditMode={() => setEditMode((value) => !value)}
        onOpenSettings={() => setShowSettings(true)}
      />

      {pendingSync && (
        <SyncReviewModal
          diff={pendingSync.diff}
          onCancel={clearPendingSync}
          onApply={handleApplySync}
        />
      )}

      {showAddLink && (
        <AddLinkModal
          targetFolderName={
            addLinkTargetFolderId
              ? folders.find((folder) => folder.id === addLinkTargetFolderId)
                  ?.name
              : undefined
          }
          onClose={() => {
            setShowAddLink(false);
            setAddLinkTargetFolderId(null);
          }}
          onCreate={async (url, title) => {
            await actions.handleCreateLink(url, title, addLinkTargetFolderId);
            setShowAddLink(false);
            setAddLinkTargetFolderId(null);
          }}
        />
      )}

      {editingBookmark && (
        <EditBookmarkModal
          bookmarkId={editingBookmark.id}
          initialTitle={editingBookmark.title}
          initialUrl={editingBookmark.url}
          onClose={() => setEditingBookmark(null)}
          onSave={async (bookmarkId, title, url) => {
            await actions.handleSaveBookmarkEdit(bookmarkId, title, url);
            setEditingBookmark(null);
          }}
        />
      )}

      {editingFolder && (
        <EditFolderLinksModal
          folderName={editingFolder.name}
          bookmarkIds={editingFolder.bookmarkIds ?? []}
          bookmarksById={bookmarksById}
          onClose={() => setEditingFolderLinksId(null)}
          onCopySelected={actions.handleCopyFolderLinks}
          onDeleteSelected={(bookmarkIds, alsoDeleteFolder) =>
            actions.handleDeleteFolderLinks(
              editingFolder.id,
              bookmarkIds,
              alsoDeleteFolder,
              () => setEditingFolderLinksId(null)
            )
          }
          onSaveEdits={actions.handleSaveFolderLinkEdits}
        />
      )}

      {showSettings && (
        <SettingsModal
          connected={connected}
          loading={loading}
          onClose={() => setShowSettings(false)}
          onConnect={handleConnect}
          onExportBackup={backupActions.handleExportBackup}
          onExportHtml={backupActions.handleExportHtml}
          onImportBackup={backupActions.handleImportBackup}
        />
      )}
    </main>
  );
}

export default App;
