"use client";

import { useRef, useState } from "react";
import {
  CatalogList,
  ConfirmDialog,
  EmptyCatalogState,
  MobileHeader,
  SettingsModal,
  StatusBanner,
  copyBookmarkUrl,
  openBookmarkUrl,
  useTimberCatalog,
} from "@/features/bookmarks";
import { useMobileTheme } from "@/features/theme";

// Tracks a pending destructive action awaiting explicit confirmation from the user.
type PendingConfirmation =
  | { kind: "clear" }
  | { kind: "replace"; file: File };

/**
 * Main Android screen for importing Timber JSON backups, searching, and opening bookmarks.
 */
export default function Home() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { themeMode, setThemeMode } = useMobileTheme();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [pendingConfirm, setPendingConfirm] =
    useState<PendingConfirmation | null>(null);
  const {
    isLoaded,
    hasCatalogData,
    bookmarks,
    folders,
    bookmarksById,
    rootTiles,
    query,
    setQuery,
    searchResults,
    importMode,
    setImportMode,
    status,
    setStatus,
    error,
    setError,
    handleImportJsonFile,
    handleClearCatalog,
  } = useTimberCatalog();

  /**
   * Open a bookmark link in Android's default browser and surface any error.
   */
  async function handleOpenBookmark(url: string) {
    try {
      setError("");
      await openBookmarkUrl(url);
    } catch (openError) {
      setError(
        openError instanceof Error ? openError.message : "Failed to open link."
      );
    }
  }

  /**
   * Copy a bookmark URL to the Android clipboard and show a transient confirmation message.
   */
  async function handleCopyBookmark(url: string) {
    try {
      setError("");
      await copyBookmarkUrl(url);
      setStatus("Link copied to clipboard.");
    } catch (copyError) {
      setError(
        copyError instanceof Error
          ? copyError.message
          : "Failed to copy link."
      );
    }
  }

/**
   * Guard Replace imports with a confirmation dialog when local data exists; import immediately otherwise.
   */
  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    // Reset input value so selecting the same filename twice still triggers onChange.
    event.target.value = "";
    if (!file) return;

    setIsSettingsOpen(false);

    if (importMode === "replace" && hasCatalogData) {
      setPendingConfirm({ kind: "replace", file });
      return;
    }

    void handleImportJsonFile(file);
  }

  /**
   * Execute the pending destructive action after explicit user confirmation.
   */
  function handleConfirmAction() {
    if (!pendingConfirm) return;

    if (pendingConfirm.kind === "clear") {
      handleClearCatalog();
    } else {
      void handleImportJsonFile(pendingConfirm.file);
    }

    setPendingConfirm(null);
  }

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100">
      <MobileHeader
        bookmarkCount={bookmarks.length}
        folderCount={folders.length}
        query={query}
        onQueryChange={setQuery}
        onOpenSettings={() => setIsSettingsOpen(true)}
      />

      <main className="safe-area-bottom mx-auto max-w-2xl px-4 pt-3">
        <StatusBanner
          status={status}
          error={error}
          onDismissStatus={() => setStatus("")}
          onDismissError={() => setError("")}
        />

        {!isLoaded ? (
          <p className="py-12 text-center text-xs text-zinc-500">
            Loading bookmarks...
          </p>
        ) : !hasCatalogData ? (
          <EmptyCatalogState
            onTriggerImport={() => fileInputRef.current?.click()}
          />
        ) : (
          <CatalogList
            query={query}
            searchResults={searchResults}
            rootTiles={rootTiles}
            folders={folders}
            bookmarksById={bookmarksById}
            onOpenUrl={(url) => void handleOpenBookmark(url)}
            onCopyUrl={(url) => void handleCopyBookmark(url)}
          />
        )}
      </main>
      
      <input
        ref={fileInputRef}
        type="file"
        accept="application/json,.json"
        hidden
        onChange={handleFileChange}
      />

      {isSettingsOpen && (
        <SettingsModal
          themeMode={themeMode}
          onThemeModeChange={setThemeMode}
          importMode={importMode}
          onImportModeChange={setImportMode}
          onTriggerImport={() => fileInputRef.current?.click()}
          hasCatalogData={hasCatalogData}
          onClearCatalog={() => {
            setIsSettingsOpen(false);
            setPendingConfirm({ kind: "clear" });
          }}
          onClose={() => setIsSettingsOpen(false)}
        />
      )}

      {pendingConfirm && (
        <ConfirmDialog
          title={
            pendingConfirm.kind === "clear"
              ? "Clear all bookmarks?"
              : "Replace current bookmarks?"
          }
          description={
            pendingConfirm.kind === "clear"
              ? `This removes all ${bookmarks.length} bookmarks and ${folders.length} folders from this device. This can't be undone.`
              : `Importing "${pendingConfirm.file.name}" in Replace mode will overwrite your current ${bookmarks.length} bookmarks and ${folders.length} folders.`
          }
          confirmLabel={
            pendingConfirm.kind === "clear" ? "Clear All" : "Replace All"
          }
          isDanger
          onConfirm={handleConfirmAction}
          onCancel={() => setPendingConfirm(null)}
        />
      )}
    </div>
  );
}
