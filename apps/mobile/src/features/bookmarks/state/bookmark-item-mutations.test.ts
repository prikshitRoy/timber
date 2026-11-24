/**
 * Unit tests for pure mobile bookmark item mutations (edit, add to folder,
 * remove from folder, delete single instance, and delete all duplicates).
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
    addExistingBookmarkToFolderInMobileState,
    deleteBookmarkAllInMobileState,
    deleteBookmarkInstanceInMobileState,
    editBookmarkInMobileState,
    removeBookmarkFromFolderInMobileState,
} from "./bookmark-item-mutations.ts";
import {
    addLinkToMobileState,
    createFolderInMobileState,
} from "./mobile-mutations.ts";

describe("editBookmarkInMobileState", () => {
    it("updates title and URL without mutating the original state", () => {
        // Arrange
        const { nextState: initialState, bookmark } = addLinkToMobileState(null, {
            url: "https://old.example.com",
            title: "Old Title",
        });

        // Act
        const { nextState, updatedTitle } = editBookmarkInMobileState(
            initialState,
            {
                bookmarkId: bookmark.id,
                title: " New Title ",
                url: " https://new.example.com/path ",
            }
        );

        // Assert
        assert.equal(updatedTitle, "New Title");
        assert.equal(initialState.bookmarks[0]?.title, "Old Title");
        assert.equal(nextState.bookmarks[0]?.title, "New Title");
        assert.equal(nextState.bookmarks[0]?.url, "https://new.example.com/path");
    });

    it("falls back to trimmed URL when title is blank", () => {
        // Arrange
        const { nextState: initialState, bookmark } = addLinkToMobileState(null, {
            url: "https://example.com",
            title: "Example",
        });

        // Act
        const { nextState, updatedTitle } = editBookmarkInMobileState(
            initialState,
            {
                bookmarkId: bookmark.id,
                title: "   ",
                url: "https://updated.example.com",
            }
        );

        // Assert
        assert.equal(updatedTitle, "https://updated.example.com");
        assert.equal(nextState.bookmarks[0]?.title, "https://updated.example.com");
    });

    it("throws when URL protocol is invalid or state is null", () => {
        // Arrange
        const { nextState: initialState, bookmark } = addLinkToMobileState(null, {
            url: "https://example.com",
            title: "Example",
        });

        // Act & Assert
        assert.throws(
            () =>
                editBookmarkInMobileState(initialState, {
                    bookmarkId: bookmark.id,
                    title: "Bad",
                    url: "javascript:alert(1)",
                }),
            /valid http:\/\/ or https:\/\/ URL/
        );
        assert.throws(
            () =>
                editBookmarkInMobileState(null, {
                    bookmarkId: "b-1",
                    title: "Missing",
                    url: "https://example.com",
                }),
            /catalog is empty/
        );
    });
});

describe("addExistingBookmarkToFolderInMobileState", () => {
    it("files an existing bookmark into an existing custom folder", () => {
        // Arrange
        const { nextState: withLink, bookmark } = addLinkToMobileState(null, {
            url: "https://example.com",
            title: "Example",
        });
        const { nextState: withFolder, folder } = createFolderInMobileState(
            withLink,
            { name: "Reading" }
        );

        // Act
        const { nextState, folderName } = addExistingBookmarkToFolderInMobileState(
            withFolder,
            { bookmarkId: bookmark.id, folderId: folder.id }
        );

        // Assert
        assert.equal(folderName, "Reading");
        const targetFolder = nextState.pages.find((page) => page.id === folder.id);
        assert.deepEqual(targetFolder?.bookmarkIds, [bookmark.id]);
    });

    it("creates a new folder and files the bookmark inside it", () => {
        // Arrange
        const { nextState: withLink, bookmark } = addLinkToMobileState(null, {
            url: "https://example.com",
            title: "Example",
        });

        // Act
        const { nextState, folderName } = addExistingBookmarkToFolderInMobileState(
            withLink,
            { bookmarkId: bookmark.id, newFolderName: "  Favorites  " }
        );

        // Assert
        assert.equal(folderName, "Favorites");
        const created = nextState.pages.find(
            (page) => page.type === "custom" && page.name === "Favorites"
        );
        assert.deepEqual(created?.bookmarkIds, [bookmark.id]);
    });

    it("throws when neither folderId nor newFolderName is provided", () => {
        // Arrange
        const { nextState: withLink, bookmark } = addLinkToMobileState(null, {
            url: "https://example.com",
            title: "Example",
        });

        // Act & Assert
        assert.throws(
            () =>
                addExistingBookmarkToFolderInMobileState(withLink, {
                    bookmarkId: bookmark.id,
                }),
            /choose a folder or enter a new folder name/
        );
    });
});

describe("removeBookmarkFromFolderInMobileState", () => {
    it("removes the bookmark from the folder while keeping the canonical bookmark record", () => {
        // Arrange
        const { nextState: withFolder, folder } = createFolderInMobileState(null, {
            name: "Work",
        });
        const { nextState: withLink, bookmark } = addLinkToMobileState(withFolder, {
            url: "https://work.example.com",
            title: "Work",
            folderId: folder.id,
        });

        // Act
        const { nextState } = removeBookmarkFromFolderInMobileState(
            withLink,
            folder.id,
            bookmark.id
        );

        // Assert
        const updatedFolder = nextState.pages.find((page) => page.id === folder.id);
        assert.deepEqual(updatedFolder?.bookmarkIds, []);
        assert.equal(nextState.bookmarks.length, 1);
    });
});

describe("deleteBookmarkInstanceInMobileState and deleteBookmarkAllInMobileState", () => {
    it("deletes only the selected folder instance while keeping the root copy", () => {
        // Arrange
        const { nextState: s1, bookmark } = addLinkToMobileState(null, {
            url: "https://dup.example.com",
            title: "Duplicate",
        });
        const { nextState: s2, folder } = createFolderInMobileState(s1, {
            name: "Saved",
        });
        const { nextState: s3 } = addExistingBookmarkToFolderInMobileState(s2, {
            bookmarkId: bookmark.id,
            folderId: folder.id,
        });

        // Act
        const { nextState } = deleteBookmarkInstanceInMobileState(
            s3,
            bookmark.id,
            { kind: "folder", folderId: folder.id }
        );

        // Assert
        const savedFolder = nextState.pages.find((page) => page.id === folder.id);
        assert.deepEqual(savedFolder?.bookmarkIds, []);
        assert.deepEqual(nextState.rootBookmarkIds, [bookmark.id]);
        assert.equal(nextState.bookmarks.length, 1);
    });

    it("deletes every instance of a duplicate bookmark across root and all folders", () => {
        // Arrange
        const { nextState: s1, bookmark } = addLinkToMobileState(null, {
            url: "https://dup.example.com",
            title: "Duplicate",
        });
        const { nextState: s2, folder } = createFolderInMobileState(s1, {
            name: "Saved",
        });
        const { nextState: s3 } = addExistingBookmarkToFolderInMobileState(s2, {
            bookmarkId: bookmark.id,
            folderId: folder.id,
        });

        // Act
        const { nextState } = deleteBookmarkAllInMobileState(s3, bookmark.id);

        // Assert
        const savedFolder = nextState.pages.find((page) => page.id === folder.id);
        assert.deepEqual(savedFolder?.bookmarkIds, []);
        assert.deepEqual(nextState.rootBookmarkIds, []);
        assert.equal(nextState.bookmarks.length, 0);
    });
});
