/**
 * Unit tests for hierarchical folder option formatting and edge cases.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { BookmarkPage } from "@timber/core";
import { buildFolderOptions } from "./folder-options.ts";

function makePage(overrides: Partial<BookmarkPage>): BookmarkPage {
    return {
        id: overrides.id ?? "p-1",
        name: overrides.name ?? "Folder",
        type: overrides.type ?? "custom",
        parentId: overrides.parentId,
        bookmarkIds: overrides.bookmarkIds ?? [],
        createdAt: 1,
        updatedAt: 1,
    };
}

describe("buildFolderOptions", () => {
    it("ignores non-custom pages and sorts nested paths alphabetically", () => {
        // Arrange
        const pages: BookmarkPage[] = [
            makePage({ id: "all", name: "All Bookmarks", type: "all" }),
            makePage({ id: "f-work", name: "Work" }),
            makePage({ id: "f-dev", name: "Dev" }),
            makePage({ id: "f-rust", name: "Rust", parentId: "f-dev" }),
            makePage({ id: "f-api", name: "API", parentId: "f-dev" }),
        ];

        // Act
        const options = buildFolderOptions(pages);

        // Assert
        assert.deepEqual(options, [
            { id: "f-dev", label: "Dev" },
            { id: "f-api", label: "Dev / API" },
            { id: "f-rust", label: "Dev / Rust" },
            { id: "f-work", label: "Work" },
        ]);
    });

    it("preserves orphaned custom folders whose parentId is missing", () => {
        // Arrange
        const pages: BookmarkPage[] = [
            makePage({ id: "f-orphan", name: "Loose", parentId: "deleted-parent" }),
        ];

        // Act
        const options = buildFolderOptions(pages);

        // Assert
        assert.deepEqual(options, [{ id: "f-orphan", label: "Loose" }]);
    });
});
