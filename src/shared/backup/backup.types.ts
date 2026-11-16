/**
 * Data shapes and format constants for Timber backup export, parsing, and merging.
 */

import type { TimberState } from "../types/timber.ts";

// Format identifier stored in every Timber JSON backup envelope.
export const BACKUP_FORMAT = "timber-backup" as const;

// Current backup envelope version number.
export const BACKUP_VERSION = 1 as const;

// Generic key-value object shape used when validating untrusted JSON input.
export type UnknownRecord = Record<string, unknown>;

// Top-level JSON structure written to disk when exporting a Timber backup.
export interface TimberBackupFile {
  format: typeof BACKUP_FORMAT;
  version: number;
  exportedAt: string;
  state: TimberState;
}

// Sanitized state and count of dropped invalid links returned after parsing a backup file.
export interface ParsedBackup {
  state: TimberState;
  skippedBookmarks: number;
}

// Counts of newly added bookmarks and folders after merging a backup into existing state.
export interface MergeSummary {
  bookmarksAdded: number;
  foldersAdded: number;
}
