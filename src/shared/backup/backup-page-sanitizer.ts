/**
 * Sanitization helpers for reconstructing valid BookmarkPage and folder records from a backup file.
 */

import type { BookmarkPage, BookmarkPageType } from "../types/timber.ts";
import type { UnknownRecord } from "./backup.types.ts";
import {
  asNumber,
  asPageType,
  asRecordArray,
  asString,
  asStringArray,
} from "./backup-validators.ts";

/**
 * Build a sanitized BookmarkPage from a validated raw page record.
 */
function buildSanitizedPage(
  id: string,
  type: BookmarkPageType,
  item: UnknownRecord,
  sourceIds: Set<string>,
  customPageIds: Set<string>,
  bookmarkIdAlias: Map<string, string>,
  nowMs: number
): BookmarkPage {
  const page: BookmarkPage = {
    id,
    type,
    name: asString(item.name) ?? "Untitled",
    createdAt: asNumber(item.createdAt, nowMs),
    updatedAt: asNumber(item.updatedAt, nowMs),
  };

  if (type === "source") {
    const sourceId = asString(item.sourceId);
    page.sourceId = sourceId && sourceIds.has(sourceId) ? sourceId : undefined;
  }

  if (type === "custom") {
    const parentId = asString(item.parentId);
    page.parentId =
      parentId && parentId !== id && customPageIds.has(parentId)
        ? parentId
        : undefined;

    const mapped = asStringArray(item.bookmarkIds)
      .map((value) => bookmarkIdAlias.get(value))
      .filter((value): value is string => value !== undefined);

    page.bookmarkIds = Array.from(new Set(mapped));
    page.childOrder = Array.isArray(item.childOrder)
      ? Array.from(new Set(asStringArray(item.childOrder)))
      : undefined;
  }

  return page;
}

/**
 * Extract and sanitize all pages/folders from raw backup input, ensuring an "all" page exists.
 */
export function sanitizePages(
  rawPages: unknown,
  sourceIds: Set<string>,
  bookmarkIdAlias: Map<string, string>,
  nowMs: number
): { pages: BookmarkPage[]; allPage: BookmarkPage } {
  const validPages: {
    id: string;
    type: BookmarkPageType;
    raw: UnknownRecord;
  }[] = [];
  const seenPageIds = new Set<string>();

  for (const item of asRecordArray(rawPages)) {
    const id = asString(item.id);
    const type = asPageType(item.type);
    if (!id || !type || seenPageIds.has(id)) continue;

    seenPageIds.add(id);
    validPages.push({ id, type, raw: item });
  }

  const customPageIds = new Set(
    validPages.filter((page) => page.type === "custom").map((page) => page.id)
  );

  const pages = validPages.map(({ id, type, raw }) =>
    buildSanitizedPage(
      id,
      type,
      raw,
      sourceIds,
      customPageIds,
      bookmarkIdAlias,
      nowMs
    )
  );

  let allPage = pages.find((page) => page.type === "all");
  if (!allPage) {
    allPage = {
      id: crypto.randomUUID(),
      name: "All Bookmarks",
      type: "all",
      createdAt: nowMs,
      updatedAt: nowMs,
    };
    pages.unshift(allPage);
  }

  return { pages, allPage };
}
