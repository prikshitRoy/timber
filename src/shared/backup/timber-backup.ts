import type {
  Bookmark,
  BookmarkPage,
  BookmarkPageType,
  BookmarkSource,
  BrowserKind,
  BrowserSource,
  TimberState,
} from "../types/timber";

import { normalizeBookmarkUrl } from "../bookmarks/bookmark-normalizer";

export const BACKUP_FORMAT = "timber-backup";
export const BACKUP_VERSION = 1;

export interface TimberBackupFile {
  format: typeof BACKUP_FORMAT;
  version: number;
  exportedAt: string;
  state: TimberState;
}

export interface ParsedBackup {
  state: TimberState;
  skippedBookmarks: number;
}

export interface MergeSummary {
  bookmarksAdded: number;
  foldersAdded: number;
}

export function createBackup(state: TimberState): TimberBackupFile {
  return {
    format: BACKUP_FORMAT,
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    state,
  };
}

// ---------- validation helpers (a backup file is untrusted input) ----------

type UnknownRecord = Record<string, unknown>;

const BROWSER_KINDS: BrowserKind[] = ["brave", "firefox", "chromium", "unknown"];
const PAGE_TYPES: BookmarkPageType[] = ["all", "source", "custom"];

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function asString(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function asNumber(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function asStringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

function asRecordArray(value: unknown): UnknownRecord[] {
  return Array.isArray(value) ? value.filter(isRecord) : [];
}

function asBrowserKind(value: unknown): BrowserKind {
  return BROWSER_KINDS.find((kind) => kind === value) ?? "unknown";
}

function tryNormalizeUrl(url: string): string | null {
  try {
    return normalizeBookmarkUrl(url);
  } catch {
    return null;
  }
}

function parseJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    throw new Error("This file isn't valid JSON.");
  }
}

/**
 * Parse and sanitize a backup file. Anything malformed is dropped
 * rather than trusted: links must be http/https, every reference
 * must point at something that exists, duplicate URLs collapse into
 * one bookmark, and ordering lists are de-duplicated.
 */
export function parseBackup(text: string): ParsedBackup {
  const raw = parseJson(text);

  if (!isRecord(raw) || raw.format !== BACKUP_FORMAT) {
    throw new Error("This doesn't look like a Timber backup file.");
  }

  if (typeof raw.version === "number" && raw.version > BACKUP_VERSION) {
    throw new Error(
      "This backup was made by a newer version of Timber. Update Timber and try again."
    );
  }

  const rawState = raw.state;

  if (!isRecord(rawState) || rawState.schemaVersion !== 2) {
    throw new Error("This backup has an unsupported data format.");
  }

  const nowMs = Date.now();

  // ----- bookmarks -----
  const bookmarks: Bookmark[] = [];
  const bookmarkIdAlias = new Map<string, string>(); // backup id -> kept id
  const idByNormalizedUrl = new Map<string, string>();
  let skippedBookmarks = 0;

  for (const item of asRecordArray(rawState.bookmarks)) {
    const id = asString(item.id);
    const url = asString(item.url);
    const normalizedUrl = url ? tryNormalizeUrl(url) : null;

    if (!id || !url || !normalizedUrl) {
      skippedBookmarks++;
      continue;
    }

    const existingId = idByNormalizedUrl.get(normalizedUrl);

    if (existingId) {
      bookmarkIdAlias.set(id, existingId);
      continue;
    }

    idByNormalizedUrl.set(normalizedUrl, id);
    bookmarkIdAlias.set(id, id);

    bookmarks.push({
      id,
      url,
      normalizedUrl,
      title: asString(item.title) ?? url,
      createdAt: asNumber(item.createdAt, nowMs),
      updatedAt: asNumber(item.updatedAt, nowMs),
    });
  }

  // ----- browser sources -----
  const sources: BrowserSource[] = [];
  const sourceIds = new Set<string>();

  for (const item of asRecordArray(rawState.sources)) {
    const id = asString(item.id);

    if (!id || sourceIds.has(id)) continue;

    sourceIds.add(id);

    sources.push({
      id,
      browser: asBrowserKind(item.browser),
      name: asString(item.name) ?? "Browser",
      createdAt: asNumber(item.createdAt, nowMs),
      lastSyncedAt:
        typeof item.lastSyncedAt === "number" ? item.lastSyncedAt : undefined,
    });
  }

  // ----- native bookmark links -----
  const bookmarkSources: BookmarkSource[] = [];

  for (const item of asRecordArray(rawState.bookmarkSources)) {
    const id = asString(item.id);
    const rawBookmarkId = asString(item.bookmarkId);
    const bookmarkId = rawBookmarkId
      ? bookmarkIdAlias.get(rawBookmarkId)
      : undefined;
    const sourceId = asString(item.sourceId);
    const nativeBookmarkId = asString(item.nativeBookmarkId);

    if (
      !id ||
      !bookmarkId ||
      !sourceId ||
      !sourceIds.has(sourceId) ||
      !nativeBookmarkId
    ) {
      continue;
    }

    bookmarkSources.push({
      id,
      bookmarkId,
      sourceId,
      nativeBookmarkId,
      title: asString(item.title) ?? "",
      parentNativeId: asString(item.parentNativeId),
      folderPath: asStringArray(item.folderPath),
      index: typeof item.index === "number" ? item.index : undefined,
      dateAdded:
        typeof item.dateAdded === "number" ? item.dateAdded : undefined,
    });
  }

  // ----- pages / folders -----
  const validPages: {
    id: string;
    type: BookmarkPageType;
    raw: UnknownRecord;
  }[] = [];
  const seenPageIds = new Set<string>();

  for (const item of asRecordArray(rawState.pages)) {
    const id = asString(item.id);
    const type = PAGE_TYPES.find((candidate) => candidate === item.type);

    if (!id || !type || seenPageIds.has(id)) continue;

    seenPageIds.add(id);
    validPages.push({ id, type, raw: item });
  }

  const customPageIds = new Set(
    validPages.filter((page) => page.type === "custom").map((page) => page.id)
  );

  const pages: BookmarkPage[] = validPages.map(({ id, type, raw: item }) => {
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
  });

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

  const activeCandidate = asString(rawState.activePageId);
  const activePageId =
    activeCandidate && pages.some((page) => page.id === activeCandidate)
      ? activeCandidate
      : allPage.id;

  const state: TimberState = {
    schemaVersion: 2,
    sources,
    bookmarks,
    bookmarkSources,
    pages,
    activePageId,
    rootOrder: Array.from(new Set(asStringArray(rawState.rootOrder))),
    // Folders in a backup are already real entities — never re-derive
    // them from folderPath strings.
    foldersMigrated: true,
  };

  return { state, skippedBookmarks };
}

/**
 * A backup's native bookmark IDs only mean something to the browser
 * profile they came from. For the browser currently running Timber,
 * keep a stored link only if this browser's live bookmark tree still
 * has that same native bookmark (same ID and same date added).
 * Anything else is a stale ID that could collide with a different
 * bookmark and hide it from Scan, so it's dropped — the next Scan
 * simply re-links it. Links belonging to other browsers are left alone.
 * Returns how many links were dropped.
 */
export function dropStaleNativeLinks(
  state: TimberState,
  currentBrowser: BrowserKind,
  liveNative: Map<string, number | undefined> | null
): number {
  const currentSourceIds = new Set(
    state.sources
      .filter((source) => source.browser === currentBrowser)
      .map((source) => source.id)
  );

  const before = state.bookmarkSources.length;

  state.bookmarkSources = state.bookmarkSources.filter((item) => {
    if (!currentSourceIds.has(item.sourceId)) return true;
    if (!liveNative || !liveNative.has(item.nativeBookmarkId)) return false;

    const liveDate = liveNative.get(item.nativeBookmarkId);

    return (
      item.dateAdded === undefined ||
      liveDate === undefined ||
      item.dateAdded === liveDate
    );
  });

  return before - state.bookmarkSources.length;
}

/**
 * Merge a parsed backup into existing state (mutates `target`).
 * Nothing existing is overwritten or removed:
 *  - a bookmark with the same URL is the same bookmark
 *  - a folder with the same name under the same parent is the same folder
 *  - everything else is added with fresh IDs
 * Browser scan history is intentionally not merged.
 */
export function mergeBackupIntoState(
  target: TimberState,
  imported: TimberState
): MergeSummary {
  const nowMs = Date.now();
  const newId = () => crypto.randomUUID();

  let bookmarksAdded = 0;
  let foldersAdded = 0;

  // ----- bookmarks -----
  const bookmarkIdMap = new Map<string, string>();
  const targetByUrl = new Map(
    target.bookmarks.map((item) => [item.normalizedUrl, item] as const)
  );

  for (const item of imported.bookmarks) {
    const existing = targetByUrl.get(item.normalizedUrl);

    if (existing) {
      bookmarkIdMap.set(item.id, existing.id);
      continue;
    }

    const created: Bookmark = { ...item, id: newId() };

    target.bookmarks.push(created);
    targetByUrl.set(created.normalizedUrl, created);
    bookmarkIdMap.set(item.id, created.id);
    bookmarksAdded++;
  }

  // ----- folders -----
  const importedFolders = imported.pages.filter(
    (page) => page.type === "custom"
  );
  const importedById = new Map(importedFolders.map((page) => [page.id, page] as const));
  const pageIdMap = new Map<string, string>();
  const createdPageIds = new Set<string>();

  function resolveFolder(page: BookmarkPage, chain: Set<string>): string {
    const cached = pageIdMap.get(page.id);
    if (cached) return cached;

    chain.add(page.id);

    const parent = page.parentId ? importedById.get(page.parentId) : undefined;
    const parentTargetId =
      parent && !chain.has(parent.id) ? resolveFolder(parent, chain) : undefined;

    let match = target.pages.find(
      (candidate) =>
        candidate.type === "custom" &&
        candidate.parentId === parentTargetId &&
        candidate.name === page.name
    );

    if (!match) {
      match = {
        id: newId(),
        name: page.name,
        type: "custom",
        bookmarkIds: [],
        parentId: parentTargetId,
        createdAt: nowMs,
        updatedAt: nowMs,
      };

      target.pages.push(match);
      createdPageIds.add(match.id);
      foldersAdded++;
    }

    pageIdMap.set(page.id, match.id);

    return match.id;
  }

  for (const page of importedFolders) {
    const targetId = resolveFolder(page, new Set());
    const targetPage = target.pages.find((candidate) => candidate.id === targetId);

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

  // ----- custom order, only for folders created by this merge -----
  function mapOrderKey(key: string): string | null {
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

  for (const page of importedFolders) {
    const targetId = pageIdMap.get(page.id);

    if (!targetId || !createdPageIds.has(targetId) || !page.childOrder) continue;

    const targetPage = target.pages.find((candidate) => candidate.id === targetId);

    if (targetPage) {
      targetPage.childOrder = page.childOrder
        .map(mapOrderKey)
        .filter((key): key is string => key !== null);
    }
  }

  return { bookmarksAdded, foldersAdded };
}
