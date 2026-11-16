/**
 * Types, defaults, and pure validation/resolution helpers for Timber theme and background image settings.
 */

// User-selectable theme preference ("system" follows the OS prefers-color-scheme media query).
export type ThemeMode = "system" | "light" | "dark";

// Concrete visual theme applied to the document root.
export type ResolvedTheme = "light" | "dark";

// Persisted appearance configuration for the New Tab dashboard.
export interface AppearanceSettings {
  themeMode: ThemeMode;
  backgroundImage: string | null;
}

const VALID_THEME_MODES: readonly ThemeMode[] = ["system", "light", "dark"];

// Default appearance settings used on a fresh install ("system" theme, no custom background image).
export const DEFAULT_APPEARANCE_SETTINGS: AppearanceSettings = {
  themeMode: "system",
  backgroundImage: null,
};

/**
 * Resolve a user's `ThemeMode` preference and OS dark-mode state into a concrete "light" or "dark" theme.
 */
export function resolveThemeMode(
  themeMode: ThemeMode,
  systemPrefersDark: boolean
): ResolvedTheme {
  if (themeMode === "system") {
    return systemPrefersDark ? "dark" : "light";
  }
  return themeMode;
}

/**
 * Validate and sanitize an untrusted storage payload into a well-formed `AppearanceSettings` object.
 */
export function sanitizeAppearanceSettings(raw: unknown): AppearanceSettings {
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
    return { ...DEFAULT_APPEARANCE_SETTINGS };
  }

  const record = raw as Record<string, unknown>;
  const themeMode =
    VALID_THEME_MODES.find((candidate) => candidate === record.themeMode) ??
    DEFAULT_APPEARANCE_SETTINGS.themeMode;

  const backgroundImage =
    typeof record.backgroundImage === "string" &&
    record.backgroundImage.trim().length > 0
      ? record.backgroundImage.trim()
      : null;

  return {
    themeMode,
    backgroundImage,
  };
}
