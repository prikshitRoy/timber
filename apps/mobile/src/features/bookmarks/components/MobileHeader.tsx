/**
 * Top navigation header for the Android app featuring brand title, bookmark count,
 * Replace/Merge mode toggle, JSON file picker trigger, and search input.
 */

import type { RefObject } from "react";
import type { BackupImportMode } from "@timber/core";

interface MobileHeaderProps {
  bookmarkCount: number;
  folderCount: number;
  query: string;
  onQueryChange: (value: string) => void;
  importMode: BackupImportMode;
  onImportModeChange: (mode: BackupImportMode) => void;
  fileInputRef: RefObject<HTMLInputElement>;
  onFileSelected: (file: File) => void;
  hasCatalogData: boolean;
  onClearCatalog: () => void;
}

/**
 * Render the sticky mobile header bar, file import controls, and search input.
 */
export default function MobileHeader({
  bookmarkCount,
  folderCount,
  query,
  onQueryChange,
  importMode,
  onImportModeChange,
  fileInputRef,
  onFileSelected,
  hasCatalogData,
  onClearCatalog,
}: MobileHeaderProps) {
  /**
   * Forward the chosen JSON file to the catalog import handler and reset the file input.
   */
  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (file) {
      onFileSelected(file);
    }
  }

  return (
    <header className="sticky top-0 z-20 border-b border-zinc-800 bg-zinc-950/95 px-4 pb-3 pt-4 backdrop-blur">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span
            aria-hidden="true"
            className="h-2.5 w-2.5 rounded-full bg-teal-500 ring-4 ring-teal-500/20"
          />
          <h1 className="text-lg font-bold tracking-tight text-zinc-100">
            Timber
          </h1>
          <span className="rounded-full bg-zinc-800 px-2.5 py-0.5 text-xs font-medium text-zinc-300">
            {bookmarkCount} links · {folderCount} folders
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="rounded-lg bg-teal-600 px-3 py-1.5 text-xs font-semibold text-white transition active:bg-teal-700"
          >
            Import JSON
          </button>

          {hasCatalogData && (
            <button
              type="button"
              onClick={onClearCatalog}
              className="rounded-lg border border-zinc-700 bg-zinc-900 px-2.5 py-1.5 text-xs font-medium text-zinc-300 transition active:bg-zinc-800"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      <div className="mt-2.5 flex items-center justify-between gap-2 text-xs text-zinc-400">
        <span>Import mode:</span>
        <div
          role="radiogroup"
          aria-label="Import mode"
          className="inline-flex rounded-lg border border-zinc-800 bg-zinc-900 p-0.5"
        >
          <button
            type="button"
            onClick={() => onImportModeChange("replace")}
            className={`rounded-md px-2.5 py-1 text-xs font-medium transition ${
              importMode === "replace"
                ? "bg-zinc-700 text-white"
                : "text-zinc-400"
            }`}
          >
            Replace
          </button>
          <button
            type="button"
            onClick={() => onImportModeChange("merge")}
            className={`rounded-md px-2.5 py-1 text-xs font-medium transition ${
              importMode === "merge"
                ? "bg-zinc-700 text-white"
                : "text-zinc-400"
            }`}
          >
            Merge
          </button>
        </div>
      </div>

      <div className="mt-2.5">
        <input
          type="search"
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          placeholder="Search bookmarks by title or URL..."
          className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3.5 py-2.5 text-sm text-zinc-100 placeholder-zinc-500 outline-none focus:border-teal-500"
        />
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="application/json,.json"
        hidden
        onChange={handleFileChange}
      />
    </header>
  );
}
