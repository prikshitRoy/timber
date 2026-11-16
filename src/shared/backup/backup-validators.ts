/**
 * Boundary validation helpers for sanitizing untrusted JSON backup files.
 */

import { normalizeBookmarkUrl } from "../bookmarks/bookmark-normalizer.ts";
import type { BookmarkPageType, BrowserKind } from "../types/timber.ts";
import type { UnknownRecord } from "./backup.types.ts";

const BROWSER_KINDS: readonly BrowserKind[] = [
  "brave",
  "firefox",
  "chromium",
  "unknown",
];

const PAGE_TYPES: readonly BookmarkPageType[] = ["all", "source", "custom"];

/**
 * Check whether an unknown value is a non-null, non-array plain object.
 */
export function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Return the value if it is a non-empty string, or undefined otherwise.
 */
export function asString(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

/**
 * Return the value if it is a finite number, or the provided fallback otherwise.
 */
export function asNumber(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

/**
 * Filter an unknown value down to an array of strings, or an empty array if not an array.
 */
export function asStringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

/**
 * Filter an unknown value down to an array of plain object records.
 */
export function asRecordArray(value: unknown): UnknownRecord[] {
  return Array.isArray(value) ? value.filter(isRecord) : [];
}

/**
 * Coerce an unknown value into a valid BrowserKind, defaulting to "unknown".
 */
export function asBrowserKind(value: unknown): BrowserKind {
  return BROWSER_KINDS.find((kind) => kind === value) ?? "unknown";
}

/**
 * Return the value if it matches a valid BookmarkPageType, or undefined otherwise.
 */
export function asPageType(value: unknown): BookmarkPageType | undefined {
  return PAGE_TYPES.find((candidate) => candidate === value);
}

/**
 * Normalize a bookmark URL string, returning null instead of throwing if invalid.
 */
export function tryNormalizeUrl(url: string): string | null {
  try {
    return normalizeBookmarkUrl(url);
  } catch {
    return null;
  }
}

/**
 * Parse a raw JSON string, throwing a user-friendly error if malformed.
 */
export function parseJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    throw new Error("This file isn't valid JSON.");
  }
}
