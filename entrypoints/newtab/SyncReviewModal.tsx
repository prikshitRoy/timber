/**
 * Modal dialog allowing the user to review and select which newly scanned browser bookmarks to add.
 */

import { useState } from "react";

import type {
    BookmarkSyncDiff,
    BookmarkSyncSelection,
} from "../../src/shared/bookmarks/bookmark.types";
import { stripBrowserContainer } from "../../src/shared/bookmarks/folder-chain";

interface SyncReviewModalProps {
    diff: BookmarkSyncDiff;
    onCancel: () => void;
    onApply: (selection: BookmarkSyncSelection) => void;
}

/**
 * Format the target Timber folder path for display next to a scanned bookmark in the review modal.
 */
function formatTargetFolderLabel(folderPath: string[]): string {
    const stripped = stripBrowserContainer(folderPath)
        .map((segment) => segment.trim())
        .filter(Boolean);
    return stripped.length > 0 ? stripped.join(" / ") : "Root";
}

/**
 * Render a checklist modal of newly discovered native browser bookmarks for user approval.
 */
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
                            <span>
                                {item.native.title}{" "}
                                <small style={{ color: "#888" }}>
                                    ({formatTargetFolderLabel(item.native.folderPath)})
                                </small>
                            </span>
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