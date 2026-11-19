/**
 * Touch-friendly bookmark link row displaying favicon, title, URL,
 * external browser launch trigger, and quick clipboard copy button.
 */

import type { Bookmark } from "@timber/core";
import BookmarkFavicon from "./BookmarkFavicon";

interface BookmarkRowProps {
  bookmark: Bookmark;
  onOpenUrl: (url: string) => void;
  onCopyUrl: (url: string) => void;
}

/**
 * Render a bookmark card row with tap-to-open and quick copy-URL actions.
 */
export default function BookmarkRow({
  bookmark,
  onOpenUrl,
  onCopyUrl,
}: BookmarkRowProps) {
  return (
    <div className="flex w-full items-center gap-1 rounded-xl border border-zinc-800/90 bg-zinc-900/90 pr-2">
      <button
        type="button"
        onClick={() => onOpenUrl(bookmark.url)}
        className="flex min-w-0 flex-1 items-center gap-3 rounded-l-xl px-3.5 py-3 text-left transition active:bg-zinc-800/80"
      >
        <BookmarkFavicon url={bookmark.url} title={bookmark.title} />

        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-zinc-100">
            {bookmark.title}
          </p>
          <p className="truncate text-xs text-zinc-400">{bookmark.url}</p>
        </div>

        <span aria-hidden="true" className="shrink-0 text-xs text-zinc-500">
          ↗
        </span>
      </button>

      <button
        type="button"
        onClick={() => onCopyUrl(bookmark.url)}
        aria-label={`Copy URL for ${bookmark.title}`}
        className="shrink-0 rounded-lg border border-zinc-800 bg-zinc-950/70 px-2.5 py-1.5 text-xs font-medium text-zinc-300 transition active:bg-zinc-800 active:text-white"
      >
        Copy
      </button>
    </div>
  );
}
