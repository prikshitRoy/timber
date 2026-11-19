/**
 * Mobile bottom-sheet settings modal for switching appearance (System / Light / Dark),
 * choosing backup import mode (Replace / Merge), importing a JSON backup, and clearing local data.
 */

import type { BackupImportMode } from "@timber/core";
import type { MobileThemeMode } from "@/features/theme";

interface SettingsModalProps {
  themeMode: MobileThemeMode;
  onThemeModeChange: (mode: MobileThemeMode) => void;
  importMode: BackupImportMode;
  onImportModeChange: (mode: BackupImportMode) => void;
  onTriggerImport: () => void;
  hasCatalogData: boolean;
  onClearCatalog: () => void;
  onClose: () => void;
}

const THEME_OPTIONS: { value: MobileThemeMode; label: string }[] = [
  { value: "system", label: "System" },
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
];

/**
 * Render the mobile Settings and Backup Import dialog.
 */
export default function SettingsModal({
  themeMode,
  onThemeModeChange,
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
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm sm:items-center sm:p-4 dark:bg-black/70"
    >
      <div
        onClick={(event) => event.stopPropagation()}
        className="safe-area-bottom w-full max-w-md rounded-t-2xl border border-zinc-200 bg-white px-5 pt-5 text-zinc-900 shadow-2xl sm:rounded-2xl sm:pb-5 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100"
      >
        <div className="flex items-center justify-between border-b border-zinc-200 pb-3 dark:border-zinc-800">
          <h2 id="mobile-settings-title" className="text-base font-semibold">
            Settings & Backup
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-2.5 py-1 text-xs font-medium text-zinc-500 transition active:bg-zinc-100 active:text-zinc-900 dark:text-zinc-400 dark:active:bg-zinc-800 dark:active:text-zinc-100"
          >
            Close
          </button>
        </div>

        <section className="mt-4">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
            Appearance
          </h3>

          <div
            role="radiogroup"
            aria-label="Theme appearance"
            className="mt-2.5 grid grid-cols-3 gap-1.5 rounded-xl border border-zinc-200 bg-zinc-100 p-1 dark:border-zinc-800 dark:bg-zinc-950"
          >
            {THEME_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => onThemeModeChange(option.value)}
                className={`rounded-lg py-2 text-xs font-semibold transition ${
                  themeMode === option.value
                    ? "bg-white text-zinc-900 shadow-sm dark:bg-zinc-800 dark:text-white"
                    : "text-zinc-500 dark:text-zinc-400"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </section>

        <section className="mt-5 border-t border-zinc-200 pt-4 dark:border-zinc-800">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
            Import Backup (.json)
          </h3>
          <p className="mt-1 text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">
            Choose whether importing a Timber backup replaces your current list
            or merges new links and folders into it.
          </p>

          <div
            role="radiogroup"
            aria-label="Import mode"
            className="mt-3 grid grid-cols-2 gap-1.5 rounded-xl border border-zinc-200 bg-zinc-100 p-1 dark:border-zinc-800 dark:bg-zinc-950"
          >
            <button
              type="button"
              onClick={() => onImportModeChange("replace")}
              className={`rounded-lg py-2 text-xs font-semibold transition ${
                importMode === "replace"
                  ? "bg-white text-zinc-900 shadow-sm dark:bg-zinc-800 dark:text-white"
                  : "text-zinc-500 dark:text-zinc-400"
              }`}
            >
              Replace All
            </button>
            <button
              type="button"
              onClick={() => onImportModeChange("merge")}
              className={`rounded-lg py-2 text-xs font-semibold transition ${
                importMode === "merge"
                  ? "bg-white text-zinc-900 shadow-sm dark:bg-zinc-800 dark:text-white"
                  : "text-zinc-500 dark:text-zinc-400"
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
          <section className="mt-5 border-t border-zinc-200 pt-4 dark:border-zinc-800">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
              Local Data
            </h3>
            <button
              type="button"
              onClick={onClearCatalog}
              className="mt-2.5 w-full rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-2.5 text-sm font-semibold text-red-600 transition active:bg-red-500/20 dark:text-red-400"
            >
              Clear All Bookmarks
            </button>
          </section>
        )}
      </div>
    </div>
  );
}
