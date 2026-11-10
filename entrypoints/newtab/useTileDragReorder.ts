import { useState } from "react";

interface DragHandlers {
    onDragStart: () => void;
    onDragOver: (event: React.DragEvent) => void;
    onDrop: (event: React.DragEvent) => void;
}

/**
 * Shared drag-and-drop-to-reorder logic, used by every level that
 * supports custom sort (root grid, and every folder's contents at
 * any nesting depth). `keys` is the current order of item keys at
 * this level; `onReorder` is called with the new full order once a
 * drag completes.
 */
export function useTileDragReorder(
    keys: string[],
    onReorder: (orderedKeys: string[]) => void
) {
    const [dragKey, setDragKey] = useState<string | null>(null);

    function handleDrop(overKey: string) {
        if (!dragKey || dragKey === overKey) {
            setDragKey(null);
            return;
        }

        const fromIndex = keys.indexOf(dragKey);
        const toIndex = keys.indexOf(overKey);

        setDragKey(null);

        if (fromIndex === -1 || toIndex === -1) return;

        const next = [...keys];
        next.splice(fromIndex, 1);
        next.splice(toIndex, 0, dragKey);

        onReorder(next);
    }

    function getDragHandlers(key: string): DragHandlers {
        return {
            onDragStart: () => setDragKey(key),
            onDragOver: (event) => {
                if (dragKey && dragKey !== key) event.preventDefault();
            },
            onDrop: (event) => {
                event.preventDefault();
                handleDrop(key);
            },
        };
    }

    return { getDragHandlers };
}
