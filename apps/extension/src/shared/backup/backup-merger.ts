/**
 * Non-destructive merge logic for combining a parsed backup into an existing TimberState.
 */

import type { Bookmark, BookmarkPage, TimberState } from "../types/timber.ts";
import type { MergeSummary } from "./backup.types.ts";

/**
 * Merge imported bookmarks into target state by normalizedUrl, returning the ID mapping and count added.
 */
function mergeBookmarks(
  target: TimberState,
  importedBookmarks: Bookmark[]
): { bookmarkIdMap: Map<string, string>; bookmarksAdded: number } {
  const bookmarkIdMap = new Map<string, string>();
  const targetByUrl = new Map(
    target.bookmarks.map((item) => [item.normalizedUrl, item] as const)
  );
  let bookmarksAdded = 0;

  for (const item of importedBookmarks) {
    const existing = targetByUrl.get(item.normalizedUrl);

    if (existing) {
      bookmarkIdMap.set(item.id, existing.id);
      continue;
    }

    const created: Bookmark = { ...item, id: crypto.randomUUID() };
    target.bookmarks.push(created);
    targetByUrl.set(created.normalizedUrl, created);
    bookmarkIdMap.set(item.id, created.id);
    bookmarksAdded++;
  }

  return { bookmarkIdMap, bookmarksAdded };
}

/**
 * Recursively match an imported folder by name and parent in target state, or create it if missing.
 */
function resolveFolderInTarget(
  page: BookmarkPage,
  chain: Set<string>,
  target: TimberState,
  importedById: Map<string, BookmarkPage>,
  pageIdMap: Map<string, string>,
  createdPageIds: Set<string>,
  nowMs: number,
  onFolderCreated: () => void
): string {
  const cached = pageIdMap.get(page.id);
  if (cached) return cached;

  // Track visited folder IDs in the current ancestor chain to guard against cyclic parentId links.
  chain.add(page.id);

  const parent = page.parentId ? importedById.get(page.parentId) : undefined;
  const parentTargetId =
    parent && !chain.has(parent.id)
      ? resolveFolderInTarget(
          parent,
          chain,
          target,
          importedById,
          pageIdMap,
          createdPageIds,
          nowMs,
          onFolderCreated
        )
      : undefined;

  let match = target.pages.find(
    (candidate) =>
      candidate.type === "custom" &&
      candidate.parentId === parentTargetId &&
      candidate.name === page.name
  );

  if (!match) {
    match = {
      id: crypto.randomUUID(),
      name: page.name,
      type: "custom",
      bookmarkIds: [],
      parentId: parentTargetId,
      createdAt: nowMs,
      updatedAt: nowMs,
    };

    target.pages.push(match);
    createdPageIds.add(match.id);
    onFolderCreated();
  }

  pageIdMap.set(page.id, match.id);
  return match.id;
}

/**
 * Translate an imported childOrder key ("bk:<id>" or "sf:<id>") to its corresponding target ID key.
 */
function mapOrderKey(
  key: string,
  bookmarkIdMap: Map<string, string>,
  pageIdMap: Map<string, string>
): string | null {
  if (key.startsWith("bk:")) {
    const mapped = bookmarkIdMap.get(key.slice(3));
    return mapped ? `bk:${mapped}` : null;
  }

  if (key.startsWith("sf:")) {
    const mapped = pageIdMap.get(key.slice(3));
    return mapped ? `sf:${mapped}` : null;
  }

  return null;
}

/**
 * Merge a parsed backup into an existing TimberState without overwriting or deleting existing records.
 */
export function mergeBackupIntoState(
  target: TimberState,
  imported: TimberState
): MergeSummary {
  const nowMs = Date.now();
  let foldersAdded = 0;

  const { bookmarkIdMap, bookmarksAdded } = mergeBookmarks(
    target,
    imported.bookmarks
  );

  const importedFolders = imported.pages.filter(
    (page) => page.type === "custom"
  );
  const importedById = new Map(
    importedFolders.map((page) => [page.id, page] as const)
  );
  const pageIdMap = new Map<string, string>();
  const createdPageIds = new Set<string>();

  for (const page of importedFolders) {
    const targetId = resolveFolderInTarget(
      page,
      new Set(),
      target,
      importedById,
      pageIdMap,
      createdPageIds,
      nowMs,
      () => {
        foldersAdded++;
      }
    );

    const targetPage = target.pages.find(
      (candidate) => candidate.id === targetId
    );
    if (!targetPage) continue;

    targetPage.bookmarkIds ??= [];

    for (const importedBookmarkId of page.bookmarkIds ?? []) {
      const mapped = bookmarkIdMap.get(importedBookmarkId);
      if (mapped && !targetPage.bookmarkIds.includes(mapped)) {
        targetPage.bookmarkIds.push(mapped);
        targetPage.updatedAt = nowMs;
      }
    }
  }

  // Preserve custom child order only for folders newly created by this merge.
  for (const page of importedFolders) {
    const targetId = pageIdMap.get(page.id);
    if (!targetId || !createdPageIds.has(targetId) || !page.childOrder) {
      continue;
    }

    const targetPage = target.pages.find(
      (candidate) => candidate.id === targetId
    );

    if (targetPage) {
      targetPage.childOrder = page.childOrder
        .map((key) => mapOrderKey(key, bookmarkIdMap, pageIdMap))
        .filter((key): key is string => key !== null);
    }
  }

  // Merge root bookmark placements regardless of whether any folders were created.
  for (const importedBookmarkId of imported.rootBookmarkIds ?? []) {
    const mapped = bookmarkIdMap.get(importedBookmarkId);
    if (!mapped) continue;

    target.rootBookmarkIds ??= [];
    if (!target.rootBookmarkIds.includes(mapped)) {
      target.rootBookmarkIds.push(mapped);
    }
  }

  return { bookmarksAdded, foldersAdded };
}
