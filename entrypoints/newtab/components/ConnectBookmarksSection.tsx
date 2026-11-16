/**
 * Onboarding prompt shown when Timber has neither browser bookmark access nor local catalog data.
 */

interface ConnectBookmarksSectionProps {
  loading: boolean;
  onConnect: () => void;
}

/**
 * Render the initial call-to-action card asking the user to grant bookmark permission.
 */
export default function ConnectBookmarksSection({
  loading,
  onConnect,
}: ConnectBookmarksSectionProps) {
  return (
    <section className="connect-section">
      <h2>Connect your bookmarks</h2>

      <p>
        Allow Timber to read your browser bookmarks and organize them into one
        dashboard.
      </p>

      <button onClick={onConnect} disabled={loading} type="button">
        {loading ? "Connecting..." : "Connect Bookmarks"}
      </button>
    </section>
  );
}
