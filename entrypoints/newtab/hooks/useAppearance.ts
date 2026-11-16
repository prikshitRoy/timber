/**
 * React hook for managing the New Tab theme ("system", "light", "dark") and custom background image.
 */

import { useEffect, useState } from "react";
import {
  loadAppearanceSettings,
  saveAppearanceSettings,
} from "../../../src/shared/appearance/appearance-storage";
import {
  DEFAULT_APPEARANCE_SETTINGS,
  resolveThemeMode,
  type AppearanceSettings,
  type ResolvedTheme,
  type ThemeMode,
} from "../../../src/shared/appearance/appearance.types";

/**
 * Convert a user-selected image File into a base64 Data URL for local persistence.
 */
function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
      } else {
        reject(new Error("Could not read image file."));
      }
    };
    reader.onerror = () => reject(new Error("Failed to read image file."));
    reader.readAsDataURL(file);
  });
}

/**
 * Manage theme preference, OS color-scheme listener, and background image state.
 */
export function useAppearance(setError: (message: string) => void) {
  const [settings, setSettings] = useState<AppearanceSettings>(
    DEFAULT_APPEARANCE_SETTINGS
  );
  const [systemPrefersDark, setSystemPrefersDark] = useState<boolean>(() =>
    typeof window !== "undefined" && typeof window.matchMedia === "function"
      ? window.matchMedia("(prefers-color-scheme: dark)").matches
      : false
  );

  // Load saved appearance settings from browser.storage.local on mount.
  useEffect(() => {
    let isCancelled = false;

    void loadAppearanceSettings()
      .then((loaded) => {
        if (!isCancelled) {
          setSettings(loaded);
        }
      })
      .catch(() => {
        // Keep defaults if storage read fails.
      });

    return () => {
      isCancelled = true;
    };
  }, []);

  // Subscribe to OS dark-mode changes so "system" mode updates automatically.
  useEffect(() => {
    if (
      typeof window === "undefined" ||
      typeof window.matchMedia !== "function"
    ) {
      return;
    }

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = (event: MediaQueryListEvent) => {
      setSystemPrefersDark(event.matches);
    };

    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, []);

  const resolvedTheme: ResolvedTheme = resolveThemeMode(
    settings.themeMode,
    systemPrefersDark
  );

  // Sync resolved theme and background-image flags to the root <html> element for CSS styling.
  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute("data-theme", resolvedTheme);
    root.setAttribute(
      "data-has-bg",
      settings.backgroundImage ? "true" : "false"
    );
  }, [resolvedTheme, settings.backgroundImage]);

  /**
   * Persist updated appearance settings and update React state.
   */
  async function updateSettings(next: AppearanceSettings) {
    setSettings(next);
    try {
      await saveAppearanceSettings(next);
    } catch {
      setError("Failed to save appearance settings.");
    }
  }

  /**
   * Set the user's preferred theme mode ("system", "light", or "dark").
   */
  async function handleSetThemeMode(themeMode: ThemeMode) {
    await updateSettings({ ...settings, themeMode });
  }

  /**
   * Read an uploaded image file and set it as the New Tab background image.
   */
  async function handleSetBackgroundImageFile(file: File) {
    try {
      setError("");
      const dataUrl = await readFileAsDataUrl(file);
      await updateSettings({ ...settings, backgroundImage: dataUrl });
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Failed to set background image."
      );
    }
  }

  /**
   * Set an external or data URL as the New Tab background image.
   */
  async function handleSetBackgroundImageUrl(url: string) {
    const trimmed = url.trim();
    if (!trimmed) return;
    await updateSettings({ ...settings, backgroundImage: trimmed });
  }

  /**
   * Remove the custom background image and restore the solid theme background.
   */
  async function handleClearBackgroundImage() {
    await updateSettings({ ...settings, backgroundImage: null });
  }

  return {
    themeMode: settings.themeMode,
    resolvedTheme,
    backgroundImage: settings.backgroundImage,
    onSetThemeMode: handleSetThemeMode,
    onSetBackgroundImageFile: handleSetBackgroundImageFile,
    onSetBackgroundImageUrl: handleSetBackgroundImageUrl,
    onClearBackgroundImage: handleClearBackgroundImage,
  };
}
