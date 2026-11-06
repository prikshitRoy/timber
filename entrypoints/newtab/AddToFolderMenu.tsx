import { useState } from "react";
import type { BookmarkPage } from "../../src/shared/types/timber";

const NEW_FOLDER_VALUE = "__new__";

interface AddToFolderMenuProps {
    bookmarkId: string;
    folders: BookmarkPage[];
    onAdd: (bookmarkId: string, folderId: string) => void;
    onCreateAndAdd: (bookmarkId: string, name: string) => void;
}

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