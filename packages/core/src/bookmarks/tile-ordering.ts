/**
 * Pure ordering utilities for applying stored drag order and sorting tiles alphabetically.
 */

// Minimal shape required for any item that participates in custom drag or alphabetical ordering.
export interface OrderableItem {
  key: string;
  label: string;
}

/**
 * Place items present in `storedOrder` first in that exact sequence, then append any remaining items sorted A-Z by label.
 */
export function applyStoredOrder<T extends OrderableItem>(
  items: T[],
  storedOrder: string[] | undefined
): T[] {
  const byKey = new Map(items.map((item) => [item.key, item] as const));
  const order = storedOrder ?? [];

  const ordered: T[] = [];
  const seen = new Set<string>();

  for (const key of order) {
    const item = byKey.get(key);
    if (item) {
      ordered.push(item);
      seen.add(key);
    }
  }

  // Append newly added items that don't yet have a saved position in alphabetical order.
  const remaining = items
    .filter((item) => !seen.has(item.key))
    .sort((a, b) => a.label.localeCompare(b.label));

  ordered.push(...remaining);

  return ordered;
}

/**
 * Return an array of item keys sorted alphabetically by label in ascending ("asc") or descending ("desc") order.
 */
export function sortAlphabetically(
  items: OrderableItem[],
  direction: "asc" | "desc" = "asc"
): string[] {
  const sorted = [...items].sort((a, b) =>
    direction === "asc"
      ? a.label.localeCompare(b.label)
      : b.label.localeCompare(a.label)
  );

  return sorted.map((item) => item.key);
}

/**
 * Move `dragKey` to the index occupied by `overKey`, returning a new key array (or the same array if unchanged).
 */
export function moveKeyInOrder(
  order: string[],
  dragKey: string,
  overKey: string
): string[] {
  if (dragKey === overKey) return order;

  const fromIndex = order.indexOf(dragKey);
  const toIndex = order.indexOf(overKey);
  if (fromIndex === -1 || toIndex === -1 || fromIndex === toIndex) {
    return order;
  }

  const next = [...order];
  next.splice(fromIndex, 1);
  next.splice(toIndex, 0, dragKey);
  return next;
}

/**
 * Return true when pointer `(clientX, clientY)` has crossed past the directional midpoint of `rect` when moving from `fromIndex` to `toIndex`.
 */
export function hasCrossedTileMidpoint(
  fromIndex: number,
  toIndex: number,
  clientX: number,
  clientY: number,
  rect: { left: number; top: number; width: number; height: number }
): boolean {
  if (fromIndex === toIndex) return false;

  const midX = rect.left + rect.width / 2;
  const midY = rect.top + rect.height / 2;
  const offsetX = (clientX - midX) / Math.max(rect.width, 1);
  const offsetY = (clientY - midY) / Math.max(rect.height, 1);

  // Use the dominant axis relative to the target tile center so both horizontal rows and vertical grid moves feel natural.
  const dominantOffset =
    Math.abs(offsetX) >= Math.abs(offsetY) ? offsetX : offsetY;

  return fromIndex < toIndex ? dominantOffset >= -0.15 : dominantOffset <= 0.15;
}
