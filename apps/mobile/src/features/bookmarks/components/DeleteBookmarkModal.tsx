/**
 * Confirmation modal shown when deleting a bookmark that exists in multiple places,
 * offering "Delete only this instance" vs. "Delete all duplicates".
 */

interface DeleteBookmarkModalProps {
  title: string;
  instanceCount: number;
  onDeleteOnlyThisInstance: () => void;
  onDeleteAllDuplicates: () => void;
  onCancel: () => void;
}

/**
 * Render the two-option duplicate bookmark deletion dialog for mobile.
 */
export default function DeleteBookmarkModal({
  title,
  instanceCount,
  onDeleteOnlyThisInstance,
  onDeleteAllDuplicates,
  onCancel,
}: DeleteBookmarkModalProps) {
  return (
    <div
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="delete-duplicate-title"
      onClick={onCancel}
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm sm:items-center sm:p-4 dark:bg-black/75"
    >
      <div
        onClick={(event) => event.stopPropagation()}
        className="safe-area-bottom w-full max-w-md rounded-t-2xl border border-zinc-200 bg-white px-5 pt-5 text-zinc-900 shadow-2xl sm:rounded-2xl sm:pb-5 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100"
      >
        <h2 id="delete-duplicate-title" className="text-base font-semibold">
          Delete duplicate link
        </h2>

        <p className="mt-2 text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">
          <strong className="text-zinc-800 dark:text-zinc-200">
            &ldquo;{title}&rdquo;
          </strong>{" "}
          exists in {instanceCount} places in Timber. What would you like to
          delete?
        </p>

        <div className="mt-4 flex flex-col gap-2">
          <button
            type="button"
            onClick={onDeleteOnlyThisInstance}
            className="flex w-full flex-col items-start rounded-xl border border-zinc-200 bg-zinc-50 px-3.5 py-3 text-left transition active:bg-zinc-200 dark:border-zinc-800 dark:bg-zinc-950/70 dark:active:bg-zinc-800"
          >
            <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              Delete only this instance
            </span>
            <span className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
              Remove the selected link without affecting other copies.
            </span>
          </button>

          <button
            type="button"
            onClick={onDeleteAllDuplicates}
            className="flex w-full flex-col items-start rounded-xl border border-red-500/30 bg-red-500/10 px-3.5 py-3 text-left transition active:bg-red-500/20"
          >
            <span className="text-sm font-semibold text-red-600 dark:text-red-400">
              Delete all duplicates
            </span>
            <span className="mt-0.5 text-xs text-zinc-600 dark:text-zinc-400">
              Remove every instance of this link across root and all folders.
            </span>
          </button>
        </div>

        <div className="mt-4 flex justify-end">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-xl border border-zinc-300 bg-zinc-100 px-4 py-2 text-xs font-semibold text-zinc-700 transition active:bg-zinc-200 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
