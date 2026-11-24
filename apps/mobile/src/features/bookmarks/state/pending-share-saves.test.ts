/**
 * Unit tests for parsing and applying queued native Android share saves.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createFolderInMobileState } from "./mobile-mutations.ts";
import {
    PENDING_FOLDER_PREFIX,
    applyPendingNativeSavesToState,
    parsePendingNativeSaves,
} from "./pending-share-saves.ts";

describe("parsePendingNativeSaves", () => {
    it("returns an empty array when input is not an array", () => {
        // Arrange & Act & Assert
        assert.deepEqual(parsePendingNativeSaves(null), []);
        assert.deepEqual(parsePendingNativeSaves({}), []);
    });

    it("drops entries without a url and defaults blank title to url", () => {
        // Arrange
        const raw = [
            { url: "https://example.com", title: "   ", folderId: " f-1 " },
            { url: "", title: "No URL" },
            null,
        ];

        // Act
        const parsed = parsePendingNativeSaves(raw);

        // Assert
        assert.deepEqual(parsed, [
            {
                url: "https://example.com",
                title: "https://example.com",
                folderId: "f-1",
                newFolderName: undefined,
            },
        ]);
    });
});

describe("applyPendingNativeSavesToState", () => {
    it("creates a new folder on the first save and reuses it for a subsequent pending folder save", () => {
        // Arrange
        const queue = [
            {
                url: "https://a.example.com",
                title: "Article A",
                newFolderName: "Reading",
            },
            {
                url: "https://b.example.com",
                title: "Article B",
                folderId: `${PENDING_FOLDER_PREFIX}Reading`,
            },
        ];

        // Act
        const result = applyPendingNativeSavesToState(null, queue);

        // Assert
        assert.equal(result.savedCount, 2);
        assert.equal(result.skippedCount, 0);
        assert.equal(result.lastTitle, "Article B");

        const readingFolders = result.nextState.pages.filter(
            (page) => page.type === "custom" && page.name === "Reading"
        );
        assert.equal(readingFolders.length, 1);
        assert.equal(readingFolders[0]?.bookmarkIds?.length, 2);
    });

    it("falls back to root when a queued folderId no longer exists", () => {
        // Arrange
        const { nextState: initialState } = createFolderInMobileState(null, {
            name: "Work",
        });

        // Act
        const result = applyPendingNativeSavesToState(initialState, [
            {
                url: "https://fallback.example.com",
                title: "Fallback",
                folderId: "deleted-folder-id",
            },
        ]);

        // Assert
        assert.equal(result.savedCount, 1);
        assert.equal(result.nextState.bookmarks.length, 1);
        assert.equal(result.nextState.rootBookmarkIds?.length, 1);
    });

    it("skips invalid URLs without failing valid items in the same batch", () => {
        // Arrange
        const queue = [
            { url: "javascript:void(0)", title: "Invalid" },
            { url: "https://valid.example.com", title: "Valid" },
        ];

        // Act
        const result = applyPendingNativeSavesToState(null, queue);

        // Assert
        assert.equal(result.savedCount, 1);
        assert.equal(result.skippedCount, 1);
        assert.equal(result.nextState.bookmarks.length, 1);
    });
});
