/**
 * Touch-friendly bookmark link card displaying favicon, title, URL,
 * default browser launch button, installed browser picker trigger, and quick copy button.
 */

import type { Bookmark } from "@timber/core";
import BookmarkFavicon from "./BookmarkFavicon";

interface BookmarkRowProps {
  bookmark: Bookmark;
  defaultBrowserLabel: string;
  onOpenUrl: (url: string) => void;
  onChooseBrowser: (bookmark: Bookmark) => void;
  onCopyUrl: (url: string) => void;
  onOpenActions: (bookmark: Bookmark) => void;
}

/**
 * Render a bookmark card with two browser-open buttons (default browser & browser list), Copy, and a "⋮" actions button.
 */
export default function BookmarkRow({
  bookmark,
  defaultBrowserLabel,
  onOpenUrl,
  onChooseBrowser,
  onCopyUrl,
  onOpenActions,
}: BookmarkRowProps) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800/90 dark:bg-zinc-900/90 dark:shadow-none">
      <div className="flex items-center">
        <button
          type="button"
          onClick={() => onOpenUrl(bookmark.url)}
          className="flex min-w-0 flex-1 items-center gap-3 rounded-tl-xl py-3 pl-3.5 pr-1 text-left transition active:bg-zinc-100 dark:active:bg-zinc-800/80"
        >
          <BookmarkFavicon url={bookmark.url} title={bookmark.title} />

          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-zinc-900 dark:text-zinc-100">
              {bookmark.title}
            </p>
            <p className="truncate text-xs text-zinc-500 dark:text-zinc-400">
              {bookmark.url}
            </p>
          </div>
        </button>

        <button
          type="button"
          onClick={() => onOpenActions(bookmark)}
          aria-label={`More actions for ${bookmark.title}`}
          className="mr-1.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-base font-bold text-zinc-500 transition active:bg-zinc-100 active:text-zinc-900 dark:text-zinc-400 dark:active:bg-zinc-800 dark:active:text-zinc-100"
        >
          ⋮
        </button>
      </div>

      <div className="flex items-center gap-1.5 border-t border-zinc-100 px-3 py-2 dark:border-zinc-800/70">
        <button
          type="button"
          onClick={() => onOpenUrl(bookmark.url)}
          aria-label={`Open ${bookmark.title} in ${defaultBrowserLabel}`}
          className="flex min-w-0 flex-1 items-center justify-center gap-1.5 rounded-lg bg-teal-600/10 px-2.5 py-1.5 text-xs font-semibold text-teal-700 transition active:bg-teal-600/20 dark:bg-teal-500/15 dark:text-teal-300 dark:active:bg-teal-500/25"
        >
          <span className="truncate">{defaultBrowserLabel}</span>
          <span aria-hidden="true" className="shrink-0">
            ↗
          </span>
        </button>

        <button
          type="button"
          onClick={() => onChooseBrowser(bookmark)}
          aria-label={`Choose browser to open ${bookmark.title}`}
          className="flex shrink-0 items-center gap-1 rounded-lg border border-zinc-200 bg-zinc-50 px-2.5 py-1.5 text-xs font-medium text-zinc-700 transition active:bg-zinc-200 dark:border-zinc-800 dark:bg-zinc-950/70 dark:text-zinc-300 dark:active:bg-zinc-800"
        >
          <span>Open with</span>
          <span aria-hidden="true">▾</span>
        </button>

        <button
          type="button"
          onClick={() => onCopyUrl(bookmark.url)}
          aria-label={`Copy URL for ${bookmark.title}`}
          className="shrink-0 rounded-lg border border-zinc-200 bg-zinc-50 px-2.5 py-1.5 text-xs font-medium text-zinc-700 transition active:bg-zinc-200 active:text-zinc-950 dark:border-zinc-800 dark:bg-zinc-950/70 dark:text-zinc-300 dark:active:bg-zinc-800 dark:active:text-white"
        >
          Copy
        </button>
      </div>
    </div>
  );
}
