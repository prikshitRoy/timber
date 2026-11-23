/**
 * Mobile bottom-sheet popup modal shown when a URL is shared to Timber from another Android app.
 */

import { useMemo, useState, type FormEvent } from "react";
import { isSupportedBookmarkUrl, type BookmarkPage } from "@timber/core";
import type { IncomingSharedLink } from "../hooks/useSharedLinkIntent";

interface ShareLinkModalProps {
  sharedLink: IncomingSharedLink;
  folders: BookmarkPage[];
  onSave: (input: {
    url: string;
    title: string;
    folderId?: string;
    newFolderName?: string;
  }) => boolean;
  onClose: () => void;
}

interface FolderOption {
  id: string;
  label: string;
}

function buildFolderOptions(pages: BookmarkPage[]): FolderOption[] {
  const byParent = new Map<string, BookmarkPage[]>();
  for (const page of pages) {
    const key = page.parentId ?? "";
    const list = byParent.get(key) ?? [];
    list.push(page);
    byParent.set(key, list);
  }

  for (const list of byParent.values()) {
    list.sort((a, b) => a.name.localeCompare(b.name));
  }

  const options: FolderOption[] = [];
  const visited = new Set<string>();

  function visit(parentId: string, prefix: string[]) {
    for (const child of byParent.get(parentId) ?? []) {
      if (visited.has(child.id)) continue;
      visited.add(child.id);
      const path = [...prefix, child.name];
      options.push({ id: child.id, label: path.join(" / ") });
      visit(child.id, path);
    }
  }

  visit("", []);
  return options;
}

export default function ShareLinkModal({
  sharedLink,
  folders,
  onSave,
  onClose,
}: ShareLinkModalProps) {
  const [url, setUrl] = useState(sharedLink.url);
  const [title, setTitle] = useState(sharedLink.title);
  const [folderId, setFolderId] = useState("");
  const [creatingFolder, setCreatingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [validationError, setValidationError] = useState("");

  const folderOptions = useMemo(() => buildFolderOptions(folders), [folders]);

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const trimmedUrl = url.trim();

    if (!isSupportedBookmarkUrl(trimmedUrl)) {
      setValidationError("Please enter a valid http:// or https:// URL.");
      return;
    }

    if (creatingFolder && !newFolderName.trim()) {
      setValidationError("Please enter a folder name.");
      return;
    }

    setValidationError("");
    const saved = onSave({
      url: trimmedUrl,
      title: title.trim() || trimmedUrl,
      folderId: creatingFolder ? undefined : folderId || undefined,
      newFolderName: creatingFolder ? newFolderName.trim() : undefined,
    });

    if (saved) {
      onClose();
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="share-link-modal-title"
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm sm:items-center sm:p-4 dark:bg-black/75"
    >
      <form
        onSubmit={handleSubmit}
        onClick={(event) => event.stopPropagation()}
        className="safe-area-bottom w-full max-w-md rounded-t-2xl border border-zinc-200 bg-white px-5 pt-5 text-zinc-900 shadow-2xl sm:rounded-2xl sm:pb-5 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100"
      >
        <div className="flex items-center justify-between border-b border-zinc-200 pb-3 dark:border-zinc-800">
          <div className="flex items-center gap-2">
            <span
              aria-hidden="true"
              className="h-2.5 w-2.5 rounded-full bg-teal-500 ring-4 ring-teal-500/20"
            />
            <h2 id="share-link-modal-title" className="text-base font-semibold">
              Save to Timber
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-2.5 py-1 text-xs font-medium text-zinc-500 transition active:bg-zinc-100 dark:text-zinc-400 dark:active:bg-zinc-800"
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
              required
              className="w-full rounded-xl border border-zinc-300 bg-zinc-50 px-3 py-2.5 text-sm text-zinc-900 outline-none focus:border-teal-500 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
            />
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-xs font-semibold text-zinc-600 dark:text-zinc-400">
              Title
            </span>
            <input
              type="text"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Bookmark title"
              className="w-full rounded-xl border border-zinc-300 bg-zinc-50 px-3 py-2.5 text-sm text-zinc-900 outline-none focus:border-teal-500 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
            />
          </label>

          <div className="flex flex-col gap-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-zinc-600 dark:text-zinc-400">
                Save to
              </span>
              <button
                type="button"
                onClick={() => {
                  setCreatingFolder((prev) => !prev);
                  setNewFolderName("");
                }}
                className="text-xs font-semibold text-teal-600 dark:text-teal-400"
              >
                {creatingFolder ? "Use existing folder" : "+ New folder"}
              </button>
            </div>

            {creatingFolder ? (
              <input
                type="text"
                value={newFolderName}
                onChange={(event) => setNewFolderName(event.target.value)}
                placeholder="New folder name"
                autoFocus
                className="w-full rounded-xl border border-zinc-300 bg-zinc-50 px-3 py-2.5 text-sm text-zinc-900 outline-none focus:border-teal-500 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
              />
            ) : (
              <select
                value={folderId}
                onChange={(event) => setFolderId(event.target.value)}
                className="w-full rounded-xl border border-zinc-300 bg-zinc-50 px-3 py-2.5 text-sm text-zinc-900 outline-none focus:border-teal-500 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
              >
                <option value="">Root Grid</option>
                {folderOptions.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.label}
                  </option>
                ))}
              </select>
            )}
          </div>

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
