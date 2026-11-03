
import { detectBrowser } from "../browser/browser-info";

import { bookmarkRepository } from "./bookmark-repository";
import { normalizeBookmarkUrl } from "./bookmark-normalizer";

export async function runBookmarkRepositoryTest() {
  console.log("Starting Timber repository tests...");

  const browserKind = await detectBrowser();

  const state = await bookmarkRepository.initialize(browserKind);

  const source = state.sources[0];

  if (!source) {
    throw new Error("No browser source found.");
  }

  const testId = crypto.randomUUID();

  const firstNativeId = `test-${testId}-1`;
  const secondNativeId = `test-${testId}-2`;

  let testPageId: string | undefined;

  try {
    // Test 1: Add a bookmark.
    const github = await bookmarkRepository.upsertNativeBookmark({
      sourceId: source.id,
      nativeBookmarkId: firstNativeId,
      url: "https://github.com",
      title: "GitHub",
    });

    // Test 2: Add the same URL with a different native ID.
    const duplicate = await bookmarkRepository.upsertNativeBookmark({
      sourceId: source.id,
      nativeBookmarkId: secondNativeId,
      url: "https://GITHUB.com/",
      title: "GitHub Duplicate",
    });

    if (github.id !== duplicate.id) {
      throw new Error("Deduplication failed!");
    }

    console.log("PASS: Bookmark deduplication");

    // Test 3: Verify only one canonical record exists.
    const allBookmarks =
      await bookmarkRepository.getAllBookmarks();

    const matchingBookmarks = allBookmarks.filter(
      (item) =>
        item.normalizedUrl ===
        normalizeBookmarkUrl("https://github.com")
    );

    if (matchingBookmarks.length !== 1) {
      throw new Error("Duplicate canonical records found!");
    }

    console.log("PASS: Unique bookmark catalog");

    // Test 4: Create a custom page.
    const page = await bookmarkRepository.createPage(
      "Timber Test"
    );

    testPageId = page.id;

    // Test 5: Add bookmark to the page.
    await bookmarkRepository.addBookmarkToPage(
      page.id,
      github.id
    );

    const pageBookmarks =
      await bookmarkRepository.getBookmarksForPage(page.id);

    if (!pageBookmarks.some((item) => item.id === github.id)) {
      throw new Error("Custom page bookmark reference failed!");
    }

    console.log("PASS: Custom page references");

    // Test 6: Remove one native occurrence.
    await bookmarkRepository.removeNativeBookmark(
      source.id,
      firstNativeId
    );

    const remainingSources =
      await bookmarkRepository.getBookmarkSources(github.id);

    if (remainingSources.length !== 1) {
      throw new Error("Native bookmark removal failed!");
    }

    console.log("PASS: Native bookmark association");

    console.log("All Timber repository tests passed!");

    return true;
  } finally {
    // Clean up test data.
    if (testPageId) {
      await bookmarkRepository.deletePage(testPageId);
    }

    await bookmarkRepository.removeNativeBookmark(
      source.id,
      firstNativeId
    );

    await bookmarkRepository.removeNativeBookmark(
      source.id,
      secondNativeId
    );
  }
}
