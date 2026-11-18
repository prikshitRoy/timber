/**
 * Touch-friendly bookmark link row displaying favicon, title, and URL for Android.
 */

import type { Bookmark } from "@timber/core";
import BookmarkFavicon from "./BookmarkFavicon";

interface BookmarkRowProps {
  bookmark: Bookmark;
  onOpenUrl: (url: string) => void;
}

/**
 * Render a tappable bookmark card row that opens the link in the device browser.
 */
export default function BookmarkRow({ bookmark, onOpenUrl }: BookmarkRowProps) {
  return (
    <button
      type="button"
      onClick={() => onOpenUrl(bookmark.url)}
      className="flex w-full items-center gap-3 rounded-xl border border-zinc-800/90 bg-zinc-900/90 px-3.5 py-3 text-left transition active:scale-[0.99] active:bg-zinc-800/80"
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
  );
}
