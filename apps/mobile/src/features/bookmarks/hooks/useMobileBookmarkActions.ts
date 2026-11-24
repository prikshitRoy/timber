/**
 * React hook providing mobile bookmark and folder write actions backed by pure state mutations.
 */

import { useCallback } from "react";
import type { BookmarkInstanceTarget, TimberState } from "@timber/core";
import {
    addExistingBookmarkToFolderInMobileState,
    deleteBookmarkAllInMobileState,
    deleteBookmarkInstanceInMobileState,
    editBookmarkInMobileState,
    removeBookmarkFromFolderInMobileState,
} from "../state/bookmark-item-mutations";
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
 * Create handlers for adding, editing, filing, removing, and deleting bookmarks and folders on mobile.
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

    /**
     * Save title and URL updates for an existing bookmark.
     */
    const handleEditBookmark = useCallback(
        (bookmarkId: string, title: string, url: string): boolean => {
            try {
                setError("");
                const { nextState, updatedTitle } = editBookmarkInMobileState(state, {
                    bookmarkId,
                    title,
                    url,
                });
                commitState(nextState);
                setStatus(`Updated "${updatedTitle}".`);
                return true;
            } catch (editError) {
                setError(
                    editError instanceof Error
                        ? editError.message
                        : "Failed to update link."
                );
                return false;
            }
        },
        [state, commitState, setStatus, setError]
    );

    /**
     * File an existing bookmark into a chosen folder or newly created folder.
     */
    const handleAddBookmarkToFolder = useCallback(
        (bookmarkId: string, folderId?: string, newFolderName?: string): boolean => {
            try {
                setError("");
                const { nextState, folderName } =
                    addExistingBookmarkToFolderInMobileState(state, {
                        bookmarkId,
                        folderId,
                        newFolderName,
                    });
                commitState(nextState);
                setStatus(`Added link to "${folderName}".`);
                return true;
            } catch (fileError) {
                setError(
                    fileError instanceof Error
                        ? fileError.message
                        : "Failed to add bookmark to folder."
                );
                return false;
            }
        },
        [state, commitState, setStatus, setError]
    );

    /**
     * Remove a bookmark from a folder without deleting it from Timber's catalog.
     */
    const handleRemoveBookmarkFromFolder = useCallback(
        (folderId: string, bookmarkId: string): boolean => {
            try {
                setError("");
                const { nextState } = removeBookmarkFromFolderInMobileState(
                    state,
                    folderId,
                    bookmarkId
                );
                commitState(nextState);
                setStatus("Removed link from folder.");
                return true;
            } catch (removeError) {
                setError(
                    removeError instanceof Error
                        ? removeError.message
                        : "Failed to remove link from folder."
                );
                return false;
            }
        },
        [state, commitState, setStatus, setError]
    );

    /**
     * Delete only the selected root or folder instance of a duplicate bookmark.
     */
    const handleDeleteBookmarkInstance = useCallback(
        (bookmarkId: string, target: BookmarkInstanceTarget): boolean => {
            try {
                setError("");
                const { nextState } = deleteBookmarkInstanceInMobileState(
                    state,
                    bookmarkId,
                    target
                );
                commitState(nextState);
                setStatus("Removed link instance.");
                return true;
            } catch (deleteError) {
                setError(
                    deleteError instanceof Error
                        ? deleteError.message
                        : "Failed to remove link instance."
                );
                return false;
            }
        },
        [state, commitState, setStatus, setError]
    );

    /**
     * Delete a bookmark and all of its copies across root and all folders.
     */
    const handleDeleteBookmarkAll = useCallback(
        (bookmarkId: string): boolean => {
            try {
                setError("");
                const { nextState } = deleteBookmarkAllInMobileState(state, bookmarkId);
                commitState(nextState);
                setStatus("Deleted link.");
                return true;
            } catch (deleteError) {
                setError(
                    deleteError instanceof Error
                        ? deleteError.message
                        : "Failed to delete link."
                );
                return false;
            }
        },
        [state, commitState, setStatus, setError]
    );

    return {
        handleCreateLink,
        handleCreateFolder,
        handleEditBookmark,
        handleAddBookmarkToFolder,
        handleRemoveBookmarkFromFolder,
        handleDeleteBookmarkInstance,
        handleDeleteBookmarkAll,
    };
}
