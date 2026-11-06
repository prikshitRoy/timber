interface SettingsModalProps {
    connected: boolean;
    loading: boolean;
    onClose: () => void;
    onConnect: () => void;
}

export default function SettingsModal({
    connected,
    loading,
    onClose,
    onConnect,
}: SettingsModalProps) {
    return (
        <div className="sync-review-overlay" onClick={onClose}>
            <div className="sync-review-modal" onClick={(event) => event.stopPropagation()}>
                <h2>Settings</h2>

                <section>
                    <h3>Browser bookmarks</h3>
                    <p>
                        {connected
                            ? "Timber has access to this browser's bookmarks."
                            : "Timber doesn't have access to this browser's bookmarks yet."}
                    </p>

                    {!connected && (
                        <button type="button" disabled={loading} onClick={onConnect}>
                            {loading ? "Connecting..." : "Connect Bookmarks"}
                        </button>
                    )}
                </section>

                <footer>
                    <button type="button" onClick={onClose}>Close</button>
                </footer>
            </div>
        </div>
    );
}
