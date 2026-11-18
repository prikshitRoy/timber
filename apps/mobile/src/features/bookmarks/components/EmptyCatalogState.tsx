/**
 * Onboarding prompt displayed when no bookmarks have been imported into the mobile app yet.
 */

interface EmptyCatalogStateProps {
  onTriggerImport: () => void;
}

/**
 * Render an empty-state call-to-action card to import a Timber JSON backup file.
 */
export default function EmptyCatalogState({
  onTriggerImport,
}: EmptyCatalogStateProps) {
  return (
    <section className="mx-auto my-12 max-w-md rounded-2xl border border-zinc-800 bg-zinc-900/80 p-6 text-center shadow-lg">
      <div
        aria-hidden="true"
        className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-teal-500/15 text-2xl"
      >
        🔖
      </div>

      <h2 className="text-base font-semibold text-zinc-100">
        No bookmarks imported yet
      </h2>

      <p className="mt-2 text-xs leading-relaxed text-zinc-400">
        Export a <code className="text-zinc-200">timber-backup.json</code> file
        from your Timber browser extension and import it here to browse all your
        folders and bookmarks offline.
      </p>

      <button
        type="button"
        onClick={onTriggerImport}
        className="mt-5 w-full rounded-xl bg-teal-600 px-4 py-3 text-sm font-semibold text-white transition active:bg-teal-700"
      >
        Import Backup (.json)
      </button>
    </section>
  );
}
