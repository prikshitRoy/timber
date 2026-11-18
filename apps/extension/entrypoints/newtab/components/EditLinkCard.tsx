/**
 * Editable bookmark card row inside EditFolderLinksModal with selection checkbox,
 * inline title/URL inputs, and per-link Copy/Delete actions.
 */

import KebabMenu from "../KebabMenu";

export interface LinkEdit {
  title: string;
  url: string;
}

interface EditLinkCardProps {
  bookmarkId: string;
  edit: LinkEdit;
  isSelected: boolean;
  onToggleSelect: (bookmarkId: string) => void;
  onUpdateField: (
    bookmarkId: string,
    field: "title" | "url",
    value: string
  ) => void;
  onCopySingle: (url: string) => void;
  onDeleteSingle: (bookmarkId: string) => void;
}

/**
 * Render an inline-editable bookmark card inside the bulk folder links editor modal.
 */
export default function EditLinkCard({
  bookmarkId,
  edit,
  isSelected,
  onToggleSelect,
  onUpdateField,
  onCopySingle,
  onDeleteSingle,
}: EditLinkCardProps) {
  return (
    <div className="edit-link-card">
      <div className="edit-link-row-top">
        <input
          type="checkbox"
          checked={isSelected}
          onChange={() => onToggleSelect(bookmarkId)}
        />

        <input
          type="text"
          className="edit-link-title-input"
          value={edit.title}
          onChange={(event) =>
            onUpdateField(bookmarkId, "title", event.target.value)
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
            onUpdateField(bookmarkId, "url", event.target.value)
          }
        />

        <KebabMenu
          actions={[
            {
              label: "Copy",
              onClick: () => edit.url.trim() && onCopySingle(edit.url.trim()),
            },
            {
              label: "Delete",
              danger: true,
              onClick: () => onDeleteSingle(bookmarkId),
            },
          ]}
        />
      </div>
    </div>
  );
}
