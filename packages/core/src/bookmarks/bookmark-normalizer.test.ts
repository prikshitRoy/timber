/**
 * Unit tests for URL protocol validation and canonical bookmark URL normalization.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  isSupportedBookmarkUrl,
  normalizeBookmarkUrl,
} from "./bookmark-normalizer.ts";

describe("normalizeBookmarkUrl", () => {
  it("normalizes uppercase hostnames and adds trailing slash to origin URLs", () => {
    // Arrange
    const rawUrl = "  https://GITHUB.com  ";

    // Act
    const result = normalizeBookmarkUrl(rawUrl);

    // Assert
    assert.equal(result, "https://github.com/");
  });

  it("preserves path, query parameters, and hash fragments", () => {
    // Arrange
    const rawUrl = "https://example.com/docs/guide?tab=api#install";

    // Act
    const result = normalizeBookmarkUrl(rawUrl);

    // Assert
    assert.equal(result, "https://example.com/docs/guide?tab=api#install");
  });

  it("throws an error when the URL uses an unsupported protocol", () => {
    // Arrange
    const unsupportedUrl = "javascript:alert(1)";

    // Act & Assert
    assert.throws(
      () => normalizeBookmarkUrl(unsupportedUrl),
      /Invalid bookmark URL/
    );
  });

  it("throws an error when the input string is not a valid URL", () => {
    // Arrange
    const malformedUrl = "not-a-valid-url";

    // Act & Assert
    assert.throws(
      () => normalizeBookmarkUrl(malformedUrl),
      /Invalid bookmark URL/
    );
  });
});

describe("isSupportedBookmarkUrl", () => {
  it("returns true for http and https URLs", () => {
    // Arrange & Act & Assert
    assert.equal(isSupportedBookmarkUrl("http://example.com"), true);
    assert.equal(isSupportedBookmarkUrl("https://example.com"), true);
  });

  it("returns false for browser-internal or malformed URLs", () => {
    // Arrange & Act & Assert
    assert.equal(isSupportedBookmarkUrl("chrome://bookmarks"), false);
    assert.equal(isSupportedBookmarkUrl("about:blank"), false);
    assert.equal(isSupportedBookmarkUrl(""), false);
  });
});
