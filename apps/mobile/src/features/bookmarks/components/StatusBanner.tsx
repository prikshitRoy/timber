/**
 * Dismissible feedback banners for transient status notifications and error messages.
 */

interface StatusBannerProps {
  status: string;
  error: string;
  onDismissStatus: () => void;
  onDismissError: () => void;
}

/**
 * Render tappable status and error banners that clear when tapped.
 */
export default function StatusBanner({
  status,
  error,
  onDismissStatus,
  onDismissError,
}: StatusBannerProps) {
  if (!status && !error) return null;

  return (
    <div className="mb-3 flex flex-col gap-1.5">
      {status && (
        <button
          type="button"
          role="status"
          onClick={onDismissStatus}
          aria-label="Dismiss status message"
          className="flex w-full items-center justify-between gap-2 rounded-lg border border-teal-500/30 bg-teal-500/10 px-3 py-2 text-left text-xs text-teal-300 transition active:bg-teal-500/20"
        >
          <span>{status}</span>
          <span aria-hidden="true" className="shrink-0 text-teal-400/80">
            ✕
          </span>
        </button>
      )}

      {error && (
        <button
          type="button"
          role="alert"
          onClick={onDismissError}
          aria-label="Dismiss error message"
          className="flex w-full items-center justify-between gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-left text-xs text-red-300 transition active:bg-red-500/20"
        >
          <span>{error}</span>
          <span aria-hidden="true" className="shrink-0 text-red-400/80">
            ✕
          </span>
        </button>
      )}
    </div>
  );
}
