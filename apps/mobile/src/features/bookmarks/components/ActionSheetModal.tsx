/**
 * Reusable mobile bottom-sheet action menu triggered by three-dot ("⋮") buttons
 * on bookmark cards and folder headers.
 */

export interface ActionSheetItem {
  label: string;
  description?: string;
  danger?: boolean;
  onSelect: () => void;
}

interface ActionSheetModalProps {
  title: string;
  subtitle?: string;
  actions: ActionSheetItem[];
  onClose: () => void;
}

/**
 * Render a touch-friendly bottom sheet listing contextual actions for an item.
 */
export default function ActionSheetModal({
  title,
  subtitle,
  actions,
  onClose,
}: ActionSheetModalProps) {
  if (actions.length === 0) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="action-sheet-title"
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm sm:items-center sm:p-4 dark:bg-black/75"
    >
      <div
        onClick={(event) => event.stopPropagation()}
        className="safe-area-bottom w-full max-w-md rounded-t-2xl border border-zinc-200 bg-white px-5 pt-5 text-zinc-900 shadow-2xl sm:rounded-2xl sm:pb-5 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100"
      >
        <div className="flex items-start justify-between gap-3 border-b border-zinc-200 pb-3 dark:border-zinc-800">
          <div className="min-w-0">
            <h2 id="action-sheet-title" className="truncate text-base font-semibold">
              {title}
            </h2>
            {subtitle && (
              <p className="mt-0.5 truncate text-xs text-zinc-500 dark:text-zinc-400">
                {subtitle}
              </p>
            )}
          </div>

          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-lg px-2.5 py-1 text-xs font-medium text-zinc-500 transition active:bg-zinc-100 active:text-zinc-900 dark:text-zinc-400 dark:active:bg-zinc-800 dark:active:text-zinc-100"
          >
            Close
          </button>
        </div>

        <div className="mt-3 flex flex-col gap-1.5">
          {actions.map((action) => (
            <button
              key={action.label}
              type="button"
              onClick={() => {
                onClose();
                action.onSelect();
              }}
              className={`flex w-full flex-col items-start rounded-xl border px-3.5 py-3 text-left transition ${
                action.danger
                  ? "border-red-500/25 bg-red-500/10 text-red-600 active:bg-red-500/20 dark:text-red-400"
                  : "border-zinc-200 bg-zinc-50/70 text-zinc-900 active:bg-zinc-200 dark:border-zinc-800 dark:bg-zinc-950/60 dark:text-zinc-100 dark:active:bg-zinc-800"
              }`}
            >
              <span className="text-sm font-semibold">{action.label}</span>
              {action.description && (
                <span className="mt-0.5 text-xs font-normal text-zinc-500 dark:text-zinc-400">
                  {action.description}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
