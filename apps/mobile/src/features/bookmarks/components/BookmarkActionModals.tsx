/**
 * Coordinator rendering the bookmark "⋮" ActionSheetModal and its follow-up modals
 * (Edit, Add to Folder, Duplicate Delete, or Single Delete confirmation).
 */

import { useState } from "react";
import {
  countBookmarkInstances,
  type Bookmark,
  type BookmarkInstanceTarget,
  type BookmarkPage,
} from "@timber/core";
import type { BookmarkActionLocation } from "../state/bookmark-item-mutations";
import ActionSheetModal, { type ActionSheetItem } from "./ActionSheetModal";
import AddToFolderModal from "./AddToFolderModal";
import ConfirmDialog from "./ConfirmDialog";
import DeleteBookmarkModal from "./DeleteBookmarkModal";
import EditBookmarkModal from "./EditBookmarkModal";

export interface BookmarkActionMenuTarget {
  bookmark: Bookmark;
  location: BookmarkActionLocation;
}

type ActiveSubModal =
  | { kind: "edit"; bookmark: Bookmark }
  | { kind: "addToFolder"; bookmark: Bookmark }
  | {
      kind: "deleteDuplicate";
      bookmark: Bookmark;
      target: BookmarkInstanceTarget;
      instanceCount: number;
    }
  | { kind: "deleteSingle"; bookmark: Bookmark; instanceCount: number };

interface BookmarkActionModalsProps {
  menuTarget: BookmarkActionMenuTarget | null;
  folders: BookmarkPage[];
  rootBookmarkIds: string[];
  onCloseMenu: () => void;
  onEditBookmark: (bookmarkId: string, title: string, url: string) => boolean;
  onAddBookmarkToFolder: (
    bookmarkId: string,
    folderId?: string,
    newFolderName?: string
  ) => boolean;
  onRemoveBookmarkFromFolder: (folderId: string, bookmarkId: string) => boolean;
  onDeleteBookmarkInstance: (
    bookmarkId: string,
    target: BookmarkInstanceTarget
  ) => boolean;
  onDeleteBookmarkAll: (bookmarkId: string) => boolean;
  onCopyUrl: (url: string) => void;
}

/**
 * Render the active bookmark action sheet or follow-up modal dialog.
 */
export default function BookmarkActionModals({
  menuTarget,
  folders,
  rootBookmarkIds,
  onCloseMenu,
  onEditBookmark,
  onAddBookmarkToFolder,
  onRemoveBookmarkFromFolder,
  onDeleteBookmarkInstance,
  onDeleteBookmarkAll,
  onCopyUrl,
}: BookmarkActionModalsProps) {
  const [subModal, setSubModal] = useState<ActiveSubModal | null>(null);

  function handleRequestDelete(
    bookmark: Bookmark,
    location: BookmarkActionLocation
  ) {
    const instanceCount = countBookmarkInstances(
      bookmark.id,
      folders,
      rootBookmarkIds
    );

    // Search results don't correspond to one specific folder/root tile, so confirm deleting all copies.
    if (instanceCount > 1 && location.kind !== "search") {
      const target: BookmarkInstanceTarget =
        location.kind === "folder"
          ? { kind: "folder", folderId: location.folderId }
          : { kind: "root" };

      setSubModal({
        kind: "deleteDuplicate",
        bookmark,
        target,
        instanceCount,
      });
      return;
    }

    setSubModal({ kind: "deleteSingle", bookmark, instanceCount });
  }

  function buildActions(target: BookmarkActionMenuTarget): ActionSheetItem[] {
    const { bookmark, location } = target;
    const actions: ActionSheetItem[] = [
      {
        label: "Edit",
        onSelect: () => setSubModal({ kind: "edit", bookmark }),
      },
      {
        label: "Add to folder",
        onSelect: () => setSubModal({ kind: "addToFolder", bookmark }),
      },
      {
        label: "Copy link",
        onSelect: () => onCopyUrl(bookmark.url),
      },
    ];

    if (location.kind === "folder") {
      actions.push({
        label: `Remove from "${location.folderName}"`,
        description: "Removes from this folder without deleting the bookmark.",
        onSelect: () =>
          onRemoveBookmarkFromFolder(location.folderId, bookmark.id),
      });
    }

    actions.push({
      label: "Delete",
      danger: true,
      onSelect: () => handleRequestDelete(bookmark, location),
    });

    return actions;
  }

  return (
    <>
      {menuTarget && (
        <ActionSheetModal
          title={menuTarget.bookmark.title}
          subtitle={menuTarget.bookmark.url}
          actions={buildActions(menuTarget)}
          onClose={onCloseMenu}
        />
      )}

      {subModal?.kind === "edit" && (
        <EditBookmarkModal
          bookmark={subModal.bookmark}
          onSave={onEditBookmark}
          onClose={() => setSubModal(null)}
        />
      )}

      {subModal?.kind === "addToFolder" && (
        <AddToFolderModal
          bookmark={subModal.bookmark}
          folders={folders}
          onAddToFolder={onAddBookmarkToFolder}
          onClose={() => setSubModal(null)}
        />
      )}

      {subModal?.kind === "deleteDuplicate" && (
        <DeleteBookmarkModal
          title={subModal.bookmark.title}
          instanceCount={subModal.instanceCount}
          onDeleteOnlyThisInstance={() => {
            onDeleteBookmarkInstance(subModal.bookmark.id, subModal.target);
            setSubModal(null);
          }}
          onDeleteAllDuplicates={() => {
            onDeleteBookmarkAll(subModal.bookmark.id);
            setSubModal(null);
          }}
          onCancel={() => setSubModal(null)}
        />
      )}

      {subModal?.kind === "deleteSingle" && (
        <ConfirmDialog
          title="Delete link?"
          description={
            subModal.instanceCount > 1
              ? `Remove "${subModal.bookmark.title}" from all ${subModal.instanceCount} places in Timber? This can't be undone.`
              : `Remove "${subModal.bookmark.title}" from Timber? This can't be undone.`
          }
          confirmLabel="Delete"
          isDanger
          onConfirm={() => {
            onDeleteBookmarkAll(subModal.bookmark.id);
            setSubModal(null);
          }}
          onCancel={() => setSubModal(null)}
        />
      )}
    </>
  );
}
