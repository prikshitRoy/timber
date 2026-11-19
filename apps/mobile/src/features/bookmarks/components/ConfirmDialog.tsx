/**
 * Reusable mobile confirmation dialog for destructive actions such as
 * clearing local bookmarks or overwriting an existing catalog on Replace import.
 */

interface ConfirmDialogProps {
  title: string;
  description: string;
  confirmLabel: string;
  cancelLabel?: string;
  isDanger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * Render an accessible confirmation dialog with Cancel and Confirm actions.
 */
export default function ConfirmDialog({
  title,
  description,
  confirmLabel,
  cancelLabel = "Cancel",
  isDanger = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  return (
    <div
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-title"
      aria-describedby="confirm-dialog-description"
      onClick={onCancel}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 backdrop-blur-sm dark:bg-black/75"
    >
      <div
        onClick={(event) => event.stopPropagation()}
        className="w-full max-w-sm rounded-2xl border border-zinc-200 bg-white p-5 text-zinc-900 shadow-2xl dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100"
      >
        <h2 id="confirm-dialog-title" className="text-base font-semibold">
          {title}
        </h2>

        <p
          id="confirm-dialog-description"
          className="mt-2 text-xs leading-relaxed text-zinc-500 dark:text-zinc-400"
        >
          {description}
        </p>

        <div className="mt-5 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-xl border border-zinc-300 bg-zinc-100 px-4 py-2 text-xs font-semibold text-zinc-700 transition active:bg-zinc-200 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200 dark:active:bg-zinc-700"
          >
            {cancelLabel}
          </button>

          <button
            type="button"
            onClick={onConfirm}
            className={`rounded-xl px-4 py-2 text-xs font-semibold text-white transition ${
              isDanger
                ? "bg-red-600 active:bg-red-700"
                : "bg-teal-600 active:bg-teal-700"
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
