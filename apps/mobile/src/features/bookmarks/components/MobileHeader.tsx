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
    <header className="safe-header-top sticky top-0 z-20 border-b border-zinc-800 bg-zinc-950/95 px-4 pb-3 backdrop-blur">
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <span
            aria-hidden="true"
            className="h-2.5 w-2.5 shrink-0 rounded-full bg-teal-500 ring-4 ring-teal-500/20"
          />
          <h1 className="text-lg font-bold tracking-tight text-zinc-100">
            Timber
          </h1>
          <span className="truncate rounded-full bg-zinc-800 px-2.5 py-0.5 text-xs font-medium text-zinc-300">
            {bookmarkCount} links · {folderCount} folders
          </span>
        </div>

        <button
          type="button"
          onClick={onOpenSettings}
          aria-label="Open settings and import options"
          className="shrink-0 rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-xs font-semibold text-zinc-100 transition active:bg-zinc-800"
        >
          Settings
        </button>
      </div>

      <div className="mt-2.5">
        <input
          type="search"
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          placeholder="Search bookmarks by title or URL..."
          className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3.5 py-2.5 text-sm text-zinc-100 placeholder-zinc-500 outline-none focus:border-teal-500"
        />
      </div>
    </header>
  );
}
