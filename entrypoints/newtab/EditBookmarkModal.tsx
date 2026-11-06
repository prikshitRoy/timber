import { useState } from "react";

interface EditBookmarkModalProps {
    bookmarkId: string;
    initialTitle: string;
    initialUrl: string;
    onClose: () => void;
    onSave: (bookmarkId: string, title: string, url: string) => void;
}

export default function EditBookmarkModal({
    bookmarkId,
    initialTitle,
    initialUrl,
    onClose,
    onSave,
}: EditBookmarkModalProps) {
    const [title, setTitle] = useState(initialTitle);
    const [url, setUrl] = useState(initialUrl);
    const [error, setError] = useState("");

    function handleSubmit(event: React.FormEvent) {
        event.preventDefault();

        if (!url.trim()) {
            setError("URL is required.");
            return;
        }

        onSave(bookmarkId, title.trim() || url.trim(), url.trim());
    }

    return (
        <div className="sync-review-overlay" onClick={onClose}>
            <form
                className="sync-review-modal"
                onClick={(event) => event.stopPropagation()}
                onSubmit={handleSubmit}
            >
                <h2>Edit link</h2>

                <label className="add-link-field">
                    Title
                    <input
                        type="text"
                        autoFocus
                        value={title}
                        onChange={(event) => setTitle(event.target.value)}
                    />
                </label>

                <label className="add-link-field">
                    URL
                    <input
                        type="url"
                        value={url}
                        onChange={(event) => setUrl(event.target.value)}
                    />
                </label>

                {error && <p className="error-message">{error}</p>}

                <footer>
                    <button type="button" onClick={onClose}>Cancel</button>
                    <button type="submit">Save</button>
                </footer>
            </form>
        </div>
    );
}
