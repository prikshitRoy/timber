/**
 * Persistence adapter for loading and saving AppearanceSettings in browser.storage.local.
 */

import { browser } from "wxt/browser";
import {
  sanitizeAppearanceSettings,
  type AppearanceSettings,
} from "./appearance.types.ts";

// Storage key used to persist theme and background image settings.
const APPEARANCE_STORAGE_KEY = "timber.appearance.v1";

/**
 * Load the user's saved appearance settings from browser.storage.local, falling back to defaults.
 */
export async function loadAppearanceSettings(): Promise<AppearanceSettings> {
  const result = await browser.storage.local.get(APPEARANCE_STORAGE_KEY);
  return sanitizeAppearanceSettings(result[APPEARANCE_STORAGE_KEY]);
}

/**
 * Save the user's appearance settings to browser.storage.local.
 */
export async function saveAppearanceSettings(
  settings: AppearanceSettings
): Promise<void> {
  await browser.storage.local.set({
    [APPEARANCE_STORAGE_KEY]: settings,
  });
}
