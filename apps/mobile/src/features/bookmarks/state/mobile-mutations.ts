/**
 * Pure state-transition helpers for creating links and folders in mobile TimberState,
 * delegating core catalog mutations to @timber/core.
 */

import {
    TIMBER_SCHEMA_VERSION,
    addBookmarkToPageInState,
    addBookmarkToRootInState,
    createManualLinkInState,
    createPageInState,
    isSupportedBookmarkUrl,
    type Bookmark,
    type BookmarkPage,
    type TimberState,
} from "@timber/core";

// Input payload for creating a manual or shared bookmark link on mobile.
export interface AddMobileLinkInput {
    url: string;
    title: string;
    folderId?: string;
    newFolderName?: string;
}

// Input payload for creating a top-level or nested custom folder on mobile.
export interface CreateMobileFolderInput {
    name: string;
    parentId?: string;
}

/**
 * Create a fresh, valid v2 TimberState for a mobile device with no imported catalog yet.
 */
export function createEmptyMobileState(): TimberState {
    const now = Date.now();
    const allPageId = crypto.randomUUID();

    return {
        schemaVersion: TIMBER_SCHEMA_VERSION,
        sources: [],
        bookmarks: [],
        bookmarkSources: [],
        pages: [
            {
                id: allPageId,
                name: "All Bookmarks",
                type: "all",
                createdAt: now,
                updatedAt: now,
            },
        ],
        activePageId: allPageId,
        rootOrder: [],
        rootBookmarkIds: [],
        foldersMigrated: true,
    };
}

/**
 * Return a deep clone of the current TimberState, or initialize an empty one when null.
 */
export function cloneOrCreateMobileState(
    state: TimberState | null
): TimberState {
    return state ? structuredClone(state) : createEmptyMobileState();
}

/**
 * Add a validated http(s) link to the root grid, an existing folder, or a newly created folder.
 */
export function addLinkToMobileState(
    state: TimberState | null,
    input: AddMobileLinkInput
): {
    nextState: TimberState;
    bookmark: Bookmark;
    targetFolderName: string | null;
} {
    const trimmedUrl = input.url.trim();
    if (!isSupportedBookmarkUrl(trimmedUrl)) {
        throw new Error("Please enter a valid http:// or https:// URL.");
    }

    const nextState = cloneOrCreateMobileState(state);
    const cleanTitle = input.title.trim() || trimmedUrl;
    const bookmark = createManualLinkInState(nextState, trimmedUrl, cleanTitle);

    let targetFolderId = "";
    let targetFolderName: string | null = null;
    const trimmedNewFolder = input.newFolderName?.trim() ?? "";

    if (trimmedNewFolder) {
        const createdFolder = createPageInState(nextState, trimmedNewFolder);
        targetFolderId = createdFolder.id;
        targetFolderName = createdFolder.name;
    } else if (input.folderId?.trim()) {
        const existingFolder = nextState.pages.find(
            (page) => page.type === "custom" && page.id === input.folderId?.trim()
        );
        if (!existingFolder) {
            throw new Error("Target folder not found.");
        }
        targetFolderId = existingFolder.id;
        targetFolderName = existingFolder.name;
    }

    if (targetFolderId) {
        addBookmarkToPageInState(nextState, targetFolderId, bookmark.id);
    } else {
        addBookmarkToRootInState(nextState, bookmark.id);
    }

    return { nextState, bookmark, targetFolderName };
}

/**
 * Create a new top-level or nested custom folder in mobile TimberState.
 */
export function createFolderInMobileState(
    state: TimberState | null,
    input: CreateMobileFolderInput
): {
    nextState: TimberState;
    folder: BookmarkPage;
} {
    const trimmedName = input.name.trim();
    if (!trimmedName) {
        throw new Error("Folder name is required.");
    }

    const nextState = cloneOrCreateMobileState(state);
    const trimmedParentId = input.parentId?.trim() || undefined;

    if (trimmedParentId) {
        const parentExists = nextState.pages.some(
            (page) => page.type === "custom" && page.id === trimmedParentId
        );
        if (!parentExists) {
            throw new Error("Parent folder not found.");
        }
    }

    const folder = createPageInState(nextState, trimmedName, trimmedParentId);
    return { nextState, folder };
}
