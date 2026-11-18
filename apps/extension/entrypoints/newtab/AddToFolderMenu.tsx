/**
 * Dropdown menu on a bookmark card that files the bookmark into an existing or newly created folder.
 */

import { useState } from "react";
import type { BookmarkPage } from "@timber/core";

// Sentinel option value that triggers a prompt to create a new folder before filing.
const NEW_FOLDER_VALUE = "__new__";

interface AddToFolderMenuProps {
    bookmarkId: string;
    folders: BookmarkPage[];
    onAdd: (bookmarkId: string, folderId: string) => void;
    onCreateAndAdd: (bookmarkId: string, name: string) => void;
}

/**
 * Render a `<select>` control for filing `bookmarkId` into a folder or creating a new folder on the fly.
 */
export default function AddToFolderMenu({
    bookmarkId,
    folders,
    onAdd,
    onCreateAndAdd,
}: AddToFolderMenuProps) {
    const [value, setValue] = useState("");

    function handleChange(event: React.ChangeEvent<HTMLSelectElement>) {
        const selected = event.target.value;
        setValue("");

        if (!selected) return;

        if (selected === NEW_FOLDER_VALUE) {
            const name = window.prompt("Folder name?");
            if (name && name.trim()) {
                onCreateAndAdd(bookmarkId, name.trim());
            }
            return;
        }

        onAdd(bookmarkId, selected);
    }

    return (
        <select
            className="add-to-folder-select"
            value={value}
            onChange={handleChange}
        >
            <option value="">Add to folder...</option>
            {folders.map((folder) => (
                <option key={folder.id} value={folder.id}>
                    {folder.name}
                </option>
            ))}
            <option value={NEW_FOLDER_VALUE}>+ New folder...</option>
        </select>
    );
}