/**
 * React hook for exporting JSON backups, exporting Netscape HTML bookmark files,
 * and importing/restoring backups in merge or replace mode.
 */

import {
  createBackup,
  dropStaleNativeLinks,
  exportBookmarksHtml,
  parseBackup,
} from "@timber/core";
import {
  backupFileName,
  downloadTextFile,
} from "../../../src/shared/backup/download-file";
import { bookmarkRepository } from "../../../src/shared/bookmarks/bookmark-repository";
import { hasBookmarkPermission } from "../../../src/shared/bookmarks/bookmark-synchronizer";
import { readNativeBookmarkTree } from "../../../src/shared/bookmarks/bookmark-tree-reader";
import { detectBrowser } from "../../../src/shared/browser/browser-info";

interface UseBackupActionsParams {
  loadCatalog: () => Promise<void>;
  setStatus: (status: string) => void;
  setError: (error: string) => void;
}

/**
 * Create handlers for exporting and importing Timber backup files.
 */
export function useBackupActions({
  loadCatalog,
  setStatus,
  setError,
}: UseBackupActionsParams) {
  /**
   * Export the current TimberState as a downloadable JSON backup file.
   */
  async function handleExportBackup() {
    try {
      const state = await bookmarkRepository.getState();

      downloadTextFile(
        backupFileName("json"),
        JSON.stringify(createBackup(state), null, 2),
        "application/json"
      );

      setStatus("Backup exported.");
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "Failed to export backup."
      );
    }
  }

  /**
   * Export the current TimberState as a browser-importable Netscape HTML bookmarks file.
   */
  async function handleExportHtml() {
    try {
      const state = await bookmarkRepository.getState();

      downloadTextFile(
        backupFileName("html"),
        exportBookmarksHtml(state),
        "text/html"
      );

      setStatus("Bookmarks exported as HTML.");
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "Failed to export bookmarks."
      );
    }
  }

  /**
   * Import a JSON backup file using either non-destructive "merge" or full "replace" mode.
   */
  async function handleImportBackup(file: File, mode: "merge" | "replace") {
    try {
      setError("");

      const { state: imported, skippedBookmarks } = parseBackup(
        await file.text()
      );

      const skippedNote =
        skippedBookmarks > 0
          ? ` (${skippedBookmarks} invalid link${
              skippedBookmarks === 1 ? "" : "s"
            } skipped)`
          : "";

      const browserKind = await detectBrowser();

      if (mode === "replace") {
        const isConfirmed = window.confirm(
          "Replace ALL current Timber data with this backup? This can't be undone. If you might need your current data, export a backup of it first."
        );
        if (!isConfirmed) return;

        let liveNative: Map<string, number | undefined> | null = null;
        if (await hasBookmarkPermission()) {
          const native = await readNativeBookmarkTree();
          liveNative = new Map<string, number | undefined>(
            native.map(
              (item) => [item.nativeBookmarkId, item.dateAdded] as const
            )
          );
        }

        dropStaleNativeLinks(imported, browserKind, liveNative);

        await bookmarkRepository.replaceState(imported);
        await loadCatalog();

        setStatus(
          `Backup restored: ${imported.bookmarks.length} bookmarks${skippedNote}.`
        );
        return;
      }

      await bookmarkRepository.initialize(browserKind);

      const summary = await bookmarkRepository.mergeBackup(imported);
      await loadCatalog();

      setStatus(
        `Backup merged: ${summary.bookmarksAdded} new bookmark${
          summary.bookmarksAdded === 1 ? "" : "s"
        }, ${summary.foldersAdded} new folder${
          summary.foldersAdded === 1 ? "" : "s"
        }${skippedNote}.`
      );
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "Failed to import backup."
      );
    }
  }

  return {
    handleExportBackup,
    handleExportHtml,
    handleImportBackup,
  };
}
