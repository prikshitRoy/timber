/**
 * Side-effect service communicating with MainActivity's BrowserBridge
 * and falling back to Tauri's opener plugin when running outside Android.
 */

import { isSupportedBookmarkUrl } from "@timber/core";
import { openUrl } from "@tauri-apps/plugin-opener";
import { sanitizeInstalledBrowsers } from "../browser-resolver";
import type { AndroidBrowserBridge, InstalledBrowser } from "../types";

declare global {
    interface Window {
        TimberAndroidBrowser?: AndroidBrowserBridge;
    }
}

/**
 * Return true when running inside the Android WebView with the native browser bridge available.
 */
export function isAndroidBrowserBridgeAvailable(): boolean {
    return (
        typeof window !== "undefined" &&
        typeof window.TimberAndroidBrowser?.getInstalledBrowsers === "function" &&
        typeof window.TimberAndroidBrowser?.openUrlInBrowser === "function"
    );
}

/**
 * Query Android for all installed browsers capable of opening http(s) links.
 */
export function fetchInstalledBrowsers(): InstalledBrowser[] {
    if (!isAndroidBrowserBridgeAvailable()) return [];

    try {
        const rawJson = window.TimberAndroidBrowser?.getInstalledBrowsers();
        if (!rawJson) return [];
        return sanitizeInstalledBrowsers(JSON.parse(rawJson));
    } catch {
        return [];
    }
}

/**
 * Fallback launcher using Tauri's opener plugin or window.open for system default handling.
 */
async function openWithSystemFallback(url: string): Promise<void> {
    try {
        await openUrl(url);
    } catch {
        if (typeof window !== "undefined") {
            window.open(url, "_blank", "noopener,noreferrer");
        }
    }
}

/**
 * Open a validated http(s) URL in a specific Android browser package, or in the system default when null.
 */
export async function launchUrlInBrowser(
    url: string,
    packageName: string | null,
    options: { allowSystemFallback?: boolean } = {}
): Promise<void> {
    if (!isSupportedBookmarkUrl(url)) {
        throw new Error("Only http:// and https:// bookmark links can be opened.");
    }

    const trimmedPackage = packageName?.trim() ?? "";

    if (trimmedPackage && isAndroidBrowserBridgeAvailable()) {
        const launched = window.TimberAndroidBrowser?.openUrlInBrowser(
            url,
            trimmedPackage
        );
        if (launched) return;

        if (!options.allowSystemFallback) {
            throw new Error(
                "Could not open link in the selected browser. It may have been uninstalled."
            );
        }
    }

    await openWithSystemFallback(url);
}
