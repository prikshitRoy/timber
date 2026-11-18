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
    <footer className="dashboard-status">
      <div className="dashboard-status-info">
        <span className="dashboard-status-pill">{status}</span>
        {error && <span className="error-message">{error}</span>}
      </div>

      <div className="dashboard-footer-actions">
        <button
          type="button"
          className={editMode ? "edit-active" : ""}
          onClick={onToggleEditMode}
        >
          {editMode ? "Done Editing" : "Edit Layout"}
        </button>

        <button type="button" onClick={onOpenSettings}>
          Settings
        </button>
      </div>
    </footer>
  );
}
