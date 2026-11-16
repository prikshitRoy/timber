/**
 * Unit tests for stored tile ordering and alphabetical sorting helpers.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  applyStoredOrder,
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
