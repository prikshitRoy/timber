/**
 * LocalStorage persistence adapter for the user's preferred default browser package on Android.
 */

// Storage key for persisting the user-selected default browser package (null = mobile default).
const MOBILE_DEFAULT_BROWSER_KEY = "timber.mobile.defaultBrowser.v1";

/**
 * Load the persisted default browser package name, or null to follow the mobile's system default.
 */
export function loadPreferredBrowserPackage(): string | null {
    if (typeof window === "undefined") return null;

    try {
        const value = window.localStorage.getItem(MOBILE_DEFAULT_BROWSER_KEY);
        const trimmed = value?.trim() ?? "";
        return trimmed.length > 0 ? trimmed : null;
    } catch {
        return null;
    }
}

/**
 * Save the user's preferred default browser package, or clear it to follow the mobile's system default.
 */
export function savePreferredBrowserPackage(packageName: string | null): void {
    if (typeof window === "undefined") return;

    try {
        const trimmed = packageName?.trim() ?? "";
        if (!trimmed) {
            window.localStorage.removeItem(MOBILE_DEFAULT_BROWSER_KEY);
        } else {
            window.localStorage.setItem(MOBILE_DEFAULT_BROWSER_KEY, trimmed);
        }
    } catch {
        // Ignore storage quota or WebView privacy restrictions.
    }
}
