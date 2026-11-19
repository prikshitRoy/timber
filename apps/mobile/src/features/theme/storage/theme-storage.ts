/**
 * Theme mode types, pure system-preference resolution, and localStorage persistence
 * for the Android mobile app.
 */

export type MobileThemeMode = "system" | "light" | "dark";
export type ResolvedTheme = "light" | "dark";

const MOBILE_THEME_STORAGE_KEY = "timber.mobile.theme.v1";

/**
 * Validate an unknown stored value into a supported MobileThemeMode.
 */
export function normalizeThemeMode(value: unknown): MobileThemeMode {
  if (value === "light" || value === "dark" || value === "system") {
    return value;
  }
  return "system";
}

/**
 * Resolve the effective light/dark palette from the selected mode and OS preference.
 */
export function resolveEffectiveTheme(
  mode: MobileThemeMode,
  systemPrefersDark: boolean
): ResolvedTheme {
  if (mode === "system") {
    return systemPrefersDark ? "dark" : "light";
  }
  return mode;
}

/**
 * Load the persisted theme mode from localStorage, defaulting to "system".
 */
export function loadMobileThemeMode(): MobileThemeMode {
  if (typeof window === "undefined") return "system";

  try {
    return normalizeThemeMode(
      window.localStorage.getItem(MOBILE_THEME_STORAGE_KEY)
    );
  } catch {
    return "system";
  }
}

/**
 * Persist the selected theme mode to localStorage.
 */
export function saveMobileThemeMode(mode: MobileThemeMode): void {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(MOBILE_THEME_STORAGE_KEY, mode);
  } catch {
    // Ignore storage quota or WebView privacy restrictions.
  }
}
