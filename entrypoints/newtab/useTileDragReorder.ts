import { useState } from "react";

interface DragHandlers {
    onDragStart: () => void;
    onDragOver: (event: React.DragEvent) => void;
    onDragLeave: () => void;
    onDrop: (event: React.DragEvent) => void;
    onDragEnd: () => void;
    isDragging: boolean;
    isDropTarget: boolean;
}

/**
 * Shared drag-and-drop-to-reorder logic, used by every level that
 * supports custom sort (root grid, and every folder's contents at
 * any nesting depth).
 *
 * The dragged tile's own position is never moved mid-drag — only a
 * drop-target highlight is shown on whatever tile you're currently
 * hovering over. Moving the actively-dragged element's DOM node
 * during dragover is a well-known way to make browsers silently
 * cancel the native drag (no "drop" event ever fires), so the real
 * reorder is computed once, from the original order, only at the
 * moment of an actual drop.
 */
export function useTileDragReorder<T>(
    items: T[],
    getKey: (item: T) => string,
    onReorder: (orderedKeys: string[]) => void | Promise<void>
) {
    const [dragKey, setDragKey] = useState<string | null>(null);
    const [hoverKey, setHoverKey] = useState<string | null>(null);

    function handleDragStart(key: string) {
        setDragKey(key);
        setHoverKey(null);
    }

    function handleDragOver(key: string) {
        if (!dragKey || dragKey === key) return;
        setHoverKey(key);
    }

    function handleDragLeave(key: string) {
        setHoverKey((current) => (current === key ? null : current));
    }

    function finishDrag() {
        setDragKey(null);
        setHoverKey(null);
    }

    function handleDrop(targetKey: string) {
        if (!dragKey || dragKey === targetKey) {
            finishDrag();
            return;
        }

        const keys = items.map(getKey);
        const fromIndex = keys.indexOf(dragKey);
        const toIndex = keys.indexOf(targetKey);

        finishDrag();

        if (fromIndex === -1 || toIndex === -1) return;

        const next = [...keys];
        next.splice(fromIndex, 1);
        next.splice(toIndex, 0, dragKey);

        void onReorder(next);
    }

    function getDragHandlers(key: string): DragHandlers {
        return {
            onDragStart: () => handleDragStart(key),
            onDragOver: (event) => {
                if (dragKey && dragKey !== key) {
                    event.preventDefault();
                    handleDragOver(key);
                }
            },
            onDragLeave: () => handleDragLeave(key),
            onDrop: (event) => {
                event.preventDefault();
                handleDrop(key);
            },
            onDragEnd: finishDrag,
            isDragging: dragKey === key,
            isDropTarget: hoverKey === key && dragKey !== key,
        };
    }

    return { getDragHandlers };
}
