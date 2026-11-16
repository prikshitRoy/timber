/**
 * Unit tests for bookmark and folder domain mutations, deduplication, and cascading folder deletion.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createEmptyTestState } from "../testing/test-state-factory.ts";
import { normalizeBookmarkUrl } from "./bookmark-normalizer.ts";
import {
  countBookmarkInstancesInState,
  deleteBookmarkInstanceInState,
} from "./operations/bookmark-instances.ts";
import {
  addBookmarkToRootInState,
  deleteBookmarksInState,
  removeNativeBookmarkInState,
  upsertNativeBookmarkInState,
} from "./operations/bookmark-mutations.ts";
import {
  addBookmarkToPageInState,
  createPageInState,
  deletePageInState,
  getBookmarksForPageInState,
} from "./operations/folder-mutations.ts";
import {
  applySyncDiffInState,
  computeSyncDiffInState,
  ensureNativeFoldersInState,
} from "./operations/sync-mutations.ts";
import { computeRootTiles } from "./root-layout.ts";

describe("bookmark and folder mutations", () => {
  it("deduplicates bookmarks with identical normalized URLs across multiple native occurrences", () => {
    // Arrange
    const state = createEmptyTestState("brave", "source-1");

    // Act
    const first = upsertNativeBookmarkInState(state, {
      sourceId: "source-1",
      nativeBookmarkId: "native-1",
      url: "https://github.com",
      title: "GitHub",
    });
    const duplicate = upsertNativeBookmarkInState(state, {
      sourceId: "source-1",
      nativeBookmarkId: "native-2",
      url: "https://GITHUB.com/",
      title: "GitHub Duplicate",
    });

    // Assert
    assert.equal(first.id, duplicate.id);
    assert.equal(state.bookmarks.length, 1);
    assert.equal(
      state.bookmarks[0]?.normalizedUrl,
      normalizeBookmarkUrl("https://github.com")
    );
    assert.equal(state.bookmarkSources.length, 2);
  });

  it("retains the canonical bookmark when one of two native occurrences is removed", () => {
    // Arrange
    const state = createEmptyTestState("brave", "source-1");
    const github = upsertNativeBookmarkInState(state, {
      sourceId: "source-1",
      nativeBookmarkId: "native-1",
      url: "https://github.com",
      title: "GitHub",
    });
    upsertNativeBookmarkInState(state, {
      sourceId: "source-1",
      nativeBookmarkId: "native-2",
      url: "https://github.com/",
      title: "GitHub 2",
    });

    // Act
    removeNativeBookmarkInState(state, "source-1", "native-1");

    // Assert
    assert.equal(state.bookmarks.length, 1);
    assert.equal(state.bookmarks[0]?.id, github.id);
    assert.equal(state.bookmarkSources.length, 1);
  });

  it("keeps a foldered bookmark visible on the root grid when added via addBookmarkToRootInState", () => {
    // Arrange
    const state = createEmptyTestState("brave", "source-1");
    const github = upsertNativeBookmarkInState(state, {
      sourceId: "source-1",
      nativeBookmarkId: "native-1",
      url: "https://github.com",
      title: "GitHub",
    });
    const folder = createPageInState(state, "Dev Tools");
    addBookmarkToPageInState(state, folder.id, github.id);

    // Act
    addBookmarkToRootInState(state, github.id);
    const rootTiles = computeRootTiles(state);

    // Assert
    const pageBookmarks = getBookmarksForPageInState(state, folder.id);
    assert.equal(pageBookmarks.length, 1);
    assert.equal(
      rootTiles.some(
        (tile) => tile.kind === "link" && tile.bookmark.id === github.id
      ),
      true
    );
  });

  it("recursively deletes nested sub-folders and scrubs deleted bookmarks from surviving folders", () => {
    // Arrange
    const state = createEmptyTestState("brave", "source-1");
    const sharedBookmark = upsertNativeBookmarkInState(state, {
      sourceId: "source-1",
      nativeBookmarkId: "native-1",
      url: "https://shared.example.com",
      title: "Shared",
    });
    const parentFolder = createPageInState(state, "Parent");
    const childFolder = createPageInState(state, "Child", parentFolder.id);
    const survivingFolder = createPageInState(state, "Surviving");

    addBookmarkToPageInState(state, childFolder.id, sharedBookmark.id);
    addBookmarkToPageInState(state, survivingFolder.id, sharedBookmark.id);

    // Act
    deletePageInState(state, parentFolder.id);

    // Assert
    const remainingFolderIds = state.pages
      .filter((page) => page.type === "custom")
      .map((page) => page.id);
    assert.deepEqual(remainingFolderIds, [survivingFolder.id]);
    assert.equal(state.bookmarks.length, 0);
    assert.deepEqual(survivingFolder.bookmarkIds, []);
  });

  it("removes deleted bookmarks from catalog, sources, rootBookmarkIds, and custom folders", () => {
    // Arrange
    const state = createEmptyTestState("brave", "source-1");
    const bookmark = upsertNativeBookmarkInState(state, {
      sourceId: "source-1",
      nativeBookmarkId: "native-1",
      url: "https://delete-me.example.com",
      title: "Delete Me",
    });
    const folder = createPageInState(state, "Folder");
    addBookmarkToPageInState(state, folder.id, bookmark.id);
    addBookmarkToRootInState(state, bookmark.id);

    // Act
    deleteBookmarksInState(state, [bookmark.id]);

    // Assert
    assert.equal(state.bookmarks.length, 0);
    assert.equal(state.bookmarkSources.length, 0);
    assert.deepEqual(state.rootBookmarkIds, []);
    assert.deepEqual(folder.bookmarkIds, []);
  });

  it("deletes only the selected root or folder instance without removing other copies", () => {
    // Arrange
    const state = createEmptyTestState("brave", "source-1");
    const bookmark = upsertNativeBookmarkInState(state, {
      sourceId: "source-1",
      nativeBookmarkId: "native-1",
      url: "https://duplicate.example.com",
      title: "Duplicate Link",
    });
    const folderA = createPageInState(state, "Folder A");
    const folderB = createPageInState(state, "Folder B");
    addBookmarkToPageInState(state, folderA.id, bookmark.id);
    addBookmarkToPageInState(state, folderB.id, bookmark.id);
    addBookmarkToRootInState(state, bookmark.id);

    assert.equal(countBookmarkInstancesInState(state, bookmark.id), 3);

    // Act 1: Delete only the root instance
    deleteBookmarkInstanceInState(state, bookmark.id, { kind: "root" });

    // Assert 1: Root instance is gone, both folder copies remain
    assert.equal(countBookmarkInstancesInState(state, bookmark.id), 2);
    assert.deepEqual(state.rootBookmarkIds, []);
    assert.deepEqual(folderA.bookmarkIds, [bookmark.id]);
    assert.deepEqual(folderB.bookmarkIds, [bookmark.id]);

    // Act 2: Delete only the Folder A instance
    deleteBookmarkInstanceInState(state, bookmark.id, {
      kind: "folder",
      folderId: folderA.id,
    });

    // Assert 2: Folder A copy is gone, Folder B copy and canonical bookmark remain
    assert.equal(countBookmarkInstancesInState(state, bookmark.id), 1);
    assert.deepEqual(folderA.bookmarkIds, []);
    assert.deepEqual(folderB.bookmarkIds, [bookmark.id]);
    assert.equal(state.bookmarks.length, 1);
  });

  it("detects and adds browser bookmarks into a new or different folder even when the same URL already exists in Timber", () => {
    // Arrange
    const state = createEmptyTestState("brave", "source-1");
    const existing = upsertNativeBookmarkInState(state, {
      sourceId: "source-1",
      nativeBookmarkId: "native-1",
      url: "https://example.com",
      title: "Example",
      folderPath: ["Bookmarks bar", "Folder A"],
    });
    const folderA = createPageInState(state, "Folder A");
    addBookmarkToPageInState(state, folderA.id, existing.id);

    // Browser now also has the same URL inside "Folder B" (and an empty "Folder C")
    const nativeBookmarks = [
      {
        nativeBookmarkId: "native-1",
        url: "https://example.com",
        title: "Example",
        folderPath: ["Bookmarks bar", "Folder A"],
      },
      {
        nativeBookmarkId: "native-2",
        url: "https://example.com",
        title: "Example in B",
        folderPath: ["Bookmarks bar", "Folder B"],
      },
    ];

    // Act
    ensureNativeFoldersInState(state, [["Bookmarks bar", "Folder C"]]);
    const diff = computeSyncDiffInState(state, "source-1", nativeBookmarks);
    applySyncDiffInState(state, "source-1", nativeBookmarks, {
      acceptedNativeIds: diff.additions.map(
        (item) => item.native.nativeBookmarkId
      ),
    });

    // Assert
    assert.equal(diff.additions.length, 1);
    assert.equal(diff.additions[0]?.native.nativeBookmarkId, "native-2");

    const folderB = state.pages.find(
      (page) => page.type === "custom" && page.name === "Folder B"
    );
    const folderC = state.pages.find(
      (page) => page.type === "custom" && page.name === "Folder C"
    );
    assert.ok(folderB);
    assert.ok(folderC);
    assert.deepEqual(folderB.bookmarkIds, [existing.id]);
    assert.deepEqual(folderA.bookmarkIds, [existing.id]);
  });
});
