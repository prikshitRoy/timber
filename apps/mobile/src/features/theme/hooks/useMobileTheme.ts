/**
 * React hook managing the mobile app's System / Light / Dark theme preference
 * and syncing the "dark" class on document.documentElement.
 */

import { useCallback, useEffect, useState } from "react";
import {
  loadMobileThemeMode,
  resolveEffectiveTheme,
  saveMobileThemeMode,
  type MobileThemeMode,
} from "../storage/theme-storage";

/**
 * Apply the resolved light/dark theme class and color-scheme to the document root.
 */
function applyDocumentTheme(mode: MobileThemeMode): void {
  if (typeof window === "undefined") return;

  const prefersDark = window.matchMedia(
    "(prefers-color-scheme: dark)"
  ).matches;
  const resolved = resolveEffectiveTheme(mode, prefersDark);
  const root = document.documentElement;

  root.classList.toggle("dark", resolved === "dark");
  root.style.colorScheme = resolved;
}

/**
 * Provide persisted theme mode state and live OS appearance synchronization.
 */
export function useMobileTheme() {
  const [themeMode, setThemeModeState] = useState<MobileThemeMode>("system");

  useEffect(() => {
    const initialMode = loadMobileThemeMode();
    setThemeModeState(initialMode);
    applyDocumentTheme(initialMode);
  }, []);

  useEffect(() => {
    applyDocumentTheme(themeMode);

    if (themeMode !== "system" || typeof window === "undefined") return;

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleSystemThemeChange = () => applyDocumentTheme("system");

    mediaQuery.addEventListener("change", handleSystemThemeChange);
    return () => {
      mediaQuery.removeEventListener("change", handleSystemThemeChange);
    };
  }, [themeMode]);

  const setThemeMode = useCallback((nextMode: MobileThemeMode) => {
    setThemeModeState(nextMode);
    saveMobileThemeMode(nextMode);
    applyDocumentTheme(nextMode);
  }, []);

  return {
    themeMode,
    setThemeMode,
  };
}
