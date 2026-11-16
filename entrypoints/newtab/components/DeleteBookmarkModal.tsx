/**
 * Confirmation modal shown when the user deletes a bookmark that exists in multiple places,
 * allowing them to delete only the selected instance or delete all duplicates everywhere.
 */

interface DeleteBookmarkModalProps {
  title: string;
  instanceCount: number;
  onDeleteOnlyThisInstance: () => void;
  onDeleteAllDuplicates: () => void;
  onCancel: () => void;
}

/**
 * Render the duplicate-link deletion options dialog ("Delete only this instance" vs "Delete all duplicates").
 */
export default function DeleteBookmarkModal({
  title,
  instanceCount,
  onDeleteOnlyThisInstance,
  onDeleteAllDuplicates,
  onCancel,
}: DeleteBookmarkModalProps) {
  return (
    <div className="sync-review-overlay" onClick={onCancel}>
      <div
        className="sync-review-modal delete-bookmark-modal"
        onClick={(event) => event.stopPropagation()}
      >
        <h2>Delete duplicate link</h2>

        <p className="delete-bookmark-description">
          <strong>"{title}"</strong> exists in {instanceCount} places in Timber.
          What would you like to delete?
        </p>

        <div className="delete-bookmark-options">
          <button
            type="button"
            className="delete-instance-button"
            onClick={onDeleteOnlyThisInstance}
          >
            Delete only this instance
            <span>Remove the selected link without affecting other copies.</span>
          </button>

          <button
            type="button"
            className="delete-all-duplicates-button"
            onClick={onDeleteAllDuplicates}
          >
            Delete all duplicates
            <span>
              Remove every instance of this link across root and all folders.
            </span>
          </button>
        </div>

        <footer>
          <button type="button" onClick={onCancel}>
            Cancel
          </button>
        </footer>
      </div>
    </div>
  );
}
