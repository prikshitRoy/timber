/**
 * React hook providing mobile bookmark and folder creation actions backed by pure state mutations.
 */

import { useCallback } from "react";
import type { TimberState } from "@timber/core";
import {
    addLinkToMobileState,
    createFolderInMobileState,
    type AddMobileLinkInput,
} from "../state/mobile-mutations";

interface UseMobileBookmarkActionsParams {
    state: TimberState | null;
    commitState: (nextState: TimberState) => void;
    setStatus: (status: string) => void;
    setError: (error: string) => void;
}

/**
 * Create handlers for adding manual/shared links and creating custom folders on mobile.
 */
export function useMobileBookmarkActions({
    state,
    commitState,
    setStatus,
    setError,
}: UseMobileBookmarkActionsParams) {
    /**
     * Save a manual or shared link to root, an existing folder, or a new folder.
     */
    const handleCreateLink = useCallback(
        (input: AddMobileLinkInput): boolean => {
            try {
                setError("");
                const { nextState, bookmark, targetFolderName } = addLinkToMobileState(
                    state,
                    input
                );
                commitState(nextState);
                setStatus(
                    targetFolderName
                        ? `Saved "${bookmark.title}" to ${targetFolderName}.`
                        : `Saved "${bookmark.title}" to Timber.`
                );
                return true;
            } catch (saveError) {
                setError(
                    saveError instanceof Error
                        ? saveError.message
                        : "Failed to save bookmark."
                );
                return false;
            }
        },
        [state, commitState, setStatus, setError]
    );

    /**
     * Create a new top-level or nested custom folder and persist it locally.
     */
    const handleCreateFolder = useCallback(
        (name: string, parentId?: string): boolean => {
            try {
                setError("");
                const { nextState, folder } = createFolderInMobileState(state, {
                    name,
                    parentId,
                });
                commitState(nextState);
                setStatus(`Created folder "${folder.name}".`);
                return true;
            } catch (folderError) {
                setError(
                    folderError instanceof Error
                        ? folderError.message
                        : "Failed to create folder."
                );
                return false;
            }
        },
        [state, commitState, setStatus, setError]
    );

    return {
        handleCreateLink,
        handleCreateFolder,
    };
}
