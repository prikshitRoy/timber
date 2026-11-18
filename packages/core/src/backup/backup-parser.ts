/**
 * Functions for creating, parsing, sanitizing, and pruning stale native links from Timber backups.
 */

import {
  TIMBER_SCHEMA_VERSION,
  type Bookmark,
  type BookmarkSource,
  type BrowserKind,
  type BrowserSource,
  type TimberState,
} from "../types/timber.ts";
import {
  BACKUP_FORMAT,
  BACKUP_VERSION,
  type ParsedBackup,
  type TimberBackupFile,
  type UnknownRecord,
} from "./backup.types.ts";
import { sanitizePages } from "./backup-page-sanitizer.ts";
import {
  asBrowserKind,
  asNumber,
  asRecordArray,
  asString,
  asStringArray,
  isRecord,
  parseJson,
  tryNormalizeUrl,
} from "./backup-validators.ts";

/**
 * Wrap the current TimberState in a timestamped backup envelope ready for JSON serialization.
 */
export function createBackup(state: TimberState): TimberBackupFile {
  return {
    format: BACKUP_FORMAT,
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    state,
  };
}

/**
 * Validate the outer backup envelope and return the raw state record inside it.
 */
function validateBackupEnvelope(raw: unknown): UnknownRecord {
  if (!isRecord(raw) || raw.format !== BACKUP_FORMAT) {
    throw new Error("This doesn't look like a Timber backup file.");
  }

  if (typeof raw.version === "number" && raw.version > BACKUP_VERSION) {
    throw new Error(
      "This backup was made by a newer version of Timber. Update Timber and try again."
    );
  }

  const rawState = raw.state;

  if (!isRecord(rawState) || rawState.schemaVersion !== TIMBER_SCHEMA_VERSION) {
    throw new Error("This backup has an unsupported data format.");
  }

  return rawState;
}

/**
 * Extract valid, deduplicated bookmarks from raw backup records and build an ID alias map.
 */
function sanitizeBookmarks(
  rawBookmarks: unknown,
  nowMs: number
): {
  bookmarks: Bookmark[];
  bookmarkIdAlias: Map<string, string>;
  skippedBookmarks: number;
} {
  const bookmarks: Bookmark[] = [];
  const bookmarkIdAlias = new Map<string, string>();
  const idByNormalizedUrl = new Map<string, string>();
  let skippedBookmarks = 0;

  for (const item of asRecordArray(rawBookmarks)) {
    const id = asString(item.id);
    const url = asString(item.url);
    const normalizedUrl = url ? tryNormalizeUrl(url) : null;

    if (!id || !url || !normalizedUrl) {
      skippedBookmarks++;
      continue;
    }

    // Collapse duplicate URLs onto the first bookmark ID seen so folder references stay valid.
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

  return { bookmarks, bookmarkIdAlias, skippedBookmarks };
}

/**
 * Extract valid, unique browser source records from raw backup input.
 */
function sanitizeSources(
  rawSources: unknown,
  nowMs: number
): { sources: BrowserSource[]; sourceIds: Set<string> } {
  const sources: BrowserSource[] = [];
  const sourceIds = new Set<string>();

  for (const item of asRecordArray(rawSources)) {
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

  return { sources, sourceIds };
}

/**
 * Extract valid native bookmark associations whose source and bookmark IDs exist.
 */
function sanitizeBookmarkSources(
  rawBookmarkSources: unknown,
  sourceIds: Set<string>,
  bookmarkIdAlias: Map<string, string>
): BookmarkSource[] {
  const bookmarkSources: BookmarkSource[] = [];

  for (const item of asRecordArray(rawBookmarkSources)) {
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

  return bookmarkSources;
}

/**
 * Parse and sanitize a JSON backup string, dropping malformed entries and deduplicating URLs.
 */
export function parseBackup(text: string): ParsedBackup {
  const rawState = validateBackupEnvelope(parseJson(text));
  const nowMs = Date.now();

  const { bookmarks, bookmarkIdAlias, skippedBookmarks } = sanitizeBookmarks(
    rawState.bookmarks,
    nowMs
  );
  const { sources, sourceIds } = sanitizeSources(rawState.sources, nowMs);
  const bookmarkSources = sanitizeBookmarkSources(
    rawState.bookmarkSources,
    sourceIds,
    bookmarkIdAlias
  );
  const { pages, allPage } = sanitizePages(
    rawState.pages,
    sourceIds,
    bookmarkIdAlias,
    nowMs
  );

  const activeCandidate = asString(rawState.activePageId);
  const activePageId =
    activeCandidate && pages.some((page) => page.id === activeCandidate)
      ? activeCandidate
      : allPage.id;

  const rootBookmarkIds = Array.from(
    new Set(
      asStringArray(rawState.rootBookmarkIds)
        .map((value) => bookmarkIdAlias.get(value))
        .filter((value): value is string => value !== undefined)
    )
  );

  const state: TimberState = {
    schemaVersion: TIMBER_SCHEMA_VERSION,
    sources,
    bookmarks,
    bookmarkSources,
    pages,
    activePageId,
    rootOrder: Array.from(new Set(asStringArray(rawState.rootOrder))),
    rootBookmarkIds,
    // Folders in a backup are already real entities — never re-derive them from folderPath strings.
    foldersMigrated: true,
  };

  return { state, skippedBookmarks };
}

/**
 * Drop native bookmark links for the current browser that no longer match the live native bookmark tree.
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
