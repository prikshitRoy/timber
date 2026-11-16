/**
 * Top header bar for the New Tab dashboard with search input, native change badge,
 * Scan button, and quick creation buttons for links and folders.
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
 * Render the dashboard search bar and primary header action buttons.
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
      <input
        type="search"
        className="dashboard-search"
        placeholder="Search bookmarks..."
        value={query}
        onChange={(event) => onQueryChange(event.target.value)}
      />

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
