/**
 * Hook that reads incoming Android ACTION_SEND share payloads exposed by MainActivity.kt
 * on both cold launch and warm resume.
 */

import { useCallback, useEffect, useState } from "react";

export interface IncomingSharedLink {
    url: string;
    title: string;
    rawText: string;
}

interface RawSharePayload {
    text?: string;
    subject?: string;
}

declare global {
    interface Window {
        TimberAndroidShare?: {
            consumePendingShare: () => string | null;
        };
    }
}

const URL_PATTERN = /https?:\/\/[^\s<>"{}|\\^`[\]]+/i;

/**
 * Extract the first http(s) URL and a fallback title from Android's shared text/subject extras.
 */
function parseSharedPayload(raw: RawSharePayload): IncomingSharedLink | null {
    const rawText = (raw.text ?? "").trim();
    if (!rawText) return null;

    const match = rawText.match(URL_PATTERN);
    const extractedUrl = match
        ? match[0].replace(/[.,!?;:)\]]+$/, "")
        : rawText;

    const subject = (raw.subject ?? "").trim();
    const textWithoutUrl = match
        ? rawText.replace(match[0], "").trim()
        : "";

    const derivedTitle = subject || textWithoutUrl || extractedUrl;

    return {
        url: extractedUrl,
        title: derivedTitle,
        rawText,
    };
}

/**
 * Subscribe to Android Share Sheet payloads and expose the active pending share for the popup modal.
 */
export function useSharedLinkIntent() {
    const [pendingShare, setPendingShare] = useState<IncomingSharedLink | null>(
        null
    );

    const checkPendingShare = useCallback(() => {
        if (typeof window === "undefined") return;
        const rawJson = window.TimberAndroidShare?.consumePendingShare?.();
        if (!rawJson) return;

        try {
            const parsed = JSON.parse(rawJson) as RawSharePayload;
            const sharedLink = parseSharedPayload(parsed);
            if (sharedLink) {
                setPendingShare(sharedLink);
            }
        } catch {
            // Ignore malformed intent payloads.
        }
    }, []);

    useEffect(() => {
        // Check immediately on mount for cold-start shares.
        checkPendingShare();

        // Listen for warm-start shares dispatched from MainActivity.onNewIntent.
        const handleShareEvent = () => checkPendingShare();
        window.addEventListener("timber:share-intent", handleShareEvent);

        return () => {
            window.removeEventListener("timber:share-intent", handleShareEvent);
        };
    }, [checkPendingShare]);

    const clearPendingShare = useCallback(() => {
        setPendingShare(null);
    }, []);

    return {
        pendingShare,
        clearPendingShare,
    };
}
