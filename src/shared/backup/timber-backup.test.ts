/**
 * Unit tests for Timber backup creation, parsing/sanitization, stale native link pruning, and merging.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  createEmptyTestState,
  createTestBookmark,
  createTestFolder,
} from "../testing/test-state-factory.ts";
import {
  createBackup,
  dropStaleNativeLinks,
  mergeBackupIntoState,
  parseBackup,
} from "./timber-backup.ts";

describe("parseBackup", () => {
  it("parses a valid backup, collapses duplicate URLs, and counts skipped invalid URLs", () => {
    // Arrange
    const rawState = createEmptyTestState();
    rawState.bookmarks = [
      createTestBookmark({
        id: "b-1",
        url: "https://example.com",
        title: "First",
      }),
      createTestBookmark({
        id: "b-2",
        url: "https://EXAMPLE.com/",
        title: "Duplicate",
      }),
      {
        id: "b-invalid",
        url: "javascript:void(0)",
        normalizedUrl: "javascript:void(0)",
        title: "Invalid",
        createdAt: 1,
        updatedAt: 1,
      },
    ];
    rawState.pages.push(
      createTestFolder({
        id: "f-1",
        name: "Reading",
        bookmarkIds: ["b-1", "b-2", "b-invalid"],
      })
    );

    const json = JSON.stringify(createBackup(rawState));

    // Act
    const parsed = parseBackup(json);

    // Assert
    assert.equal(parsed.skippedBookmarks, 1);
    assert.equal(parsed.state.bookmarks.length, 1);
    assert.equal(parsed.state.bookmarks[0]?.id, "b-1");

    const readingFolder = parsed.state.pages.find((page) => page.id === "f-1");
    assert.deepEqual(readingFolder?.bookmarkIds, ["b-1"]);
  });

  it("throws a clear error when the input is not a valid Timber backup envelope", () => {
    // Arrange & Act & Assert
    assert.throws(
      () => parseBackup("not-json"),
      /This file isn't valid JSON/
    );
    assert.throws(
      () => parseBackup(JSON.stringify({ format: "wrong" })),
      /This doesn't look like a Timber backup file/
    );
  });
});

describe("dropStaleNativeLinks", () => {
  it("drops native links for the current browser that do not match the live native bookmark map", () => {
    // Arrange
    const state = createEmptyTestState("brave", "source-brave");
    state.sources.push({
      id: "source-firefox",
      browser: "firefox",
      name: "Firefox",
      createdAt: 1,
    });
    state.bookmarkSources = [
      {
        id: "occ-keep",
        bookmarkId: "b-1",
        sourceId: "source-brave",
        nativeBookmarkId: "native-live",
        title: "Live",
        folderPath: [],
        dateAdded: 1000,
      },
      {
        id: "occ-stale",
        bookmarkId: "b-2",
        sourceId: "source-brave",
        nativeBookmarkId: "native-missing",
        title: "Stale",
        folderPath: [],
        dateAdded: 2000,
      },
      {
        id: "occ-other-browser",
        bookmarkId: "b-3",
        sourceId: "source-firefox",
        nativeBookmarkId: "ff-1",
        title: "Firefox Link",
        folderPath: [],
      },
    ];

    const liveNative = new Map<string, number | undefined>([
      ["native-live", 1000],
    ]);

    // Act
    const droppedCount = dropStaleNativeLinks(state, "brave", liveNative);

    // Assert
    assert.equal(droppedCount, 1);
    assert.deepEqual(
      state.bookmarkSources.map((item) => item.id),
      ["occ-keep", "occ-other-browser"]
    );
  });
});

describe("mergeBackupIntoState", () => {
  it("merges new bookmarks and folders by name without duplicating existing URLs", () => {
    // Arrange
    const target = createEmptyTestState();
    target.bookmarks.push(
      createTestBookmark({
        id: "t-b1",
        url: "https://existing.example.com",
        title: "Existing",
      })
    );
    target.pages.push(
      createTestFolder({
        id: "t-f1",
        name: "Dev",
        bookmarkIds: ["t-b1"],
      })
    );

    const imported = createEmptyTestState();
    imported.bookmarks.push(
      createTestBookmark({
        id: "i-b1",
        url: "https://existing.example.com",
        title: "Existing Imported",
      }),
      createTestBookmark({
        id: "i-b2",
        url: "https://new.example.com",
        title: "New Link",
      })
    );
    imported.pages.push(
      createTestFolder({
        id: "i-f1",
        name: "Dev",
        bookmarkIds: ["i-b1", "i-b2"],
      })
    );

    // Act
    const summary = mergeBackupIntoState(target, imported);

    // Assert
    assert.equal(summary.bookmarksAdded, 1);
    assert.equal(summary.foldersAdded, 0);
    assert.equal(target.bookmarks.length, 2);

    const devFolder = target.pages.find((page) => page.id === "t-f1");
    assert.equal(devFolder?.bookmarkIds?.length, 2);
  });

  it("preserves imported rootBookmarkIds even when the backup has no newly created folders with childOrder", () => {
    // Arrange
    const target = createEmptyTestState();
    const imported = createEmptyTestState();
    imported.bookmarks.push(
      createTestBookmark({
        id: "i-root-1",
        url: "https://root-link.example.com",
        title: "Root Link",
      })
    );
    imported.rootBookmarkIds = ["i-root-1"];

    // Act
    mergeBackupIntoState(target, imported);

    // Assert
    const mergedBookmark = target.bookmarks[0];
    assert.ok(mergedBookmark);
    assert.deepEqual(target.rootBookmarkIds, [mergedBookmark.id]);
  });
});
