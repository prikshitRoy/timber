/**
 * React hook providing action handlers for bookmark CRUD, folder management,
 * drag-and-drop ordering, and clipboard copying on the New Tab dashboard.
 */

import { bookmarkRepository } from "../../../src/shared/bookmarks/bookmark-repository";

interface UseBookmarkAndFolderActionsParams {
  loadCatalog: () => Promise<void>;
  setStatus: (status: string) => void;
  setError: (error: string) => void;
}

/**
 * Create dashboard handlers for mutating bookmarks, folders, tile orders, and clipboard links.
 */
export function useBookmarkAndFolderActions({
  loadCatalog,
  setStatus,
  setError,
}: UseBookmarkAndFolderActionsParams) {
  /**
   * Confirm with the user and delete a single bookmark from Timber.
   */
  async function handleDeleteBookmark(bookmarkId: string, title: string) {
    const isConfirmed = window.confirm(
      `Remove "${title}" from Timber? It stays in your browser bookmarks, and will show up again next time you scan.`
    );
    if (!isConfirmed) return;

    try {
      await bookmarkRepository.deleteBookmark(bookmarkId);
      await loadCatalog();
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "Failed to delete bookmark."
      );
    }
  }

  /**
   * Prompt for a name and create a new top-level custom folder.
   */
  async function handleCreateFolder() {
    const name = window.prompt("Folder name?");
    if (!name || !name.trim()) return;

    try {
      await bookmarkRepository.createPage(name.trim());
      await loadCatalog();
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "Failed to create folder."
      );
    }
  }

  /**
   * Prompt for a name and create a nested sub-folder inside `parentId`.
   */
  async function handleAddSubFolder(parentId: string) {
    const name = window.prompt("Folder name?");
    if (!name || !name.trim()) return;

    try {
      await bookmarkRepository.createPage(name.trim(), parentId);
      await loadCatalog();
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "Failed to create folder."
      );
    }
  }

  /**
   * Prompt for a new name and rename an existing custom folder.
   */
  async function handleRenameFolder(pageId: string, currentName: string) {
    const name = window.prompt("Rename folder", currentName);
    if (!name || !name.trim() || name.trim() === currentName) return;

    try {
      await bookmarkRepository.renamePage(pageId, name.trim());
      await loadCatalog();
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "Failed to rename folder."
      );
    }
  }

  /**
   * Confirm with the user and delete a folder along with all nested bookmarks and sub-folders.
   */
  async function handleDeleteFolder(folderId: string, name: string) {
    const isConfirmed = window.confirm(
      `Delete folder "${name}"? This also deletes every bookmark and sub-folder inside it. They stay in your browser bookmarks if they came from there, and will show up again next time you scan.`
    );
    if (!isConfirmed) return;

    try {
      await bookmarkRepository.deletePage(folderId);
      await loadCatalog();
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "Failed to delete folder."
      );
    }
  }

  /**
   * Add an existing bookmark to a custom folder.
   */
  async function handleAddBookmarkToFolder(
    bookmarkId: string,
    folderId: string
  ) {
    try {
      await bookmarkRepository.addBookmarkToPage(folderId, bookmarkId);
      await loadCatalog();
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Failed to add bookmark to folder."
      );
    }
  }

  /**
   * Create a new top-level folder and immediately file `bookmarkId` inside it.
   */
  async function handleCreateFolderAndAdd(bookmarkId: string, name: string) {
    try {
      const page = await bookmarkRepository.createPage(name);
      await bookmarkRepository.addBookmarkToPage(page.id, bookmarkId);
      await loadCatalog();
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "Failed to create folder."
      );
    }
  }

  /**
   * Remove a bookmark from a folder without deleting the bookmark from Timber.
   */
  async function handleRemoveBookmarkFromFolder(
    folderId: string,
    bookmarkId: string
  ) {
    try {
      await bookmarkRepository.removeBookmarkFromPage(folderId, bookmarkId);
      await loadCatalog();
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Failed to remove bookmark from folder."
      );
    }
  }

  /**
   * Save custom ordering for tiles on the root dashboard grid.
   */
  async function handleReorderRoot(order: string[]) {
    try {
      await bookmarkRepository.setRootOrder(order);
      await loadCatalog();
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "Failed to save order."
      );
    }
  }

  /**
   * Save custom ordering for direct children inside a folder.
   */
  async function handleReorderFolderChildren(
    folderId: string,
    order: string[]
  ) {
    try {
      await bookmarkRepository.setFolderChildOrder(folderId, order);
      await loadCatalog();
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "Failed to save folder order."
      );
    }
  }

  /**
   * Create a manual link and place it either into `targetFolderId` or onto the root grid.
   */
  async function handleCreateLink(
    url: string,
    title: string,
    targetFolderId: string | null
  ) {
    try {
      const bookmark = await bookmarkRepository.createManualLink(url, title);

      if (targetFolderId) {
        await bookmarkRepository.addBookmarkToPage(targetFolderId, bookmark.id);
      } else {
        await bookmarkRepository.addBookmarkToRoot(bookmark.id);
      }

      await loadCatalog();
    } catch (error) {
      setError(error instanceof Error ? error.message : "Failed to add link.");
    }
  }

  /**
   * Save title and URL changes for a single bookmark.
   */
  async function handleSaveBookmarkEdit(
    bookmarkId: string,
    title: string,
    url: string
  ) {
    try {
      await bookmarkRepository.updateBookmark(bookmarkId, { title, url });
      await loadCatalog();
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "Failed to update link."
      );
    }
  }

  /**
   * Copy a single bookmark URL to the system clipboard.
   */
  async function handleCopyBookmarkLink(url: string) {
    try {
      await navigator.clipboard.writeText(url);
      setStatus("Link copied to clipboard.");
    } catch {
      setError("Failed to copy link.");
    }
  }

  /**
   * Delete selected bookmarks from a folder and optionally delete the folder itself.
   */
  async function handleDeleteFolderLinks(
    folderId: string,
    bookmarkIds: string[],
    alsoDeleteFolder: boolean,
    onFolderDeleted: () => void
  ) {
    try {
      await bookmarkRepository.deleteBookmarks(bookmarkIds);

      if (alsoDeleteFolder) {
        await bookmarkRepository.deletePage(folderId);
        onFolderDeleted();
      }

      await loadCatalog();
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "Failed to delete links."
      );
    }
  }

  /**
   * Copy multiple newline-separated URLs to the system clipboard.
   */
  async function handleCopyFolderLinks(urls: string[]) {
    try {
      await navigator.clipboard.writeText(urls.join("\n"));
      setStatus(
        `${urls.length} link${urls.length === 1 ? "" : "s"} copied to clipboard.`
      );
    } catch {
      setError("Failed to copy links.");
    }
  }

  /**
   * Save bulk title and URL edits made in EditFolderLinksModal.
   */
  async function handleSaveFolderLinkEdits(
    updates: { id: string; title: string; url: string }[]
  ) {
    try {
      await bookmarkRepository.updateBookmarks(updates);
      await loadCatalog();
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "Failed to save link edits."
      );
    }
  }

  return {
    handleDeleteBookmark,
    handleCreateFolder,
    handleAddSubFolder,
    handleRenameFolder,
    handleDeleteFolder,
    handleAddBookmarkToFolder,
    handleCreateFolderAndAdd,
    handleRemoveBookmarkFromFolder,
    handleReorderRoot,
    handleReorderFolderChildren,
    handleCreateLink,
    handleSaveBookmarkEdit,
    handleCopyBookmarkLink,
    handleDeleteFolderLinks,
    handleCopyFolderLinks,
    handleSaveFolderLinkEdits,
  };
}
