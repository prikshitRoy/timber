/**
 * Pure validation, default-browser resolution, and label helpers for mobile browser selection.
 */

import type { InstalledBrowser } from "./types.ts";

// Fallback label when no preferred or system default browser can be determined.
export const FALLBACK_DEFAULT_BROWSER_LABEL = "Default";

/**
 * Validate, deduplicate, and sort an untrusted browser list returned from the Android bridge.
 */
export function sanitizeInstalledBrowsers(raw: unknown): InstalledBrowser[] {
    if (!Array.isArray(raw)) return [];

    const seenPackages = new Set<string>();
    const sanitized: InstalledBrowser[] = [];

    for (const item of raw) {
        if (typeof item !== "object" || item === null) continue;

        const record = item as Record<string, unknown>;
        const packageName =
            typeof record.packageName === "string" ? record.packageName.trim() : "";
        if (!packageName || seenPackages.has(packageName)) continue;

        seenPackages.add(packageName);

        const rawLabel =
            typeof record.label === "string" ? record.label.trim() : "";
        sanitized.push({
            packageName,
            label: rawLabel || packageName,
            isSystemDefault: record.isSystemDefault === true,
        });
    }

    return sanitized.sort((a, b) => {
        if (a.isSystemDefault !== b.isSystemDefault) {
            return a.isSystemDefault ? -1 : 1;
        }
        return a.label.localeCompare(b.label, undefined, { sensitivity: "base" });
    });
}

/**
 * Resolve which browser should handle default-open clicks:
 * the user's saved preference if still installed, otherwise the mobile's system default browser.
 */
export function resolveEffectiveDefaultBrowser(
    browsers: InstalledBrowser[],
    preferredPackage: string | null
): InstalledBrowser | null {
    if (preferredPackage) {
        const preferred = browsers.find(
            (browser) => browser.packageName === preferredPackage
        );
        if (preferred) return preferred;
    }

    return browsers.find((browser) => browser.isSystemDefault) ?? null;
}

/**
 * Return the concise display label shown on the Default Browser action button.
 */
export function getDefaultBrowserButtonLabel(
    effectiveBrowser: InstalledBrowser | null
): string {
    return effectiveBrowser ? effectiveBrowser.label : FALLBACK_DEFAULT_BROWSER_LABEL;
}
