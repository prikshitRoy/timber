/**
 * Reusable mobile bottom-sheet modal for entering a folder name
 * (used for creating top-level folders, creating sub-folders, and renaming folders).
 */

import { useState, type FormEvent } from "react";

interface FolderNameModalProps {
  title: string;
  submitLabel: string;
  initialName?: string;
  description?: string;
  onSubmit: (name: string) => boolean;
  onClose: () => void;
}

/**
 * Render a mobile bottom-sheet dialog with a validated folder name input.
 */
export default function FolderNameModal({
  title,
  submitLabel,
  initialName = "",
  description,
  onSubmit,
  onClose,
}: FolderNameModalProps) {
  const [name, setName] = useState(initialName);
  const [validationError, setValidationError] = useState("");

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const trimmed = name.trim();

    if (!trimmed) {
      setValidationError("Folder name is required.");
      return;
    }

    setValidationError("");
    const succeeded = onSubmit(trimmed);
    if (succeeded) {
      onClose();
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="folder-name-modal-title"
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm sm:items-center sm:p-4 dark:bg-black/75"
    >
      <form
        onSubmit={handleSubmit}
        onClick={(event) => event.stopPropagation()}
        className="safe-area-bottom w-full max-w-md rounded-t-2xl border border-zinc-200 bg-white px-5 pt-5 text-zinc-900 shadow-2xl sm:rounded-2xl sm:pb-5 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100"
      >
        <div className="flex items-center justify-between border-b border-zinc-200 pb-3 dark:border-zinc-800">
          <h2 id="folder-name-modal-title" className="truncate text-base font-semibold">
            {title}
          </h2>

          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-lg px-2.5 py-1 text-xs font-medium text-zinc-500 transition active:bg-zinc-100 dark:text-zinc-400 dark:active:bg-zinc-800"
          >
            Cancel
          </button>
        </div>

        <div className="mt-4 flex flex-col gap-3">
          {description && (
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              {description}
            </p>
          )}

          <label className="flex flex-col gap-1">
            <span className="text-xs font-semibold text-zinc-600 dark:text-zinc-400">
              Folder name
            </span>
            <input
              type="text"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="e.g. Reading List"
              autoFocus
              required
              className="w-full rounded-xl border border-zinc-300 bg-zinc-50 px-3 py-2.5 text-sm text-zinc-900 outline-none focus:border-teal-500 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
            />
          </label>

          {validationError && (
            <p className="text-xs font-medium text-red-600 dark:text-red-400">
              {validationError}
            </p>
          )}
        </div>

        <div className="mt-5 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-zinc-300 bg-zinc-100 px-4 py-2.5 text-xs font-semibold text-zinc-700 transition active:bg-zinc-200 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="rounded-xl bg-teal-600 px-4 py-2.5 text-xs font-semibold text-white transition active:bg-teal-700"
          >
            {submitLabel}
          </button>
        </div>
      </form>
    </div>
  );
}
