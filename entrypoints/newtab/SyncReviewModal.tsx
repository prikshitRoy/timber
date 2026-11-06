import { useState } from "react";

import type {
    BookmarkSyncDiff,
    BookmarkSyncSelection,
} from "../../src/shared/bookmarks/bookmark.types";

interface SyncReviewModalProps {
    diff: BookmarkSyncDiff;
    onCancel: () => void;
    onApply: (selection: BookmarkSyncSelection) => void;
}

function SyncReviewModal({ diff, onCancel, onApply }: SyncReviewModalProps) {
    const [accepted, setAccepted] = useState<Set<string>>(
        () => new Set(diff.additions.map((item) => item.native.nativeBookmarkId))
    );

    function toggleAccepted(nativeId: string) {
        setAccepted((current) => {
            const next = new Set(current);
            next.has(nativeId) ? next.delete(nativeId) : next.add(nativeId);
            return next;
        });
    }

    return (
        <div className="sync-review-overlay">
            <div className="sync-review-modal">
                <h2>New bookmarks found</h2>

                <section>
                    {diff.additions.map((item) => (
                        <label key={item.native.nativeBookmarkId}>
                            <input
                                type="checkbox"
                                checked={accepted.has(item.native.nativeBookmarkId)}
                                onChange={() => toggleAccepted(item.native.nativeBookmarkId)}
                            />
                            {item.native.title}
                        </label>
                    ))}
                </section>

                <footer>
                    <button type="button" onClick={onCancel}>Cancel</button>
                    <button
                        type="button"
                        onClick={() =>
                            onApply({ acceptedNativeIds: Array.from(accepted) })
                        }
                    >
                        Add selected to Timber
                    </button>
                </footer>
            </div>
        </div>
    );
}

export default SyncReviewModal;