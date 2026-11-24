/**
 * Mobile bottom-sheet modal for manually adding a new bookmark URL and optional title
 * to the root grid or a chosen custom folder.
 */

import { useMemo, useState, type FormEvent } from "react";
import { isSupportedBookmarkUrl, type BookmarkPage } from "@timber/core";
import { buildFolderOptions } from "../state/folder-options";
import type { AddMobileLinkInput } from "../state/mobile-mutations";

interface AddLinkModalProps {
  folders: BookmarkPage[];
  lockedFolder?: { id: string; name: string } | null;
  onCreate: (input: AddMobileLinkInput) => boolean;
  onClose: () => void;
}

/**
 * Render a mobile bottom-sheet form to create a manual bookmark link.
 */
export default function AddLinkModal({
  folders,
  lockedFolder = null,
  onCreate,
  onClose,
}: AddLinkModalProps) {
  const [url, setUrl] = useState("");
  const [title, setTitle] = useState("");
  const [selectedFolderId, setSelectedFolderId] = useState(
    lockedFolder?.id ?? ""
  );
  const [validationError, setValidationError] = useState("");

  const folderOptions = useMemo(() => buildFolderOptions(folders), [folders]);

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const trimmedUrl = url.trim();

    if (!isSupportedBookmarkUrl(trimmedUrl)) {
      setValidationError("Please enter a valid http:// or https:// URL.");
      return;
    }

    setValidationError("");
    const saved = onCreate({
      url: trimmedUrl,
      title: title.trim() || trimmedUrl,
      folderId: lockedFolder?.id ?? (selectedFolderId || undefined),
    });

    if (saved) {
      onClose();
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="add-link-modal-title"
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm sm:items-center sm:p-4 dark:bg-black/75"
    >
      <form
        onSubmit={handleSubmit}
        onClick={(event) => event.stopPropagation()}
        className="safe-area-bottom w-full max-w-md rounded-t-2xl border border-zinc-200 bg-white px-5 pt-5 text-zinc-900 shadow-2xl sm:rounded-2xl sm:pb-5 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100"
      >
        <div className="flex items-center justify-between border-b border-zinc-200 pb-3 dark:border-zinc-800">
          <h2 id="add-link-modal-title" className="truncate text-base font-semibold">
            {lockedFolder ? `Add link to ${lockedFolder.name}` : "Add a link"}
          </h2>

          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-lg px-2.5 py-1 text-xs font-medium text-zinc-500 transition active:bg-zinc-100 dark:text-zinc-400 dark:active:bg-zinc-800"
          >
            Cancel
          </button>
        </div>

        <div className="mt-4 flex flex-col gap-3.5">
          <label className="flex flex-col gap-1">
            <span className="text-xs font-semibold text-zinc-600 dark:text-zinc-400">
              URL
            </span>
            <input
              type="url"
              value={url}
              onChange={(event) => setUrl(event.target.value)}
              placeholder="https://example.com"
              autoFocus
              required
              className="w-full rounded-xl border border-zinc-300 bg-zinc-50 px-3 py-2.5 text-sm text-zinc-900 outline-none focus:border-teal-500 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
            />
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-xs font-semibold text-zinc-600 dark:text-zinc-400">
              Title (optional)
            </span>
            <input
              type="text"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Example"
              className="w-full rounded-xl border border-zinc-300 bg-zinc-50 px-3 py-2.5 text-sm text-zinc-900 outline-none focus:border-teal-500 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
            />
          </label>

          {!lockedFolder && folderOptions.length > 0 && (
            <label className="flex flex-col gap-1">
              <span className="text-xs font-semibold text-zinc-600 dark:text-zinc-400">
                Save to
              </span>
              <select
                value={selectedFolderId}
                onChange={(event) => setSelectedFolderId(event.target.value)}
                className="w-full rounded-xl border border-zinc-300 bg-zinc-50 px-3 py-2.5 text-sm text-zinc-900 outline-none focus:border-teal-500 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
              >
                <option value="">Root Grid</option>
                {folderOptions.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          )}

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
            Add Link
          </button>
        </div>
      </form>
    </div>
  );
}
