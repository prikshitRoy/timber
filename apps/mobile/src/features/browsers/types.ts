/**
 * Data shapes for installed Android browsers and the native WebView bridge.
 */

export interface InstalledBrowser {
    packageName: string;
    label: string;
    isSystemDefault: boolean;
}

export interface AndroidBrowserBridge {
    getInstalledBrowsers: () => string;
    openUrlInBrowser: (url: string, packageName: string) => boolean;
}
