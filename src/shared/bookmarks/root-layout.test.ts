/**
 * Unit tests for computing top-level root grid folder and link tiles.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  createEmptyTestState,
  createTestBookmark,
  createTestFolder,
} from "../testing/test-state-factory.ts";
import { computeRootTiles, tileLabel } from "./root-layout.ts";

describe("computeRootTiles", () => {
  it("includes only top-level custom folders and excludes nested sub-folders", () => {
    // Arrange
    const state = createEmptyTestState();
    const rootFolder = createTestFolder({ id: "f-root", name: "Work" });
    const subFolder = createTestFolder({
      id: "f-sub",
      name: "Projects",
      parentId: "f-root",
    });
    state.pages.push(rootFolder, subFolder);

    // Act
    const tiles = computeRootTiles(state);

    // Assert
    assert.deepEqual(
      tiles.map((tile) => tile.key),
      ["tf:f-root"]
    );
  });

  it("hides bookmarks filed in a folder unless they are also listed in rootBookmarkIds", () => {
    // Arrange
    const state = createEmptyTestState();
    const folderedOnly = createTestBookmark({
      id: "b-1",
      url: "https://one.example.com",
      title: "One",
    });
    const folderedAndRoot = createTestBookmark({
      id: "b-2",
      url: "https://two.example.com",
      title: "Two",
    });
    const unfoldered = createTestBookmark({
      id: "b-3",
      url: "https://three.example.com",
      title: "Three",
    });

    state.bookmarks.push(folderedOnly, folderedAndRoot, unfoldered);
    state.pages.push(
      createTestFolder({
        id: "f-1",
        name: "Reading",
        bookmarkIds: ["b-1", "b-2"],
      })
    );
    state.rootBookmarkIds = ["b-2"];

    // Act
    const tiles = computeRootTiles(state);

    // Assert
    const linkKeys = tiles
      .filter((tile) => tile.kind === "link")
      .map((tile) => tile.key);
    assert.deepEqual(linkKeys, ["lk:b-3", "lk:b-2"]);
  });

  it("returns the folder name or bookmark title via tileLabel", () => {
    // Arrange
    const state = createEmptyTestState();
    state.pages.push(createTestFolder({ id: "f-1", name: "Dev" }));
    state.bookmarks.push(
      createTestBookmark({
        id: "b-1",
        url: "https://dev.example.com",
        title: "Docs",
      })
    );

    // Act
    const tiles = computeRootTiles(state);

    // Assert
    assert.deepEqual(tiles.map(tileLabel), ["Dev", "Docs"]);
  });
});
