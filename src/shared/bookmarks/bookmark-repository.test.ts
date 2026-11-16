/**
 * Unit tests for bookmark and folder domain mutations, deduplication, and cascading folder deletion.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createEmptyTestState } from "../testing/test-state-factory.ts";
import { normalizeBookmarkUrl } from "./bookmark-normalizer.ts";
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
});
