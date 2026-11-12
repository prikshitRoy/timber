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

  // Give the browser a moment to start the download first.
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function backupFileName(extension: "json" | "html"): string {
  // en-CA formats as YYYY-MM-DD in the user's local time zone.
  const date = new Date().toLocaleDateString("en-CA");
  const base = extension === "json" ? "timber-backup" : "timber-bookmarks";

  return `${base}-${date}.${extension}`;
}
