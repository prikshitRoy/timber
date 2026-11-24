/**
 * React hook managing installed Android browsers, the user's preferred default browser,
 * and actions for opening URLs in either the default or a chosen browser.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import {
    getDefaultBrowserButtonLabel,
    resolveEffectiveDefaultBrowser,
} from "../browser-resolver";
import {
    fetchInstalledBrowsers,
    isAndroidBrowserBridgeAvailable,
    launchUrlInBrowser,
} from "../services/android-browser-bridge";
import {
    loadPreferredBrowserPackage,
    savePreferredBrowserPackage,
} from "../storage/browser-storage";
import type { InstalledBrowser } from "../types";

/**
 * Provide installed browsers, effective default browser metadata, and URL launch handlers.
 */
export function useMobileBrowsers() {
    const [installedBrowsers, setInstalledBrowsers] = useState<
        InstalledBrowser[]
    >([]);
    const [preferredPackage, setPreferredPackageState] = useState<string | null>(
        null
    );
    const [isBridgeAvailable, setIsBridgeAvailable] = useState(false);

    const refreshInstalledBrowsers = useCallback(() => {
        setIsBridgeAvailable(isAndroidBrowserBridgeAvailable());
        setInstalledBrowsers(fetchInstalledBrowsers());
    }, []);

    useEffect(() => {
        setPreferredPackageState(loadPreferredBrowserPackage());
        refreshInstalledBrowsers();

        // Refresh when returning to the app in case browsers or OS defaults changed.
        const handleVisibilityChange = () => {
            if (document.visibilityState === "visible") {
                refreshInstalledBrowsers();
            }
        };

        document.addEventListener("visibilitychange", handleVisibilityChange);
        window.addEventListener("focus", refreshInstalledBrowsers);

        return () => {
            document.removeEventListener("visibilitychange", handleVisibilityChange);
            window.removeEventListener("focus", refreshInstalledBrowsers);
        };
    }, [refreshInstalledBrowsers]);

    const setPreferredPackage = useCallback((packageName: string | null) => {
        const normalized = packageName?.trim() || null;
        setPreferredPackageState(normalized);
        savePreferredBrowserPackage(normalized);
    }, []);

    const systemDefaultBrowser = useMemo(
        () =>
            installedBrowsers.find((browser) => browser.isSystemDefault) ?? null,
        [installedBrowsers]
    );

    const effectiveDefaultBrowser = useMemo(
        () => resolveEffectiveDefaultBrowser(installedBrowsers, preferredPackage),
        [installedBrowsers, preferredPackage]
    );

    // Only treat the preference as active if the chosen browser is still installed.
    const activePreferredPackage = useMemo(() => {
        if (!preferredPackage) return null;
        return installedBrowsers.some(
            (browser) => browser.packageName === preferredPackage
        )
            ? preferredPackage
            : null;
    }, [installedBrowsers, preferredPackage]);

    const defaultBrowserLabel = useMemo(
        () => getDefaultBrowserButtonLabel(effectiveDefaultBrowser),
        [effectiveDefaultBrowser]
    );

    const openInDefaultBrowser = useCallback(
        async (url: string) => {
            await launchUrlInBrowser(url, activePreferredPackage, {
                allowSystemFallback: true,
            });
        },
        [activePreferredPackage]
    );

    const openInSelectedBrowser = useCallback(
        async (url: string, packageName: string) => {
            await launchUrlInBrowser(url, packageName, {
                allowSystemFallback: false,
            });
        },
        []
    );

    return {
        installedBrowsers,
        isBridgeAvailable,
        systemDefaultBrowser,
        effectiveDefaultBrowser,
        activePreferredPackage,
        defaultBrowserLabel,
        setPreferredPackage,
        refreshInstalledBrowsers,
        openInDefaultBrowser,
        openInSelectedBrowser,
    };
}
