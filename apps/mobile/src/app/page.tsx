"use client";

import { useRef, useState } from "react";
import {
  CatalogList,
  EmptyCatalogState,
  MobileHeader,
  SettingsModal,
  openBookmarkUrl,
  useTimberCatalog,
} from "@/features/bookmarks";

/**
 * Main Android screen for importing Timber JSON backups, searching, and opening bookmarks.
 */
export default function Home() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
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
   * Pass the selected JSON backup file to the catalog importer and close Settings if open.
   */
  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    // Reset input value so selecting the same filename twice still triggers onChange.
    event.target.value = "";
    if (file) {
      setIsSettingsOpen(false);
      void handleImportJsonFile(file);
    }
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <MobileHeader
        bookmarkCount={bookmarks.length}
        folderCount={folders.length}
        query={query}
        onQueryChange={setQuery}
        onOpenSettings={() => setIsSettingsOpen(true)}
      />

      <main className="safe-area-bottom mx-auto max-w-2xl px-4 pt-3">
        {(status || error) && (
          <div className="mb-3 flex flex-col gap-1">
            {status && (
              <p className="rounded-lg border border-teal-500/30 bg-teal-500/10 px-3 py-2 text-xs text-teal-300">
                {status}
              </p>
            )}
            {error && (
              <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-300">
                {error}
              </p>
            )}
          </div>
        )}

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
          importMode={importMode}
          onImportModeChange={setImportMode}
          onTriggerImport={() => fileInputRef.current?.click()}
          hasCatalogData={hasCatalogData}
          onClearCatalog={() => {
            handleClearCatalog();
            setIsSettingsOpen(false);
          }}
          onClose={() => setIsSettingsOpen(false)}
        />
      )}
    </div>
  );
}
