import { useEffect, useState } from "react";
import KebabMenu from "./KebabMenu";

interface FolderBookmark {
    title: string;
    url: string;
}

interface EditFolderLinksModalProps {
    folderName: string;
    bookmarkIds: string[];
    bookmarksById: Map<string, FolderBookmark>;
    onClose: () => void;
    onCopySelected: (urls: string[]) => void;
    onDeleteSelected: (bookmarkIds: string[], alsoDeleteFolder: boolean) => void;
    onSaveEdits: (updates: { id: string; title: string; url: string }[]) => void;
    allowFolderDeletion?: boolean;
}

interface LinkEdit {
    title: string;
    url: string;
}

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

    // Re-sync when links are added/removed (e.g. after a delete),
    // preserving any edits still in progress for links that remain.
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

    function updateField(id: string, field: "title" | "url", value: string) {
        setEdits((current) => {
            const next = new Map(current);
            const existing = next.get(id) ?? { title: "", url: "" };
            next.set(id, { ...existing, [field]: value });
            return next;
        });
    }

    function toggle(id: string) {
        setSelected((current) => {
            const next = new Set(current);
            next.has(id) ? next.delete(id) : next.add(id);
            return next;
        });
    }

    function toggleAll() {
        setSelected((current) =>
            current.size === bookmarkIds.length ? new Set() : new Set(bookmarkIds)
        );
    }

    function confirmAndDelete(ids: string[]) {
        if (ids.length === 0) return;

        const deletingAll = ids.length === bookmarkIds.length;
        let alsoDeleteFolder = false;

        if (allowFolderDeletion && deletingAll) {
            alsoDeleteFolder = window.confirm(
                `This removes all links from "${folderName}". Do you also want to delete the folder itself?`
            );
        } else {
            const confirmed = window.confirm(
                `Delete ${ids.length} selected link${ids.length === 1 ? "" : "s"} from Timber?`
            );
            if (!confirmed) return;
        }

        onDeleteSelected(ids, alsoDeleteFolder);

        setSelected((current) => {
            const next = new Set(current);
            for (const id of ids) next.delete(id);
            return next;
        });
    }

    function handleCopySelected() {
        const urls = Array.from(selected)
            .map((id) => edits.get(id)?.url)
            .filter((url): url is string => Boolean(url && url.trim()));

        if (urls.length > 0) onCopySelected(urls);
    }

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
                                    <div className="edit-link-card" key={id}>
                                        <div className="edit-link-row-top">
                                            <input
                                                type="checkbox"
                                                checked={selected.has(id)}
                                                onChange={() => toggle(id)}
                                            />

                                            <input
                                                type="text"
                                                className="edit-link-title-input"
                                                value={edit.title}
                                                onChange={(event) =>
                                                    updateField(id, "title", event.target.value)
                                                }
                                            />
                                        </div>

                                        <div className="edit-link-row-bottom">
                                            <span className="edit-link-url-label">URL:</span>

                                            <input
                                                type="text"
                                                className="edit-link-url-input"
                                                value={edit.url}
                                                onChange={(event) =>
                                                    updateField(id, "url", event.target.value)
                                                }
                                            />

                                            <KebabMenu
                                                actions={[
                                                    {
                                                        label: "Copy",
                                                        onClick: () =>
                                                            edit.url.trim() && onCopySelected([edit.url.trim()]),
                                                    },
                                                    {
                                                        label: "Delete",
                                                        danger: true,
                                                        onClick: () => confirmAndDelete([id]),
                                                    },
                                                ]}
                                            />
                                        </div>
                                    </div>
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
