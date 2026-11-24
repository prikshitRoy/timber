/**
 * Unit tests for pure mobile bookmark and folder creation state transitions.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
    addLinkToMobileState,
    createEmptyMobileState,
    createFolderInMobileState,
} from "./mobile-mutations.ts";

describe("createEmptyMobileState", () => {
    it("initializes an empty v2 state with an All Bookmarks page", () => {
        // Arrange & Act
        const state = createEmptyMobileState();

        // Assert
        assert.equal(state.bookmarks.length, 0);
        assert.equal(state.pages.length, 1);
        assert.equal(state.pages[0]?.type, "all");
        assert.equal(state.activePageId, state.pages[0]?.id);
        assert.equal(state.foldersMigrated, true);
    });
});

describe("addLinkToMobileState", () => {
    it("adds a link to root when starting from null state without mutating input", () => {
        // Arrange & Act
        const { nextState, bookmark, targetFolderName } = addLinkToMobileState(
            null,
            {
                url: " https://example.com/docs ",
                title: " Example Docs ",
            }
        );

        // Assert
        assert.equal(targetFolderName, null);
        assert.equal(bookmark.url, "https://example.com/docs");
        assert.equal(bookmark.title, "Example Docs");
        assert.equal(nextState.bookmarks.length, 1);
        assert.deepEqual(nextState.rootBookmarkIds, [bookmark.id]);
    });

    it("falls back to the trimmed URL when title is blank", () => {
        // Arrange & Act
        const { bookmark } = addLinkToMobileState(null, {
            url: "https://example.com",
            title: "   ",
        });

        // Assert
        assert.equal(bookmark.title, "https://example.com");
    });

    it("files a link into an existing custom folder without mutating the original state", () => {
        // Arrange
        const { nextState: stateWithFolder, folder } = createFolderInMobileState(
            null,
            { name: "Work" }
        );

        // Act
        const { nextState, bookmark, targetFolderName } = addLinkToMobileState(
            stateWithFolder,
            {
                url: "https://work.example.com",
                title: "Work Portal",
                folderId: folder.id,
            }
        );

        // Assert
        assert.equal(targetFolderName, "Work");
        assert.equal(stateWithFolder.bookmarks.length, 0);
        const updatedFolder = nextState.pages.find((page) => page.id === folder.id);
        assert.deepEqual(updatedFolder?.bookmarkIds, [bookmark.id]);
        assert.deepEqual(nextState.rootBookmarkIds, []);
    });

    it("creates a new folder and files the link inside it when newFolderName is provided", () => {
        // Arrange & Act
        const { nextState, bookmark, targetFolderName } = addLinkToMobileState(
            null,
            {
                url: "https://news.example.com",
                title: "News",
                newFolderName: "Reading",
            }
        );

        // Assert
        assert.equal(targetFolderName, "Reading");
        const createdFolder = nextState.pages.find(
            (page) => page.type === "custom" && page.name === "Reading"
        );
        assert.ok(createdFolder);
        assert.deepEqual(createdFolder.bookmarkIds, [bookmark.id]);
    });

    it("throws when the URL protocol is not http or https", () => {
        // Arrange & Act & Assert
        assert.throws(
            () =>
                addLinkToMobileState(null, {
                    url: "javascript:alert(1)",
                    title: "Bad",
                }),
            /valid http:\/\/ or https:\/\/ URL/
        );
    });

    it("throws when targeting a folderId that does not exist", () => {
        // Arrange & Act & Assert
        assert.throws(
            () =>
                addLinkToMobileState(null, {
                    url: "https://example.com",
                    title: "Example",
                    folderId: "missing-folder-id",
                }),
            /Target folder not found/
        );
    });
});

describe("createFolderInMobileState", () => {
    it("creates a top-level custom folder from null state", () => {
        // Arrange & Act
        const { nextState, folder } = createFolderInMobileState(null, {
            name: "  Recipes  ",
        });

        // Assert
        assert.equal(folder.name, "Recipes");
        assert.equal(folder.type, "custom");
        assert.equal(folder.parentId, undefined);
        assert.equal(
            nextState.pages.some((page) => page.id === folder.id),
            true
        );
    });

    it("creates a nested sub-folder under an existing custom parent folder", () => {
        // Arrange
        const { nextState: parentState, folder: parent } =
            createFolderInMobileState(null, { name: "Dev" });

        // Act
        const { nextState, folder: child } = createFolderInMobileState(
            parentState,
            { name: "Rust", parentId: parent.id }
        );

        // Assert
        assert.equal(child.parentId, parent.id);
        assert.equal(parentState.pages.length, 2);
        assert.equal(nextState.pages.length, 3);
    });

    it("throws when folder name is empty or whitespace", () => {
        // Arrange & Act & Assert
        assert.throws(
            () => createFolderInMobileState(null, { name: "   " }),
            /Folder name is required/
        );
    });

    it("throws when parentId does not match an existing custom folder", () => {
        // Arrange & Act & Assert
        assert.throws(
            () =>
                createFolderInMobileState(null, {
                    name: "Child",
                    parentId: "non-existent",
                }),
            /Parent folder not found/
        );
    });
});
