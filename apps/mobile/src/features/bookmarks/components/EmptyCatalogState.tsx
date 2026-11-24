/**
 * Onboarding prompt displayed when no bookmarks have been imported into the mobile app yet.
 */

interface EmptyCatalogStateProps {
  onTriggerImport: () => void;
  onAddLink: () => void;
  onCreateFolder: () => void;
}

/**
 * Render an empty-state call-to-action card to import a backup or create links/folders directly.
 */
export default function EmptyCatalogState({
  onTriggerImport,
  onAddLink,
  onCreateFolder,
}: EmptyCatalogStateProps) {
  return (

  <section className="mx-auto my-12 max-w-md rounded-2xl border border-zinc-200 bg-white p-6 text-center shadow-lg dark:border-zinc-800 dark:bg-zinc-900/80">
      <div
        aria-hidden="true"
        className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-teal-500/15 text-2xl"
      >
        🔖
      </div>

      <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
        No bookmarks imported yet
      </h2>

      <p className="mt-2 text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">
        Export a{" "}
        <code className="text-zinc-800 dark:text-zinc-200">
          timber-backup.json
        </code>{" "}
        file from your Timber browser extension and import it here to browse all
        your folders and bookmarks offline.
      </p>

      <button
        type="button"
        onClick={onTriggerImport}
        className="mt-5 w-full rounded-xl bg-teal-600 px-4 py-3 text-sm font-semibold text-white transition active:bg-teal-700"
      >
        Import Backup (.json)
      </button>

      <div className="mt-2.5 grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={onAddLink}
          className="rounded-xl border border-zinc-300 bg-zinc-50 px-3 py-2.5 text-xs font-semibold text-zinc-800 transition active:bg-zinc-200 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:active:bg-zinc-700"
        >
          + Add Link
        </button>

        <button
          type="button"
          onClick={onCreateFolder}
          className="rounded-xl border border-zinc-300 bg-zinc-50 px-3 py-2.5 text-xs font-semibold text-zinc-800 transition active:bg-zinc-200 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:active:bg-zinc-700"
        >
          + New Folder
        </button>
      </div>
    </section>
  );
}
