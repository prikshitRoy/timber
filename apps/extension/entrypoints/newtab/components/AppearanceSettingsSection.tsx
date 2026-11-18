/**
 * Settings section for choosing the dashboard theme (System, Light, Dark)
 * and uploading, linking, or removing a custom New Tab background image.
 */

import { useRef, useState } from "react";
import type { ThemeMode } from "@timber/core";

interface AppearanceSettingsSectionProps {
  themeMode: ThemeMode;
  backgroundImage: string | null;
  onSetThemeMode: (mode: ThemeMode) => void;
  onSetBackgroundImageFile: (file: File) => Promise<void>;
  onSetBackgroundImageUrl: (url: string) => Promise<void>;
  onClearBackgroundImage: () => Promise<void>;
}

const THEME_OPTIONS: { value: ThemeMode; label: string }[] = [
  { value: "system", label: "System Default" },
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
];

/**
 * Render the Theme and Background Image controls inside SettingsModal.
 */
export default function AppearanceSettingsSection({
  themeMode,
  backgroundImage,
  onSetThemeMode,
  onSetBackgroundImageFile,
  onSetBackgroundImageUrl,
  onClearBackgroundImage,
}: AppearanceSettingsSectionProps) {
  const [imageUrlInput, setImageUrlInput] = useState("");
  const bgFileInputRef = useRef<HTMLInputElement>(null);

  /**
   * Handle a local background image file chosen from the user's computer.
   */
  async function handleBgFileChange(
    event: React.ChangeEvent<HTMLInputElement>
  ) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (file) {
      await onSetBackgroundImageFile(file);
    }
  }

  /**
   * Apply a pasted image URL as the New Tab background.
   */
  async function handleApplyUrl() {
    if (!imageUrlInput.trim()) return;
    await onSetBackgroundImageUrl(imageUrlInput.trim());
    setImageUrlInput("");
  }

  return (
    <section className="settings-section">
      <h3>Appearance</h3>
      <p>Choose your color theme or set a custom background image for the tab.</p>

      <div className="theme-selector" role="radiogroup" aria-label="Theme">
        {THEME_OPTIONS.map((option) => (
          <button
            key={option.value}
            type="button"
            className={`theme-option-btn ${themeMode === option.value ? "theme-option-btn--active" : ""
              }`}
            onClick={() => onSetThemeMode(option.value)}
          >
            {option.label}
          </button>
        ))}
      </div>

      <div className="background-settings">
        <span className="background-settings-label">Background image</span>

        <div className="settings-row">
          <button
            type="button"
            onClick={() => bgFileInputRef.current?.click()}
          >
            Upload image…
          </button>

          {backgroundImage && (
            <button
              type="button"
              className="delete-button"
              onClick={() => void onClearBackgroundImage()}
            >
              Remove background
            </button>
          )}

          <input
            ref={bgFileInputRef}
            type="file"
            accept="image/*"
            hidden
            onChange={handleBgFileChange}
          />
        </div>

        <div className="background-url-row">
          <input
            type="url"
            className="background-url-input"
            placeholder="Or paste image URL (https://...)"
            value={imageUrlInput}
            onChange={(event) => setImageUrlInput(event.target.value)}
          />
          <button
            type="button"
            disabled={!imageUrlInput.trim()}
            onClick={() => void handleApplyUrl()}
          >
            Apply URL
          </button>
        </div>
      </div>
    </section>
  );
}
