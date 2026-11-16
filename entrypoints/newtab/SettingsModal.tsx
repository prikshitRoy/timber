/**
 * Settings modal for managing appearance (theme & background image), browser bookmark permission,
 * and exporting/importing Timber backups.
 */

import { useRef, useState } from "react";
import type { ThemeMode } from "../../src/shared/appearance/appearance.types";
import AppearanceSettingsSection from "./components/AppearanceSettingsSection";

type ImportMode = "merge" | "replace";

interface SettingsModalProps {
  connected: boolean;
  loading: boolean;
  themeMode: ThemeMode;
  backgroundImage: string | null;
  onClose: () => void;
  onConnect: () => void;
  onSetThemeMode: (mode: ThemeMode) => void;
  onSetBackgroundImageFile: (file: File) => Promise<void>;
  onSetBackgroundImageUrl: (url: string) => Promise<void>;
  onClearBackgroundImage: () => Promise<void>;
  onExportBackup: () => void;
  onExportHtml: () => void;
  onImportBackup: (file: File, mode: ImportMode) => Promise<void>;
}

/**
 * Render the Settings modal with appearance controls, connection status, and backup export/import.
 */
export default function SettingsModal({
  connected,
  loading,
  themeMode,
  backgroundImage,
  onClose,
  onConnect,
  onSetThemeMode,
  onSetBackgroundImageFile,
  onSetBackgroundImageUrl,
  onClearBackgroundImage,
  onExportBackup,
  onExportHtml,
  onImportBackup,
}: SettingsModalProps) {
  const [importMode, setImportMode] = useState<ImportMode>("merge");
  const fileInputRef = useRef<HTMLInputElement>(null);

  /**
   * Handle a JSON backup file chosen from disk and pass it to the active import handler.
   */
  async function handleFileChosen(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    // Reset so choosing the same file twice still fires onChange.
    event.target.value = "";

    if (file) {
      await onImportBackup(file, importMode);
    }
  }

  return (
    <div className="sync-review-overlay" onClick={onClose}>
      <div
        className="sync-review-modal settings-modal"
        onClick={(event) => event.stopPropagation()}
      >
        <h2>Settings</h2>

        <AppearanceSettingsSection
          themeMode={themeMode}
          backgroundImage={backgroundImage}
          onSetThemeMode={onSetThemeMode}
          onSetBackgroundImageFile={onSetBackgroundImageFile}
          onSetBackgroundImageUrl={onSetBackgroundImageUrl}
          onClearBackgroundImage={onClearBackgroundImage}
        />

        <section className="settings-section">
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

        <section className="settings-section">
          <h3>Backup</h3>
          <p>
            Timber's data lives only in this browser. Export a backup now and
            then, or use the bookmarks file to move to another browser.
          </p>

          <div className="settings-row">
            <button type="button" onClick={onExportBackup}>
              Export backup (.json)
            </button>
            <button type="button" onClick={onExportHtml}>
              Export as bookmarks (.html)
            </button>
          </div>

          <div className="settings-import">
            <label className="settings-radio">
              <input
                type="radio"
                name="import-mode"
                checked={importMode === "merge"}
                onChange={() => setImportMode("merge")}
              />
              Merge into what I have
            </label>

            <label className="settings-radio">
              <input
                type="radio"
                name="import-mode"
                checked={importMode === "replace"}
                onChange={() => setImportMode("replace")}
              />
              Replace everything
            </label>

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
            >
              Import backup…
            </button>

            <input
              ref={fileInputRef}
              type="file"
              accept="application/json,.json"
              hidden
              onChange={handleFileChosen}
            />
          </div>
        </section>

        <footer>
          <button type="button" onClick={onClose}>
            Close
          </button>
        </footer>
      </div>
    </div>
  );
}
