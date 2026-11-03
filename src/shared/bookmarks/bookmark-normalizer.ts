
// This determines whether two bookmark URLs should be considered identical
export function normalizeBookmarkUrl(url: string): string {
  try {
    const parsed = new URL(url.trim());

    // Only accept web URLs for now.
    if (!["http:", "https:"].includes(parsed.protocol)) {
      throw new Error("Unsupported bookmark protocol");
    }

    return parsed.href;
  } catch {
    throw new Error(`Invalid bookmark URL: ${url}`);
  }
}
