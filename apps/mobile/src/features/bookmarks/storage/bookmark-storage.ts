/**
 * LocalStorage persistence adapter for saving and loading TimberState on Android.
 */

import {
  createBackup,
  parseBackup,
  type TimberState,
} from "@timber/core";

// Storage key matching the Timber v2 schema namespace.
const MOBILE_STORAGE_KEY = "timber.state.v2";

/**
 * Load and validate the persisted TimberState from localStorage, returning null if empty or invalid.
 */
export function loadMobileState(): TimberState | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.localStorage.getItem(MOBILE_STORAGE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as unknown;
    const envelopeJson = JSON.stringify(
      createBackup(parsed as TimberState)
    );

    return parseBackup(envelopeJson).state;
  } catch {
    return null;
  }
}

/**
 * Persist the complete TimberState snapshot to localStorage.
 */
export function saveMobileState(state: TimberState): void {
  if (typeof window === "undefined") return;

  window.localStorage.setItem(MOBILE_STORAGE_KEY, JSON.stringify(state));
}

/**
 * Remove the persisted TimberState from localStorage.
 */
export function clearMobileState(): void {
  if (typeof window === "undefined") return;

  window.localStorage.removeItem(MOBILE_STORAGE_KEY);
}
