/**
 * Unit tests for browser container stripping and nested folder-chain resolution.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createEmptyTestState } from "../testing/test-state-factory.ts";
import {
  findOrCreateFolderChainInState,
  stripBrowserContainer,
} from "./folder-chain.ts";

describe("stripBrowserContainer", () => {
  it("removes the first container segment from a native browser folder path", () => {
    // Arrange
    const nativePath = ["Bookmarks bar", "Engineering", "TypeScript"];

    // Act
    const stripped = stripBrowserContainer(nativePath);

    // Assert
    assert.deepEqual(stripped, ["Engineering", "TypeScript"]);
  });

  it("returns an empty array when the path only contains the top-level container", () => {
    // Arrange & Act
    const stripped = stripBrowserContainer(["Other bookmarks"]);

    // Assert
    assert.deepEqual(stripped, []);
  });
});

describe("findOrCreateFolderChainInState", () => {
  it("returns null when the folder path is empty", () => {
    // Arrange
    const state = createEmptyTestState();

    // Act
    const result = findOrCreateFolderChainInState(state, []);

    // Assert
    assert.equal(result, null);
  });

  it("creates a nested chain of custom folders and reuses existing folders with the same name and parent", () => {
    // Arrange
    const state = createEmptyTestState();

    // Act
    const firstLeaf = findOrCreateFolderChainInState(state, [
      "Work",
      "Frontend",
    ]);
    const secondLeaf = findOrCreateFolderChainInState(state, [
      "Work",
      "Frontend",
    ]);

    // Assert
    assert.ok(firstLeaf);
    assert.ok(secondLeaf);
    assert.equal(firstLeaf.id, secondLeaf.id);

    const customFolders = state.pages.filter((page) => page.type === "custom");
    assert.equal(customFolders.length, 2);
  });
});
