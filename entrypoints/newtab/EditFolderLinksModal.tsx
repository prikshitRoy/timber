import { useState } from "react";

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
    allowFolderDeletion?: boolean;
}

export default function EditFolderLinksModal({
    folderName,
    bookmarkIds,
    bookmarksById,
    onClose,
    onCopySelected,
    onDeleteSelected,
    allowFolderDeletion = true,
}: EditFolderLinksModalProps) {
    const [selected, setSelected] = useState<Set<string>>(new Set());

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

    function handleCopy() {
        const urls = bookmarkIds
            .filter((id) => selected.has(id))
            .map((id) => bookmarksById.get(id)?.url)
            .filter((url): url is string => Boolean(url));

        if (urls.length > 0) onCopySelected(urls);
    }

    function handleDelete() {
        if (selected.size === 0) return;

        const deletingAll = selected.size === bookmarkIds.length;
        let alsoDeleteFolder = false;

        if (allowFolderDeletion && deletingAll) {
            alsoDeleteFolder = window.confirm(
                `This removes all links from "${folderName}". Do you also want to delete the folder itself?`
            );
        } else {
            const confirmed = window.confirm(
                `Delete ${selected.size} selected link${selected.size === 1 ? "" : "s"} from Timber?`
            );
            if (!confirmed) return;
        }

        onDeleteSelected(Array.from(selected), alsoDeleteFolder);
        setSelected(new Set());
    }

    return (
        <div className="sync-review-overlay" onClick={onClose}>
            <div
                className="sync-review-modal"
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
                                const bookmark = bookmarksById.get(id);
                                if (!bookmark) return null;

                                return (
                                    <label className="edit-links-row" key={id}>
                                        <input
                                            type="checkbox"
                                            checked={selected.has(id)}
                                            onChange={() => toggle(id)}
                                        />
                                        <span className="edit-links-title">{bookmark.title}</span>
                                    </label>
                                );
                            })}
                        </section>
                    </>
                )}

                <footer className="timber-folder-modal-footer">
                    <button type="button" onClick={onClose}>
                        Close
                    </button>

                    <div className="edit-links-actions">
                        <button
                            type="button"
                            disabled={selected.size === 0}
                            onClick={handleCopy}
                        >
                            Copy selected
                        </button>

                        <button
                            type="button"
                            className="delete-button"
                            disabled={selected.size === 0}
                            onClick={handleDelete}
                        >
                            Delete selected
                        </button>
                    </div>
                </footer>
            </div>
        </div>
    );
}
