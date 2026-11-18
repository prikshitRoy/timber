/**
 * Unit tests for mobile JSON backup import (replace/merge), search filtering, and folder child ordering.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createBackup } from "../backup/timber-backup.ts";
import {
  createEmptyTestState,
  createTestBookmark,
  createTestFolder,
} from "../testing/test-state-factory.ts";
import {
  applyBackupImportToState,
  filterBookmarksByQuery,
  getOrderedFolderChildren,
} from "./mobile-catalog.ts";

describe("applyBackupImportToState", () => {
  it("replaces existing state completely when mode is replace", () => {
    // Arrange
    const current = createEmptyTestState();
    current.bookmarks.push(
      createTestBookmark({
        id: "old-1",
        url: "https://old.example.com",
        title: "Old",
      })
    );

    const backupState = createEmptyTestState();
    backupState.bookmarks.push(
      createTestBookmark({
        id: "new-1",
        url: "https://new.example.com",
        title: "New",
      })
    );
    const json = JSON.stringify(createBackup(backupState));

    // Act
    const result = applyBackupImportToState(current, json, "replace");

    // Assert
    assert.equal(result.nextState.bookmarks.length, 1);
    assert.equal(result.nextState.bookmarks[0]?.id, "new-1");
    assert.equal(result.statusMessage, "Loaded 1 bookmark.");
  });

  it("merges new bookmarks into existing state without losing current bookmarks when mode is merge", () => {
    // Arrange
    const current = createEmptyTestState();
    current.bookmarks.push(
      createTestBookmark({
        id: "existing-1",
        url: "https://existing.example.com",
        title: "Existing",
      })
    );

    const backupState = createEmptyTestState();
    backupState.bookmarks.push(
      createTestBookmark({
        id: "imported-1",
        url: "https://imported.example.com",
        title: "Imported",
      })
    );
    const json = JSON.stringify(createBackup(backupState));

    // Act
    const result = applyBackupImportToState(current, json, "merge");

    // Assert
    assert.equal(result.nextState.bookmarks.length, 2);
    assert.equal(
      result.statusMessage,
      "Merged 1 new bookmark and 0 new folders."
    );
  });

  it("throws a descriptive error when given malformed JSON text", () => {
    // Arrange & Act & Assert
    assert.throws(
      () => applyBackupImportToState(null, "{invalid-json", "replace"),
      /This file isn't valid JSON/
    );
  });
});

describe("filterBookmarksByQuery", () => {
  it("matches bookmarks case-insensitively by title or URL and returns empty array for blank query", () => {
    // Arrange
    const bookmarks = [
      createTestBookmark({
        id: "b-1",
        url: "https://tauri.app/start",
        title: "Tauri v2 Guide",
      }),
      createTestBookmark({
        id: "b-2",
        url: "https://nextjs.org/docs",
        title: "Next.js Documentation",
      }),
    ];

    // Act
    const byTitle = filterBookmarksByQuery(bookmarks, "TAURI");
    const byUrl = filterBookmarksByQuery(bookmarks, "nextjs.org");
    const emptyQuery = filterBookmarksByQuery(bookmarks, "   ");

    // Assert
    assert.deepEqual(
      byTitle.map((b) => b.id),
      ["b-1"]
    );
    assert.deepEqual(
      byUrl.map((b) => b.id),
      ["b-2"]
    );
    assert.deepEqual(emptyQuery, []);
  });
});

describe("getOrderedFolderChildren", () => {
  it("orders direct sub-folders and bookmarks according to folder.childOrder", () => {
    // Arrange
    const bookmarkA = createTestBookmark({
      id: "b-a",
      url: "https://a.example.com",
      title: "Alpha Link",
    });
    const parentFolder = createTestFolder({
      id: "f-parent",
      name: "Parent",
      bookmarkIds: ["b-a"],
      childOrder: ["sf:f-child", "bk:b-a"],
    });
    const childFolder = createTestFolder({
      id: "f-child",
      name: "Zeta Subfolder",
      parentId: "f-parent",
    });
    const bookmarksById = new Map([[bookmarkA.id, bookmarkA]]);

    // Act
    const children = getOrderedFolderChildren(
      parentFolder,
      [parentFolder, childFolder],
      bookmarksById
    );

    // Assert
    assert.deepEqual(
      children.map((item) => item.key),
      ["sf:f-child", "bk:b-a"]
    );
  });
});
