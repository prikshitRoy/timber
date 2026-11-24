/**
 * Mobile bottom-sheet modal for filing an existing bookmark into an existing
 * custom folder or creating a new folder and filing it immediately.
 */

import { useMemo, useState, type FormEvent } from "react";
import type { Bookmark, BookmarkPage } from "@timber/core";
import { buildFolderOptions } from "../state/folder-options";

interface AddToFolderModalProps {
  bookmark: Bookmark;
  folders: BookmarkPage[];
  onAddToFolder: (
    bookmarkId: string,
    folderId?: string,
    newFolderName?: string
  ) => boolean;
  onClose: () => void;
}

/**
 * Render a folder picker and inline new-folder creator for a bookmark.
 */
export default function AddToFolderModal({
  bookmark,
  folders,
  onAddToFolder,
  onClose,
}: AddToFolderModalProps) {
  const folderOptions = useMemo(() => buildFolderOptions(folders), [folders]);
  const existingFolderIds = useMemo(
    () =>
      new Set(
        folders
          .filter((folder) => folder.bookmarkIds?.includes(bookmark.id))
          .map((folder) => folder.id)
      ),
    [folders, bookmark.id]
  );

  const [creatingFolder, setCreatingFolder] = useState(
    folderOptions.length === 0
  );
  const [newFolderName, setNewFolderName] = useState("");
  const [validationError, setValidationError] = useState("");

  function handleSelectExisting(folderId: string) {
    const added = onAddToFolder(bookmark.id, folderId);
    if (added) {
      onClose();
    }
  }

  function handleCreateAndAdd(event: FormEvent) {
    event.preventDefault();
    const trimmed = newFolderName.trim();
    if (!trimmed) {
      setValidationError("Folder name is required.");
      return;
    }

    setValidationError("");
    const added = onAddToFolder(bookmark.id, undefined, trimmed);
    if (added) {
      onClose();
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="add-to-folder-modal-title"
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm sm:items-center sm:p-4 dark:bg-black/75"
    >
      <div
        onClick={(event) => event.stopPropagation()}
        className="safe-area-bottom flex max-h-[82vh] w-full max-w-md flex-col rounded-t-2xl border border-zinc-200 bg-white px-5 pt-5 text-zinc-900 shadow-2xl sm:rounded-2xl sm:pb-5 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100"
      >
        <div className="flex items-start justify-between gap-3 border-b border-zinc-200 pb-3 dark:border-zinc-800">
          <div className="min-w-0">
            <h2 id="add-to-folder-modal-title" className="text-base font-semibold">
              Add to folder
            </h2>
            <p className="mt-0.5 truncate text-xs text-zinc-500 dark:text-zinc-400">
              {bookmark.title}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-lg px-2.5 py-1 text-xs font-medium text-zinc-500 transition active:bg-zinc-100 dark:text-zinc-400 dark:active:bg-zinc-800"
          >
            Close
          </button>
        </div>

        <div className="mt-3 flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
            {creatingFolder ? "New folder" : "Choose folder"}
          </span>

          {folderOptions.length > 0 && (
            <button
              type="button"
              onClick={() => {
                setCreatingFolder((prev) => !prev);
                setValidationError("");
              }}
              className="text-xs font-semibold text-teal-600 dark:text-teal-400"
            >
              {creatingFolder ? "Use existing folder" : "+ New folder"}
            </button>
          )}
        </div>

        {creatingFolder ? (
          <form onSubmit={handleCreateAndAdd} className="mt-3 flex flex-col gap-3">
            <input
              type="text"
              value={newFolderName}
              onChange={(event) => setNewFolderName(event.target.value)}
              placeholder="New folder name"
              autoFocus
              required
              className="w-full rounded-xl border border-zinc-300 bg-zinc-50 px-3 py-2.5 text-sm text-zinc-900 outline-none focus:border-teal-500 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
            />

            {validationError && (
              <p className="text-xs font-medium text-red-600 dark:text-red-400">
                {validationError}
              </p>
            )}

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl border border-zinc-300 bg-zinc-100 px-4 py-2.5 text-xs font-semibold text-zinc-700 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="rounded-xl bg-teal-600 px-4 py-2.5 text-xs font-semibold text-white transition active:bg-teal-700"
              >
                Create & Add
              </button>
            </div>
          </form>
        ) : (
          <div className="mt-2.5 flex flex-col gap-1.5 overflow-y-auto pr-0.5">
            {folderOptions.map((option) => {
              const isAlreadyInFolder = existingFolderIds.has(option.id);
              return (
                <button
                  key={option.id}
                  type="button"
                  disabled={isAlreadyInFolder}
                  onClick={() => handleSelectExisting(option.id)}
                  className="flex w-full items-center justify-between gap-3 rounded-xl border border-zinc-200 bg-zinc-50/70 px-3.5 py-2.5 text-left transition active:bg-zinc-200 disabled:opacity-55 dark:border-zinc-800 dark:bg-zinc-950/60 dark:active:bg-zinc-800"
                >
                  <span className="flex min-w-0 items-center gap-2">
                    <span aria-hidden="true" className="shrink-0">
                      📁
                    </span>
                    <span className="truncate text-sm font-medium text-zinc-900 dark:text-zinc-100">
                      {option.label}
                    </span>
                  </span>

                  {isAlreadyInFolder && (
                    <span className="shrink-0 rounded-full bg-teal-500/15 px-2 py-0.5 text-[10px] font-semibold text-teal-700 dark:text-teal-300">
                      Added
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
