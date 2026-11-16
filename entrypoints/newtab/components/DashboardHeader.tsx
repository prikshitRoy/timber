/**
 * Top header bar for the New Tab dashboard with brand mark, search input,
 * native change badge, Scan button, and quick creation buttons for links and folders.
 */

interface DashboardHeaderProps {
  query: string;
  onQueryChange: (query: string) => void;
  connected: boolean;
  nativeChanged: boolean;
  loading: boolean;
  onScan: () => void;
  onAddRootLink: () => void;
  onCreateFolder: () => void;
}

/**
 * Render the dashboard brand header, search bar, and primary action buttons.
 */
export default function DashboardHeader({
  query,
  onQueryChange,
  connected,
  nativeChanged,
  loading,
  onScan,
  onAddRootLink,
  onCreateFolder,
}: DashboardHeaderProps) {
  return (
    <header className="dashboard-header">
      <div className="dashboard-brand-search">
        <div className="dashboard-brand">
          <span className="dashboard-brand-dot" aria-hidden="true" />
          <span className="dashboard-brand-title">Timber</span>
        </div>

        <input
          type="search"
          className="dashboard-search"
          placeholder="Search bookmarks, folders, or URLs..."
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
        />
      </div>

      <div className="header-actions">
        {connected && nativeChanged && (
          <span className="native-changed-badge">Bookmarks changed</span>
        )}

        {connected && (
          <button onClick={onScan} disabled={loading} type="button">
            {loading ? "Scanning..." : "Scan"}
          </button>
        )}

        <button type="button" onClick={onAddRootLink}>
          + Link
        </button>

        <button type="button" onClick={onCreateFolder}>
          + Folder
        </button>
      </div>
    </header>
  );
}
