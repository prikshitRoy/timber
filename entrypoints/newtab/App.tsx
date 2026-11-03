
import { useState } from "react";
import { runBookmarkRepositoryTest } from "@/src/shared/bookmarks/bookmark-repository.test";


function App() {
    const [status, setStatus] = useState("Not tested");
    const [loading, setLoading] = useState(false);

    async function handleTest() {
        try {
            setLoading(true);
            setStatus("Running tests...");

            await runBookmarkRepositoryTest();

            setStatus("All tests passed!");
        } catch (error) {
            console.error("Repository test failed:", error);

            setStatus(
                error instanceof Error
                    ? error.message
                    : "Unknown test error"
            );
        } finally {
            setLoading(false);
        }
    }

    return (
        <main className="timber">
            <header>
                <h1>Timber</h1>
                <p>Universal Bookmark Dashboard</p>
            </header>

            <section className="test-section">
                <h2>Development Tools</h2>

                <button
                    type="button"
                    onClick={handleTest}
                    disabled={loading}
                >
                    {loading
                        ? "Running..."
                        : "Test Bookmark Repository"}
                </button>

                <p className="test-status">
                    Status: {status}
                </p>
            </section>

            <footer>
                <span>Timber</span>
                <span>v0.1.0</span>
            </footer>
        </main>
    );
}

export default App;
