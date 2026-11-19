/**
 * Side-effect service for copying a bookmark URL to the device clipboard
 * with a fallback for restricted Android WebView contexts.
 */

/**
 * Fallback copy helper using a temporary off-screen textarea when navigator.clipboard is unavailable.
 */
function copyWithFallbackTextarea(text: string): boolean {
  if (typeof document === "undefined") return false;

  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  textarea.style.pointerEvents = "none";

  document.body.appendChild(textarea);
  textarea.focus();
  textarea.select();

  try {
    return document.execCommand("copy");
  } finally {
    textarea.remove();
  }
}

/**
 * Copy a bookmark URL string to the system clipboard, throwing an error if copying fails.
 */
export async function copyBookmarkUrl(url: string): Promise<void> {
  if (
    typeof navigator !== "undefined" &&
    navigator.clipboard &&
    typeof navigator.clipboard.writeText === "function"
  ) {
    try {
      await navigator.clipboard.writeText(url);
      return;
    } catch {
      // Fall through to legacy textarea copy if WebView blocks async clipboard writes.
    }
  }

  const copied = copyWithFallbackTextarea(url);
  if (!copied) {
    throw new Error("Failed to copy link to clipboard.");
  }
}
