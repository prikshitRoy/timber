/**
 * Unit tests for mobile browser list sanitization, default browser resolution, and button labels.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
    FALLBACK_DEFAULT_BROWSER_LABEL,
    getDefaultBrowserButtonLabel,
    resolveEffectiveDefaultBrowser,
    sanitizeInstalledBrowsers,
} from "./browser-resolver.ts";
import type { InstalledBrowser } from "./types.ts";

describe("sanitizeInstalledBrowsers", () => {
    it("returns an empty array when input is not an array", () => {
        // Arrange & Act & Assert
        assert.deepEqual(sanitizeInstalledBrowsers(null), []);
        assert.deepEqual(sanitizeInstalledBrowsers("invalid"), []);
        assert.deepEqual(sanitizeInstalledBrowsers({}), []);
    });

    it("drops invalid entries, deduplicates by packageName, and sorts system default first then alphabetically", () => {
        // Arrange
        const raw = [
            { packageName: "org.mozilla.firefox", label: "Firefox", isSystemDefault: false },
            { packageName: "", label: "Missing Package", isSystemDefault: false },
            null,
            { packageName: "com.brave.browser", label: "Brave", isSystemDefault: false },
            { packageName: "com.android.chrome", label: "Chrome", isSystemDefault: true },
            { packageName: "com.brave.browser", label: "Brave Duplicate", isSystemDefault: false },
            { packageName: "com.duckduckgo.mobile.android", label: "   ", isSystemDefault: false },
        ];

        // Act
        const result = sanitizeInstalledBrowsers(raw);

        // Assert
        assert.deepEqual(result, [
            { packageName: "com.android.chrome", label: "Chrome", isSystemDefault: true },
            { packageName: "com.brave.browser", label: "Brave", isSystemDefault: false },
            {
                packageName: "com.duckduckgo.mobile.android",
                label: "com.duckduckgo.mobile.android",
                isSystemDefault: false,
            },
            { packageName: "org.mozilla.firefox", label: "Firefox", isSystemDefault: false },
        ]);
    });
});

describe("resolveEffectiveDefaultBrowser", () => {
    const browsers: InstalledBrowser[] = [
        { packageName: "com.android.chrome", label: "Chrome", isSystemDefault: true },
        { packageName: "com.brave.browser", label: "Brave", isSystemDefault: false },
    ];

    it("returns the user's preferred browser when it is installed", () => {
        // Arrange & Act
        const resolved = resolveEffectiveDefaultBrowser(browsers, "com.brave.browser");

        // Assert
        assert.equal(resolved?.packageName, "com.brave.browser");
    });

    it("falls back to the system default browser when preferred browser is null", () => {
        // Arrange & Act
        const resolved = resolveEffectiveDefaultBrowser(browsers, null);

        // Assert
        assert.equal(resolved?.packageName, "com.android.chrome");
    });

    it("falls back to the system default browser when the preferred browser was uninstalled", () => {
        // Arrange & Act
        const resolved = resolveEffectiveDefaultBrowser(browsers, "org.mozilla.firefox");

        // Assert
        assert.equal(resolved?.packageName, "com.android.chrome");
    });

    it("returns null when neither a preferred browser nor a system default is present", () => {
        // Arrange
        const noDefaultList: InstalledBrowser[] = [
            { packageName: "com.brave.browser", label: "Brave", isSystemDefault: false },
        ];

        // Act
        const resolved = resolveEffectiveDefaultBrowser(noDefaultList, null);

        // Assert
        assert.equal(resolved, null);
    });
});

describe("getDefaultBrowserButtonLabel", () => {
    it("returns the browser label when resolved and falls back to Default when null", () => {
        // Arrange
        const browser: InstalledBrowser = {
            packageName: "com.brave.browser",
            label: "Brave",
            isSystemDefault: false,
        };

        // Act & Assert
        assert.equal(getDefaultBrowserButtonLabel(browser), "Brave");
        assert.equal(
            getDefaultBrowserButtonLabel(null),
            FALLBACK_DEFAULT_BROWSER_LABEL
        );
    });
});
