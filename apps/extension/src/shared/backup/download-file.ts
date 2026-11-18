/**
 * Browser file-download side-effect helpers and backup filename formatting.
 */

// Delay in milliseconds before revoking a temporary Blob object URL after triggering a download.
const REVOKE_URL_DELAY_MS = 1000;

/**
 * Trigger a browser file download for a UTF-8 text payload with the specified filename and MIME type.
 */
export function downloadTextFile(
  filename: string,
  content: string,
  mimeType: string
): void {
  const blob = new Blob([content], { type: `${mimeType};charset=utf-8` });
  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = url;
  link.download = filename;

  document.body.appendChild(link);
  link.click();
  link.remove();

  // Wait briefly before revoking the object URL so the browser can start the download.
  setTimeout(() => URL.revokeObjectURL(url), REVOKE_URL_DELAY_MS);
}

/**
 * Build a date-stamped filename (YYYY-MM-DD in local time) for a JSON backup or HTML bookmark export.
 */
export function backupFileName(extension: "json" | "html"): string {
  // The "en-CA" locale formats dates as ISO-style YYYY-MM-DD in the user's local time zone.
  const date = new Date().toLocaleDateString("en-CA");
  const base = extension === "json" ? "timber-backup" : "timber-bookmarks";

  return `${base}-${date}.${extension}`;
}
