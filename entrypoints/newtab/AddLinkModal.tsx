import { useState } from "react";

interface AddLinkModalProps {
    targetFolderName?: string;
    onClose: () => void;
    onCreate: (url: string, title: string) => void;
}

export default function AddLinkModal({ targetFolderName, onClose, onCreate }: AddLinkModalProps) {
    const [url, setUrl] = useState("");
    const [title, setTitle] = useState("");
    const [error, setError] = useState("");

    function handleSubmit(event: React.FormEvent) {
        event.preventDefault();

        if (!url.trim()) {
            setError("URL is required.");
            return;
        }

        onCreate(url.trim(), title.trim() || url.trim());
    }

    return (
        <div className="sync-review-overlay" onClick={onClose}>
            <form
                className="sync-review-modal"
                onClick={(event) => event.stopPropagation()}
                onSubmit={handleSubmit}
            >
                <h2>{targetFolderName ? `Add a link to ${targetFolderName}` : "Add a link"}</h2>

                <label className="add-link-field">
                    URL
                    <input
                        type="url"
                        autoFocus
                        placeholder="https://example.com"
                        value={url}
                        onChange={(event) => setUrl(event.target.value)}
                    />
                </label>

                <label className="add-link-field">
                    Title (optional)
                    <input
                        type="text"
                        placeholder="Example"
                        value={title}
                        onChange={(event) => setTitle(event.target.value)}
                    />
                </label>

                {error && <p className="error-message">{error}</p>}

                <footer>
                    <button type="button" onClick={onClose}>Cancel</button>
                    <button type="submit">Add link</button>
                </footer>
            </form>
        </div>
    );
}
