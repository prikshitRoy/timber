/**
 * Mobile bottom-sheet settings modal for choosing backup import mode (Replace / Merge),
 * importing a Timber JSON backup file, and clearing local catalog data.
 */

import type { BackupImportMode } from "@timber/core";

interface SettingsModalProps {
  importMode: BackupImportMode;
  onImportModeChange: (mode: BackupImportMode) => void;
  onTriggerImport: () => void;
  hasCatalogData: boolean;
  onClearCatalog: () => void;
  onClose: () => void;
}

/**
 * Render the mobile Settings and Backup Import dialog.
 */
export default function SettingsModal({
  importMode,
  onImportModeChange,
  onTriggerImport,
  hasCatalogData,
  onClearCatalog,
  onClose,
}: SettingsModalProps) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="mobile-settings-title"
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 backdrop-blur-sm sm:items-center sm:p-4"
    >
      <div
        onClick={(event) => event.stopPropagation()}
        className="safe-area-bottom w-full max-w-md rounded-t-2xl border border-zinc-800 bg-zinc-900 px-5 pt-5 text-zinc-100 shadow-2xl sm:rounded-2xl sm:pb-5"
      >
        <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
          <h2 id="mobile-settings-title" className="text-base font-semibold">
            Settings & Backup
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-2.5 py-1 text-xs font-medium text-zinc-400 transition active:bg-zinc-800 active:text-zinc-100"
          >
            Close
          </button>
        </div>

        <section className="mt-4">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-400">
            Import Backup (.json)
          </h3>
          <p className="mt-1 text-xs leading-relaxed text-zinc-400">
            Choose whether importing a Timber backup replaces your current list
            or merges new links and folders into it.
          </p>

          <div
            role="radiogroup"
            aria-label="Import mode"
            className="mt-3 grid grid-cols-2 gap-1.5 rounded-xl border border-zinc-800 bg-zinc-950 p-1"
          >
            <button
              type="button"
              onClick={() => onImportModeChange("replace")}
              className={`rounded-lg py-2 text-xs font-semibold transition ${
                importMode === "replace"
                  ? "bg-zinc-800 text-white"
                  : "text-zinc-400"
              }`}
            >
              Replace All
            </button>
            <button
              type="button"
              onClick={() => onImportModeChange("merge")}
              className={`rounded-lg py-2 text-xs font-semibold transition ${
                importMode === "merge"
                  ? "bg-zinc-800 text-white"
                  : "text-zinc-400"
              }`}
            >
              Merge Into Current
            </button>
          </div>

          <button
            type="button"
            onClick={onTriggerImport}
            className="mt-3 w-full rounded-xl bg-teal-600 px-4 py-3 text-sm font-semibold text-white transition active:bg-teal-700"
          >
            Choose Backup File (.json)
          </button>
        </section>

        {hasCatalogData && (
          <section className="mt-5 border-t border-zinc-800 pt-4">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-400">
              Local Data
            </h3>
            <button
              type="button"
              onClick={onClearCatalog}
              className="mt-2.5 w-full rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-2.5 text-sm font-semibold text-red-400 transition active:bg-red-500/20"
            >
              Clear All Bookmarks
            </button>
          </section>
        )}
      </div>
    </div>
  );
}
