/**
 * Typed runtime message contracts and boundary guards for communication
 * between the background service worker and the New Tab dashboard UI.
 */

import type {
  BookmarkSyncDiff,
  BookmarkSyncSelection,
  BookmarkSyncSummary,
  NativeBookmarkRecord,
} from "../bookmarks/bookmark.types";

// Named constants for all extension runtime message types.
export const TIMBER_MESSAGE_TYPES = {
  SYNC_BOOKMARKS: "TIMBER_SYNC_BOOKMARKS",
  APPLY_SYNC_SELECTION: "TIMBER_APPLY_SYNC_SELECTION",
  BOOKMARKS_CHANGED: "TIMBER_BOOKMARKS_CHANGED",
  BOOKMARKS_UPDATED: "TIMBER_BOOKMARKS_UPDATED",
} as const;

// Sent by the dashboard to compute a diff between native browser bookmarks and Timber's catalog.
export interface TimberSyncBookmarksMessage {
  type: typeof TIMBER_MESSAGE_TYPES.SYNC_BOOKMARKS;
}

// Returned by the background script in response to TIMBER_SYNC_BOOKMARKS.
export interface TimberSyncBookmarksResponse {
  sourceId: string;
  nativeBookmarks: NativeBookmarkRecord[];
  diff: BookmarkSyncDiff;
}

// Sent by the dashboard when the user confirms which scanned native bookmarks to import.
export interface TimberApplySyncSelectionMessage {
  type: typeof TIMBER_MESSAGE_TYPES.APPLY_SYNC_SELECTION;
  sourceId: string;
  nativeBookmarks: NativeBookmarkRecord[];
  selection: BookmarkSyncSelection;
}

// Broadcast by the background script when native browser bookmarks are created, changed, moved, or removed.
export interface TimberBookmarksChangedMessage {
  type: typeof TIMBER_MESSAGE_TYPES.BOOKMARKS_CHANGED;
}

// Broadcast by the background script after a user-approved sync selection has been applied.
export interface TimberBookmarksUpdatedMessage {
  type: typeof TIMBER_MESSAGE_TYPES.BOOKMARKS_UPDATED;
  summary: BookmarkSyncSummary;
}

export type TimberRuntimeMessage =
  | TimberSyncBookmarksMessage
  | TimberApplySyncSelectionMessage
  | TimberBookmarksChangedMessage
  | TimberBookmarksUpdatedMessage;

/**
 * Check whether an unknown runtime message payload is a plain object with a string `type` field.
 */
export function hasMessageType(
  message: unknown
): message is { type: string; [key: string]: unknown } {
  return (
    typeof message === "object" &&
    message !== null &&
    "type" in message &&
    typeof (message as { type: unknown }).type === "string"
  );
}

/**
 * Validate at the runtime message boundary that a message is a well-formed TIMBER_APPLY_SYNC_SELECTION request.
 */
export function isApplySyncSelectionMessage(
  message: unknown
): message is TimberApplySyncSelectionMessage {
  if (!hasMessageType(message)) return false;
  if (message.type !== TIMBER_MESSAGE_TYPES.APPLY_SYNC_SELECTION) return false;

  const hasValidSourceId =
    typeof message.sourceId === "string" && message.sourceId.length > 0;
  const hasNativeBookmarks = Array.isArray(message.nativeBookmarks);
  const hasSelection =
    typeof message.selection === "object" &&
    message.selection !== null &&
    Array.isArray(
      (message.selection as { acceptedNativeIds?: unknown }).acceptedNativeIds
    );

  return hasValidSourceId && hasNativeBookmarks && hasSelection;
}
