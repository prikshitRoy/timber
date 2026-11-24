/**
 * Hook that syncs Timber folders to Android's native ShareActivity dropdown
 * and drains links saved via the native share overlay into local TimberState.
 */

import { useCallback, useEffect, useRef } from "react";
import type { BookmarkPage, TimberState } from "@timber/core";
import { buildFolderOptions } from "../state/folder-options";
import {
    applyPendingNativeSavesToState,
    parsePendingNativeSaves,
} from "../state/pending-share-saves";

declare global {
    interface Window {
        TimberAndroidShare?: {
            consumePendingSaves?: () => string | null;
            syncFolders?: (foldersJson: string) => void;
        };
    }
}

interface UseSharedLinkIntentParams {
    isLoaded: boolean;
    state: TimberState | null;
    folders: BookmarkPage[];
    commitState: (nextState: TimberState) => void;
    setStatus: (status: string) => void;
}

/**
 * Mirror custom folders to Android SharedPreferences and drain queued native share saves.
 */
export function useSharedLinkIntent({
    isLoaded,
    state,
    folders,
    commitState,
    setStatus,
}: UseSharedLinkIntentParams) {
    const latestStateRef = useRef<TimberState | null>(state);
    latestStateRef.current = state;

    // Keep Android's native ShareActivity folder dropdown in sync with Timber's folders.
    useEffect(() => {
        if (!isLoaded || typeof window === "undefined") return;
        const bridge = window.TimberAndroidShare;
        if (!bridge || typeof bridge.syncFolders !== "function") return;

        try {
            const options = buildFolderOptions(folders);
            // Invoke directly on the injected bridge object; detached Android WebView methods throw.
            bridge.syncFolders(JSON.stringify(options));
        } catch {
            // Ignore bridge errors when WebView is tearing down.
        }
    }, [isLoaded, folders]);

    const drainPendingSaves = useCallback(() => {
        if (!isLoaded || typeof window === "undefined") return;

        const bridge = window.TimberAndroidShare;
        if (!bridge || typeof bridge.consumePendingSaves !== "function") return;

        // Invoke directly on the injected bridge object; detached Android WebView methods throw.
        const rawJson = bridge.consumePendingSaves();
        if (!rawJson) return;

        try {
            const parsed = parsePendingNativeSaves(JSON.parse(rawJson));
            if (parsed.length === 0) return;

            const { nextState, savedCount, lastTitle } =
                applyPendingNativeSavesToState(latestStateRef.current, parsed);

            if (savedCount === 0) return;

            commitState(nextState);
            setStatus(
                savedCount === 1
                    ? `Saved "${lastTitle}" from Share.`
                    : `Saved ${savedCount} shared links to Timber.`
            );
        } catch {
            // Ignore malformed native queue payloads.
        }
    }, [isLoaded, commitState, setStatus]);

    useEffect(() => {
        if (!isLoaded) return;

        // Drain immediately once localStorage catalog finishes loading.
        drainPendingSaves();

        const handlePendingSaves = () => drainPendingSaves();
        const handleVisibilityChange = () => {
            if (document.visibilityState === "visible") {
                drainPendingSaves();
            }
        };

        window.addEventListener("timber:pending-saves", handlePendingSaves);
        window.addEventListener("focus", handlePendingSaves);
        document.addEventListener("visibilitychange", handleVisibilityChange);

        return () => {
            window.removeEventListener("timber:pending-saves", handlePendingSaves);
            window.removeEventListener("focus", handlePendingSaves);
            document.removeEventListener("visibilitychange", handleVisibilityChange);
        };
    }, [isLoaded, drainPendingSaves]);
}
