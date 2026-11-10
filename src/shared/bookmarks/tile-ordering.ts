export interface OrderableItem {
  key: string;
  label: string;
}

/**
 * Apply a previously-stored order to a list of items: items whose
 * key appears in storedOrder come first, in that order; anything
 * new (not yet in storedOrder) is appended afterward, sorted
 * alphabetically by label for a stable, predictable default.
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

  const remaining = items
    .filter((item) => !seen.has(item.key))
    .sort((a, b) => a.label.localeCompare(b.label));

  ordered.push(...remaining);

  return ordered;
}

/**
 * Compute a fresh order — every item's key, sorted alphabetically by
 * label — for the A-Z / Z-A sort buttons.
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
