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
