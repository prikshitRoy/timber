/**
 * Unit tests for theme resolution and appearance settings sanitization.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  DEFAULT_APPEARANCE_SETTINGS,
  resolveThemeMode,
  sanitizeAppearanceSettings,
} from "./appearance.types.ts";

describe("resolveThemeMode", () => {
  it("resolves system mode to dark when OS prefers dark and light when OS prefers light", () => {
    // Arrange & Act & Assert
    assert.equal(resolveThemeMode("system", true), "dark");
    assert.equal(resolveThemeMode("system", false), "light");
  });

  it("returns explicit light or dark mode regardless of OS preference", () => {
    // Arrange & Act & Assert
    assert.equal(resolveThemeMode("dark", false), "dark");
    assert.equal(resolveThemeMode("light", true), "light");
  });
});

describe("sanitizeAppearanceSettings", () => {
  it("returns default settings when input is null or malformed", () => {
    // Arrange & Act & Assert
    assert.deepEqual(
      sanitizeAppearanceSettings(null),
      DEFAULT_APPEARANCE_SETTINGS
    );
    assert.deepEqual(
      sanitizeAppearanceSettings({ themeMode: "invalid", backgroundImage: "" }),
      DEFAULT_APPEARANCE_SETTINGS
    );
  });

  it("preserves valid themeMode and non-empty backgroundImage", () => {
    // Arrange
    const raw = {
      themeMode: "dark",
      backgroundImage: "https://example.com/wallpaper.jpg",
    };

    // Act
    const sanitized = sanitizeAppearanceSettings(raw);

    // Assert
    assert.deepEqual(sanitized, {
      themeMode: "dark",
      backgroundImage: "https://example.com/wallpaper.jpg",
    });
  });
});
