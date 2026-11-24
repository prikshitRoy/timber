/**
 * Pure state-transition helpers for editing, filing, removing from a folder,
 * and deleting individual bookmarks in mobile TimberState.
 */

import {
    addBookmarkToPageInState,
    createPageInState,
    deleteBookmarkInstanceInState,
    deleteBookmarksInState,
    isSupportedBookmarkUrl,
    removeBookmarkFromPageInState,
    updateBookmarkInState,
    type BookmarkInstanceTarget,
    type TimberState,
} from "@timber/core";
import { cloneOrCreateMobileState } from "./mobile-mutations.ts";

// Identifies where the user triggered a bookmark action on mobile.
export type BookmarkActionLocation =
    | { kind: "root" }
    | { kind: "folder"; folderId: string; folderName: string }
    | { kind: "search" };

export interface EditMobileBookmarkInput {
    bookmarkId: string;
    title: string;
    url: string;
}

export interface FileMobileBookmarkInput {
    bookmarkId: string;
    folderId?: string;
    newFolderName?: string;
}

/**
 * Update an existing bookmark's title and validated http(s) URL in a cloned TimberState.
 */
export function editBookmarkInMobileState(
    state: TimberState | null,
    input: EditMobileBookmarkInput
): { nextState: TimberState; updatedTitle: string } {
    if (!state) {
        throw new Error("Bookmark catalog is empty.");
    }

    const trimmedUrl = input.url.trim();
    if (!isSupportedBookmarkUrl(trimmedUrl)) {
        throw new Error("Please enter a valid http:// or https:// URL.");
    }

    const updatedTitle = input.title.trim() || trimmedUrl;
    const nextState = cloneOrCreateMobileState(state);

    updateBookmarkInState(nextState, input.bookmarkId, {
        title: updatedTitle,
        url: trimmedUrl,
    });

    return { nextState, updatedTitle };
}

/**
 * Add an existing bookmark to an existing custom folder or create a new folder and file it there.
 */
export function addExistingBookmarkToFolderInMobileState(
    state: TimberState | null,
    input: FileMobileBookmarkInput
): { nextState: TimberState; folderName: string } {
    if (!state) {
        throw new Error("Bookmark catalog is empty.");
    }

    const nextState = cloneOrCreateMobileState(state);
    const bookmarkExists = nextState.bookmarks.some(
        (item) => item.id === input.bookmarkId
    );
    if (!bookmarkExists) {
        throw new Error("Bookmark not found.");
    }

    const trimmedNewFolder = input.newFolderName?.trim() ?? "";
    let targetFolderId = "";
    let folderName = "";

    if (trimmedNewFolder) {
        const created = createPageInState(nextState, trimmedNewFolder);
        targetFolderId = created.id;
        folderName = created.name;
    } else if (input.folderId?.trim()) {
        const existingFolder = nextState.pages.find(
            (page) => page.type === "custom" && page.id === input.folderId?.trim()
        );
        if (!existingFolder) {
            throw new Error("Target folder not found.");
        }
        targetFolderId = existingFolder.id;
        folderName = existingFolder.name;
    } else {
        throw new Error("Please choose a folder or enter a new folder name.");
    }

    addBookmarkToPageInState(nextState, targetFolderId, input.bookmarkId);
    return { nextState, folderName };
}

/**
 * Remove a bookmark from a custom folder without deleting the bookmark from the catalog.
 */
export function removeBookmarkFromFolderInMobileState(
    state: TimberState | null,
    folderId: string,
    bookmarkId: string
): { nextState: TimberState } {
    if (!state) {
        throw new Error("Bookmark catalog is empty.");
    }

    const nextState = cloneOrCreateMobileState(state);
    removeBookmarkFromPageInState(nextState, folderId, bookmarkId);
    return { nextState };
}

/**
 * Delete only a specific root or folder placement of a bookmark without removing other copies.
 */
export function deleteBookmarkInstanceInMobileState(
    state: TimberState | null,
    bookmarkId: string,
    target: BookmarkInstanceTarget
): { nextState: TimberState } {
    if (!state) {
        throw new Error("Bookmark catalog is empty.");
    }

    const nextState = cloneOrCreateMobileState(state);
    deleteBookmarkInstanceInState(nextState, bookmarkId, target);
    return { nextState };
}

/**
 * Delete a bookmark and all of its instances across root and every custom folder.
 */
export function deleteBookmarkAllInMobileState(
    state: TimberState | null,
    bookmarkId: string
): { nextState: TimberState } {
    if (!state) {
        throw new Error("Bookmark catalog is empty.");
    }

    const nextState = cloneOrCreateMobileState(state);
    deleteBookmarksInState(nextState, [bookmarkId]);
    return { nextState };
}
