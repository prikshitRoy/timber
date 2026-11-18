/**
 * Unit tests for stored tile ordering and alphabetical sorting helpers.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  applyStoredOrder,
  hasCrossedTileMidpoint,
  moveKeyInOrder,
  sortAlphabetically,
  type OrderableItem,
} from "./tile-ordering.ts";

describe("applyStoredOrder", () => {
  it("orders items matching storedOrder first and appends new items sorted A-Z", () => {
    // Arrange
    const items: OrderableItem[] = [
      { key: "bk:1", label: "Zebra" },
      { key: "bk:2", label: "Alpha" },
      { key: "bk:3", label: "Mango" },
    ];
    const storedOrder = ["bk:1"];

    // Act
    const result = applyStoredOrder(items, storedOrder);

    // Assert
    assert.deepEqual(
      result.map((item) => item.key),
      ["bk:1", "bk:2", "bk:3"]
    );
  });

  it("ignores keys in storedOrder that no longer exist in items", () => {
    // Arrange
    const items: OrderableItem[] = [
      { key: "bk:1", label: "Beta" },
      { key: "bk:2", label: "Alpha" },
    ];
    const storedOrder = ["bk:deleted", "bk:1", "bk:2"];

    // Act
    const result = applyStoredOrder(items, storedOrder);

    // Assert
    assert.deepEqual(
      result.map((item) => item.key),
      ["bk:1", "bk:2"]
    );
  });
});

describe("sortAlphabetically", () => {
  it("returns item keys sorted ascending by label when direction is asc", () => {
    // Arrange
    const items: OrderableItem[] = [
      { key: "k1", label: "Charlie" },
      { key: "k2", label: "Alpha" },
      { key: "k3", label: "Bravo" },
    ];

    // Act
    const keys = sortAlphabetically(items, "asc");

    // Assert
    assert.deepEqual(keys, ["k2", "k3", "k1"]);
  });

  it("returns item keys sorted descending by label when direction is desc", () => {
    // Arrange
    const items: OrderableItem[] = [
      { key: "k1", label: "Charlie" },
      { key: "k2", label: "Alpha" },
      { key: "k3", label: "Bravo" },
    ];

    // Act
    const keys = sortAlphabetically(items, "desc");

    // Assert
    assert.deepEqual(keys, ["k1", "k3", "k2"]);
  });
});

describe("moveKeyInOrder", () => {
  it("moves the dragged key to the target key position", () => {
    // Arrange
    const order = ["a", "b", "c", "d"];

    // Act
    const result = moveKeyInOrder(order, "a", "c");

    // Assert
    assert.deepEqual(result, ["b", "c", "a", "d"]);
  });

  it("returns the original array when dragKey or overKey is not in the order", () => {
    // Arrange
    const order = ["a", "b", "c"];

    // Act
    const result = moveKeyInOrder(order, "a", "missing");

    // Assert
    assert.equal(result, order);
  });
});

describe("hasCrossedTileMidpoint", () => {
  it("returns true when dragging forward past the target tile center zone", () => {
    // Arrange
    const rect = { left: 100, top: 50, width: 200, height: 40 };

    // Act & Assert
    assert.equal(hasCrossedTileMidpoint(0, 1, 120, 70, rect), false);
    assert.equal(hasCrossedTileMidpoint(0, 1, 210, 70, rect), true);
  });

  it("returns true when dragging backward past the target tile center zone", () => {
    // Arrange
    const rect = { left: 100, top: 50, width: 200, height: 40 };

    // Act & Assert
    assert.equal(hasCrossedTileMidpoint(2, 1, 280, 70, rect), false);
    assert.equal(hasCrossedTileMidpoint(2, 1, 190, 70, rect), true);
  });
});
