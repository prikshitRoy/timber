/**
 * Bottom status bar for the New Tab dashboard displaying status text, errors,
 * the Edit mode toggle, and the Settings button.
 */

interface DashboardFooterProps {
  status: string;
  error: string;
  editMode: boolean;
  onToggleEditMode: () => void;
  onOpenSettings: () => void;
}

/**
 * Render the dashboard status message, error banner, and footer action buttons.
 */
export default function DashboardFooter({
  status,
  error,
  editMode,
  onToggleEditMode,
  onOpenSettings,
}: DashboardFooterProps) {
  return (
    <div className="dashboard-status">
      <span>{status}</span>

      {error && <span className="error-message">{error}</span>}

      <div className="dashboard-footer-actions">
        <button
          type="button"
          className={editMode ? "edit-active" : ""}
          onClick={onToggleEditMode}
        >
          {editMode ? "Done Editing" : "Edit"}
        </button>

        <button type="button" onClick={onOpenSettings}>
          Settings
        </button>
      </div>
    </div>
  );
}
