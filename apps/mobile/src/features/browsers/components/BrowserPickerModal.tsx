/**
 * Mobile bottom-sheet modal allowing the user to open a bookmark in their default browser
 * or select any browser installed on the device.
 */

import { useState } from "react";
import type { Bookmark } from "@timber/core";
import type { InstalledBrowser } from "../types";

interface BrowserPickerModalProps {
  bookmark: Bookmark;
  browsers: InstalledBrowser[];
  isBridgeAvailable: boolean;
  effectiveDefaultBrowser: InstalledBrowser | null;
  defaultBrowserLabel: string;
  hasCustomDefault: boolean;
  onOpenInDefault: (url: string) => void;
  onSelectBrowser: (
    url: string,
    browser: InstalledBrowser,
    shouldSetAsDefault: boolean
  ) => void;
  onClose: () => void;
}

/**
 * Render the two-part browser selector sheet: Default Browser shortcut + installed browsers list.
 */
export default function BrowserPickerModal({
  bookmark,
  browsers,
  isBridgeAvailable,
  effectiveDefaultBrowser,
  defaultBrowserLabel,
  hasCustomDefault,
  onOpenInDefault,
  onSelectBrowser,
  onClose,
}: BrowserPickerModalProps) {
  const [shouldSetAsDefault, setShouldSetAsDefault] = useState(false);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="browser-picker-title"
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm sm:items-center sm:p-4 dark:bg-black/75"
    >
      <div
        onClick={(event) => event.stopPropagation()}
        className="safe-area-bottom flex max-h-[82vh] w-full max-w-md flex-col rounded-t-2xl border border-zinc-200 bg-white px-5 pt-5 text-zinc-900 shadow-2xl sm:rounded-2xl sm:pb-5 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100"
      >
        <div className="flex items-start justify-between gap-3 border-b border-zinc-200 pb-3 dark:border-zinc-800">
          <div className="min-w-0">
            <h2 id="browser-picker-title" className="text-base font-semibold">
              Open link with
            </h2>
            <p className="mt-0.5 truncate text-xs text-zinc-500 dark:text-zinc-400">
              {bookmark.title}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-lg px-2.5 py-1 text-xs font-medium text-zinc-500 transition active:bg-zinc-100 active:text-zinc-900 dark:text-zinc-400 dark:active:bg-zinc-800 dark:active:text-zinc-100"
          >
            Close
          </button>
        </div>

        {/* Quick Default Browser button */}
        <div className="mt-4">
          <button
            type="button"
            onClick={() => {
              onClose();
              onOpenInDefault(bookmark.url);
            }}
            className="flex w-full items-center justify-between gap-3 rounded-xl bg-teal-600 px-4 py-3 text-left text-white transition active:bg-teal-700"
          >
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">
                {defaultBrowserLabel}
              </p>
              <p className="text-xs text-teal-100">
                {hasCustomDefault
                  ? "Your chosen default browser"
                  : "Mobile default browser"}
              </p>
            </div>
            <span aria-hidden="true" className="shrink-0 text-sm font-semibold">
              ↗
            </span>
          </button>
        </div>

        {/* Installed browsers list */}
        <div className="mt-4 flex min-h-0 flex-1 flex-col">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
            Installed Browsers
          </h3>

          {!isBridgeAvailable ? (
            <p className="mt-2 rounded-xl border border-zinc-200 bg-zinc-50 px-3.5 py-3 text-xs text-zinc-500 dark:border-zinc-800 dark:bg-zinc-950/60 dark:text-zinc-400">
              Selecting a specific browser is available when running on Android.
            </p>
          ) : browsers.length === 0 ? (
            <p className="mt-2 rounded-xl border border-zinc-200 bg-zinc-50 px-3.5 py-3 text-xs text-zinc-500 dark:border-zinc-800 dark:bg-zinc-950/60 dark:text-zinc-400">
              No browsers were found on this device.
            </p>
          ) : (
            <>
              <div className="mt-2 flex flex-col gap-1.5 overflow-y-auto pr-0.5">
                {browsers.map((browser) => {
                  const isActiveDefault =
                    effectiveDefaultBrowser?.packageName === browser.packageName;

                  return (
                    <button
                      key={browser.packageName}
                      type="button"
                      onClick={() => {
                        onClose();
                        onSelectBrowser(
                          bookmark.url,
                          browser,
                          shouldSetAsDefault
                        );
                      }}
                      className="flex w-full items-center justify-between gap-3 rounded-xl border border-zinc-200 bg-zinc-50/70 px-3.5 py-2.5 text-left transition active:bg-zinc-200 dark:border-zinc-800 dark:bg-zinc-950/60 dark:active:bg-zinc-800"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-zinc-900 dark:text-zinc-100">
                          {browser.label}
                        </p>
                        <p className="truncate text-[11px] text-zinc-500 dark:text-zinc-400">
                          {browser.packageName}
                        </p>
                      </div>

                      <div className="flex shrink-0 items-center gap-1.5">
                        {isActiveDefault && (
                          <span className="rounded-full bg-teal-500/15 px-2 py-0.5 text-[10px] font-semibold text-teal-700 dark:text-teal-300">
                            Default
                          </span>
                        )}
                        <span
                          aria-hidden="true"
                          className="text-xs text-zinc-400 dark:text-zinc-500"
                        >
                          ↗
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>

              <label className="mt-3 flex items-center gap-2 border-t border-zinc-200 pt-3 text-xs text-zinc-600 dark:border-zinc-800 dark:text-zinc-300">
                <input
                  type="checkbox"
                  checked={shouldSetAsDefault}
                  onChange={(event) =>
                    setShouldSetAsDefault(event.target.checked)
                  }
                  className="h-4 w-4 rounded border-zinc-300 accent-teal-600"
                />
                <span>Also set selected browser as my default</span>
              </label>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
