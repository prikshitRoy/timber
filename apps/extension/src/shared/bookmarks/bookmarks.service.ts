import { browser } from "wxt/browser";

export async function hasBookmarkPermission(): Promise<boolean> {
  return browser.permissions.contains({
    permissions: ["bookmarks"],
  });
}

export async function requestBookmarkPermission(): Promise<boolean> {
  return browser.permissions.request({
    permissions: ["bookmarks"],
  });
}

export async function getBookmarks() {
  const permitted = await hasBookmarkPermission();

  if (!permitted) {
    throw new Error("Bookmark permission not granted.");
  }

  return browser.bookmarks.getTree();
}