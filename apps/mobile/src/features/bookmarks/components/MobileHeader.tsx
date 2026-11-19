/**
 * Compact sticky top header for the Android app displaying the brand title,
 * bookmark/folder count, Settings trigger, and search input.
 */

interface MobileHeaderProps {
  bookmarkCount: number;
  folderCount: number;
  query: string;
  onQueryChange: (value: string) => void;
  onOpenSettings: () => void;
}

/**
 * Render the decluttered sticky mobile header bar and search input.
 */
export default function MobileHeader({
  bookmarkCount,
  folderCount,
  query,
  onQueryChange,
  onOpenSettings,
}: MobileHeaderProps) {
  return (
    <header className="safe-header-top sticky top-0 z-20 border-b border-zinc-200 bg-zinc-50/95 px-4 pb-3 backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/95">
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <span
            aria-hidden="true"
            className="h-2.5 w-2.5 shrink-0 rounded-full bg-teal-500 ring-4 ring-teal-500/20"
          />
          <h1 className="text-lg font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
            Timber
          </h1>
          <span className="truncate rounded-full bg-zinc-200/80 px-2.5 py-0.5 text-xs font-medium text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
            {bookmarkCount} links · {folderCount} folders
          </span>
        </div>

        <button
          type="button"
          onClick={onOpenSettings}
          aria-label="Open settings and import options"
          className="shrink-0 rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-800 transition active:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:active:bg-zinc-800"
        >
          Settings
        </button>
      </div>

      <div className="relative mt-2.5">
        <input
          type="text"
          role="searchbox"
          inputMode="search"
          enterKeyHint="search"
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          placeholder="Search bookmarks by title or URL..."
          className="w-full rounded-xl border border-zinc-300 bg-white py-2.5 pl-3.5 pr-10 text-sm text-zinc-900 placeholder-zinc-400 outline-none focus:border-teal-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder-zinc-500"
        />

        {query.length > 0 && (
          <button
            type="button"
            onClick={() => onQueryChange("")}
            aria-label="Clear search"
            className="absolute right-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-lg text-xs text-zinc-500 transition active:bg-zinc-200 active:text-zinc-900 dark:text-zinc-400 dark:active:bg-zinc-800 dark:active:text-zinc-100"
          >
            ✕
          </button>
        )}
      </div>
    </header>
  );
}
