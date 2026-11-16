/**
 * Modal dialog for bulk-editing titles/URLs, copying selected links, and deleting links inside a folder.
 */

import { useEffect, useState } from "react";
import EditLinkCard, { type LinkEdit } from "./components/EditLinkCard";
import type { BookmarkSummary } from "./types";

interface EditFolderLinksModalProps {
  folderName: string;
  bookmarkIds: string[];
  bookmarksById: Map<string, BookmarkSummary>;
  onClose: () => void;
  onCopySelected: (urls: string[]) => void;
  onDeleteSelected: (bookmarkIds: string[], alsoDeleteFolder: boolean) => void;
  onSaveEdits: (updates: { id: string; title: string; url: string }[]) => void;
  allowFolderDeletion?: boolean;
}

/**
 * Render the bulk link editor modal for a specific Timber folder.
 */
export default function EditFolderLinksModal({
  folderName,
  bookmarkIds,
  bookmarksById,
  onClose,
  onCopySelected,
  onDeleteSelected,
  onSaveEdits,
  allowFolderDeletion = true,
}: EditFolderLinksModalProps) {
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const [edits, setEdits] = useState<Map<string, LinkEdit>>(
    () =>
      new Map(
        bookmarkIds.map((id) => [
          id,
          {
            title: bookmarksById.get(id)?.title ?? "",
            url: bookmarksById.get(id)?.url ?? "",
          },
        ])
      )
  );

  // Re-sync when links are added or removed, preserving in-progress edits for remaining links.
  useEffect(() => {
    setEdits((current) => {
      const next = new Map<string, LinkEdit>();
      for (const id of bookmarkIds) {
        next.set(
          id,
          current.get(id) ?? {
            title: bookmarksById.get(id)?.title ?? "",
            url: bookmarksById.get(id)?.url ?? "",
          }
        );
      }
      return next;
    });

    setSelected((current) => {
      const next = new Set<string>();
      for (const id of bookmarkIds) {
        if (current.has(id)) next.add(id);
      }
      return next;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bookmarkIds.join(",")]);

  /**
   * Update the staged title or URL for a single bookmark ID.
   */
  function updateField(id: string, field: "title" | "url", value: string) {
    setEdits((current) => {
      const next = new Map(current);
      const existing = next.get(id) ?? { title: "", url: "" };
      next.set(id, { ...existing, [field]: value });
      return next;
    });
  }

  /**
   * Toggle selection state for a single bookmark ID.
   */
  function toggle(id: string) {
    setSelected((current) => {
      const next = new Set(current);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  /**
   * Select all links in the folder, or clear selection if all are already selected.
   */
  function toggleAll() {
    setSelected((current) =>
      current.size === bookmarkIds.length ? new Set() : new Set(bookmarkIds)
    );
  }

  /**
   * Prompt for confirmation and delete the specified bookmark IDs (and optionally the folder itself).
   */
  function confirmAndDelete(ids: string[]) {
    if (ids.length === 0) return;

    const isDeletingAll = ids.length === bookmarkIds.length;
    let alsoDeleteFolder = false;

    if (allowFolderDeletion && isDeletingAll) {
      alsoDeleteFolder = window.confirm(
        `This removes all links from "${folderName}". Do you also want to delete the folder itself?`
      );
    } else {
      const isConfirmed = window.confirm(
        `Delete ${ids.length} selected link${ids.length === 1 ? "" : "s"} from Timber?`
      );
      if (!isConfirmed) return;
    }

    onDeleteSelected(ids, alsoDeleteFolder);

    setSelected((current) => {
      const next = new Set(current);
      for (const id of ids) next.delete(id);
      return next;
    });
  }

  /**
   * Copy the URLs of all currently checked bookmarks.
   */
  function handleCopySelected() {
    const urls = Array.from(selected)
      .map((id) => edits.get(id)?.url)
      .filter((url): url is string => Boolean(url && url.trim()));

    if (urls.length > 0) onCopySelected(urls);
  }

  /**
   * Commit all non-empty title/URL edits to the repository.
   */
  function handleSave() {
    const updates = Array.from(edits.entries())
      .filter(([, edit]) => edit.url.trim())
      .map(([id, edit]) => ({
        id,
        title: edit.title.trim() || edit.url.trim(),
        url: edit.url.trim(),
      }));

    if (updates.length > 0) onSaveEdits(updates);
  }

  return (
    <div className="sync-review-overlay" onClick={onClose}>
      <div
        className="sync-review-modal edit-links-modal"
        onClick={(event) => event.stopPropagation()}
      >
        <h2>Edit links — {folderName}</h2>

        {bookmarkIds.length === 0 ? (
          <p className="timber-folder-empty">No links in this folder.</p>
        ) : (
          <>
            <label className="edit-links-select-all">
              <input
                type="checkbox"
                checked={selected.size === bookmarkIds.length}
                onChange={toggleAll}
              />
              Select all
            </label>

            <section>
              {bookmarkIds.map((id) => {
                const edit = edits.get(id);
                if (!edit) return null;

                return (
                  <EditLinkCard
                    key={id}
                    bookmarkId={id}
                    edit={edit}
                    isSelected={selected.has(id)}
                    onToggleSelect={toggle}
                    onUpdateField={updateField}
                    onCopySingle={(url) => onCopySelected([url])}
                    onDeleteSingle={(bookmarkId) =>
                      confirmAndDelete([bookmarkId])
                    }
                  />
                );
              })}
            </section>
          </>
        )}

        <footer className="edit-links-footer">
          <button
            type="button"
            disabled={selected.size === 0}
            onClick={handleCopySelected}
          >
            Copy Selected
          </button>

          <button
            type="button"
            className="delete-button"
            disabled={selected.size === 0}
            onClick={() => confirmAndDelete(Array.from(selected))}
          >
            Delete selected
          </button>

          <button type="button" className="save-button" onClick={handleSave}>
            Save
          </button>

          <button type="button" onClick={onClose}>
            Close
          </button>
        </footer>
      </div>
    </div>
  );
}
