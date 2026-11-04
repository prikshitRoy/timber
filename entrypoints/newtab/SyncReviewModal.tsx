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
        () => new Set([
            ...diff.additions.map((item) => item.native.nativeBookmarkId),
            ...diff.updates.map((item) => item.native.nativeBookmarkId),
        ])
    );

    const [confirmedRemovals, setConfirmedRemovals] = useState<Set<string>>(new Set());

    function toggleAccepted(nativeId: string) {
        setAccepted((current) => {
            const next = new Set(current);
            next.has(nativeId) ? next.delete(nativeId) : next.add(nativeId);
            return next;
        });
    }

    function toggleRemoval(bookmarkSourceId: string) {
        setConfirmedRemovals((current) => {
            const next = new Set(current);
            next.has(bookmarkSourceId)
                ? next.delete(bookmarkSourceId)
                : next.add(bookmarkSourceId);
            return next;
        });
    }

    return (
        <div className="sync-review-overlay">
            <div className="sync-review-modal">
                <h2>Review bookmark changes</h2>

                {diff.additions.length > 0 && (
                    <section>
                        <h3>New bookmarks ({diff.additions.length})</h3>
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
                )}

                {diff.updates.length > 0 && (
                    <section>
                        <h3>Changed bookmarks ({diff.updates.length})</h3>
                        {diff.updates.map((item) => (
                            <label key={item.native.nativeBookmarkId}>
                                <input
                                    type="checkbox"
                                    checked={accepted.has(item.native.nativeBookmarkId)}
                                    onChange={() => toggleAccepted(item.native.nativeBookmarkId)}
                                />
                                {item.previousTitle} → {item.native.title}
                            </label>
                        ))}
                    </section>
                )}

                {diff.removals.length > 0 && (
                    <section>
                        <h3>Removed from browser ({diff.removals.length})</h3>
                        <p>Check one to delete it from Timber too. Leave unchecked to keep it.</p>
                        {diff.removals.map((item) => (
                            <label key={item.bookmarkSourceId}>
                                <input
                                    type="checkbox"
                                    checked={confirmedRemovals.has(item.bookmarkSourceId)}
                                    onChange={() => toggleRemoval(item.bookmarkSourceId)}
                                />
                                {item.title}
                            </label>
                        ))}
                    </section>
                )}

                <footer>
                    <button type="button" onClick={onCancel}>Cancel</button>
                    <button
                        type="button"
                        onClick={() =>
                            onApply({
                                acceptedNativeIds: Array.from(accepted),
                                confirmedRemovalIds: Array.from(confirmedRemovals),
                            })
                        }
                    >
                        Apply changes
                    </button>
                </footer>
            </div>
        </div>
    );
}

export default SyncReviewModal;