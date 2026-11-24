/**
 * Pure parser and state-applier for quick-saved links queued by Android's native ShareActivity.
 */

import type { TimberState } from "@timber/core";
import {
    addLinkToMobileState,
    cloneOrCreateMobileState,
} from "./mobile-mutations.ts";

// Prefix used by ShareActivity for folders created natively before the WebView has assigned a UUID.
export const PENDING_FOLDER_PREFIX = "pending:";

export interface PendingNativeSave {
    url: string;
    title: string;
    folderId?: string;
    newFolderName?: string;
}

/**
 * Validate an untrusted JSON array from Android SharedPreferences into PendingNativeSave items.
 */
export function parsePendingNativeSaves(raw: unknown): PendingNativeSave[] {
    if (!Array.isArray(raw)) return [];

    const saves: PendingNativeSave[] = [];
    for (const item of raw) {
        if (typeof item !== "object" || item === null) continue;

        const record = item as Record<string, unknown>;
        const url = typeof record.url === "string" ? record.url.trim() : "";
        if (!url) continue;

        const title =
            typeof record.title === "string" && record.title.trim().length > 0
                ? record.title.trim()
                : url;
        const folderId =
            typeof record.folderId === "string" && record.folderId.trim().length > 0
                ? record.folderId.trim()
                : undefined;
        const newFolderName =
            typeof record.newFolderName === "string" &&
                record.newFolderName.trim().length > 0
                ? record.newFolderName.trim()
                : undefined;

        saves.push({ url, title, folderId, newFolderName });
    }

    return saves;
}

/**
 * Find an existing top-level custom folder matching `name` case-insensitively.
 */
function findTopLevelFolderByName(
    state: TimberState,
    name: string
): string | undefined {
    const normalized = name.trim().toLowerCase();
    return state.pages.find(
        (page) =>
            page.type === "custom" &&
            !page.parentId &&
            page.name.trim().toLowerCase() === normalized
    )?.id;
}

/**
 * Apply all queued native share saves into a cloned TimberState, resolving pending folders safely.
 */
export function applyPendingNativeSavesToState(
    state: TimberState | null,
    saves: PendingNativeSave[]
): {
    nextState: TimberState;
    savedCount: number;
    lastTitle: string;
    skippedCount: number;
} {
    let workingState = cloneOrCreateMobileState(state);
    let savedCount = 0;
    let skippedCount = 0;
    let lastTitle = "";

    for (const item of saves) {
        let resolvedFolderId = item.folderId;
        let resolvedNewFolderName = item.newFolderName;

        // Resolve optimistic "pending:<name>" folders created during back-to-back shares.
        if (resolvedFolderId?.startsWith(PENDING_FOLDER_PREFIX)) {
            const pendingName = resolvedFolderId
                .slice(PENDING_FOLDER_PREFIX.length)
                .trim();
            const existingId = pendingName
                ? findTopLevelFolderByName(workingState, pendingName)
                : undefined;
            resolvedFolderId = existingId;
            resolvedNewFolderName = existingId ? undefined : pendingName || undefined;
        } else if (resolvedNewFolderName) {
            const existingId = findTopLevelFolderByName(
                workingState,
                resolvedNewFolderName
            );
            if (existingId) {
                resolvedFolderId = existingId;
                resolvedNewFolderName = undefined;
            }
        } else if (resolvedFolderId) {
            // If a previously synced folder was deleted before drain, fall back to root rather than losing the link.
            const stillExists = workingState.pages.some(
                (page) => page.type === "custom" && page.id === resolvedFolderId
            );
            if (!stillExists) {
                resolvedFolderId = undefined;
            }
        }

        try {
            const result = addLinkToMobileState(workingState, {
                url: item.url,
                title: item.title,
                folderId: resolvedFolderId,
                newFolderName: resolvedNewFolderName,
            });
            workingState = result.nextState;
            savedCount++;
            lastTitle = result.bookmark.title;
        } catch {
            skippedCount++;
        }
    }

    return {
        nextState: workingState,
        savedCount,
        lastTitle,
        skippedCount,
    };
}
