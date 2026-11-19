/**
 * Collapsible folder card that recursively renders nested sub-folders and ordered bookmark rows.
 */

import { useMemo, useState } from "react";
import {
  getOrderedFolderChildren,
  type Bookmark,
  type BookmarkPage,
} from "@timber/core";
import BookmarkRow from "./BookmarkRow";

interface FolderItemProps {
  folder: BookmarkPage;
  allFolders: BookmarkPage[];
  bookmarksById: Map<string, Bookmark>;
  onOpenUrl: (url: string) => void;
  onCopyUrl: (url: string) => void;
}

/**
 * Render a folder header with item count badge and its expandable nested contents.
 */
export default function FolderItem({
  folder,
  allFolders,
  bookmarksById,
  onOpenUrl,
  onCopyUrl,
}: FolderItemProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const orderedChildren = useMemo(
    () => getOrderedFolderChildren(folder, allFolders, bookmarksById),
    [folder, allFolders, bookmarksById]
  );

return (
    <div className="rounded-xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900/60 dark:shadow-none">
      <button
        type="button"
        onClick={() => setIsExpanded((prev) => !prev)}
        aria-expanded={isExpanded}
        className="flex w-full items-center justify-between gap-3 px-3.5 py-3 text-left transition active:bg-zinc-100 dark:active:bg-zinc-800/60"
      >
        <div className="flex min-w-0 items-center gap-2.5">
          <span
            aria-hidden="true"
            className="w-3.5 shrink-0 text-xs text-zinc-500 dark:text-zinc-400"
          >
            {isExpanded ? "▾" : "▸"}
          </span>
          <span aria-hidden="true" className="shrink-0 text-base">
            📁
          </span>
          <span className="truncate text-sm font-semibold text-zinc-900 dark:text-zinc-100">
            {folder.name}
          </span>
        </div>

        <span className="shrink-0 rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs font-semibold text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
          {orderedChildren.length}
        </span>
      </button>

      {isExpanded && (
        <div className="flex flex-col gap-2 border-t border-zinc-200 bg-zinc-50/80 p-2.5 pl-4 dark:border-zinc-800/80 dark:bg-zinc-950/50">
          {orderedChildren.length === 0 ? (
            <p className="py-2 text-xs text-zinc-500">
              No bookmarks or sub-folders inside this folder.
            </p>
          ) : (
            orderedChildren.map((child) =>
              child.kind === "folder" ? (
                <FolderItem
                  key={child.key}
                  folder={child.folder}
                  allFolders={allFolders}
                  bookmarksById={bookmarksById}
                  onOpenUrl={onOpenUrl}
                  onCopyUrl={onCopyUrl}
                />
              ) : (
                <BookmarkRow
                  key={child.key}
                  bookmark={child.bookmark}
                  onOpenUrl={onOpenUrl}
                  onCopyUrl={onCopyUrl}
                />
              )
            )
          )}
        </div>
      )}
    </div>
  );
}
