import { useCallback, useEffect, useRef, useState } from "react";

const DRAG_THRESHOLD_PX = 4;

/**
 * Pointer-based (not native HTML5 drag-and-drop) drag-to-reorder.
 *
 * Native HTML5 DnD cancels its own drag session the instant the
 * dragged element's DOM position changes — which is exactly what a
 * live "everything shifts to make room" preview needs to do, so
 * native DnD can never reliably support that kind of preview.
 * Pointer events sidestep this entirely: there's no native drag
 * session to break, so the dragged tile is free to move within the
 * live order as the pointer moves, giving a true full-list preview —
 * used identically by root and every nested folder level.
 */
export function useTileDragReorder<T>(
    items: T[],
    getKey: (item: T) => string,
    onReorder: (orderedKeys: string[]) => void | Promise<void>
) {
    const [dragKey, setDragKey] = useState<string | null>(null);
    const [previewOrder, setPreviewOrder] = useState<string[] | null>(null);

    const stateRef = useRef({
        dragKey: null as string | null,
        startX: 0,
        startY: 0,
        moved: false,
        order: [] as string[],
    });

    const baseOrder = items.map(getKey);
    const byKey = new Map(items.map((item) => [getKey(item), item] as const));

    const activeOrder = previewOrder ?? baseOrder;
    const orderedItems = activeOrder
        .map((key) => byKey.get(key))
        .filter((item): item is T => item !== undefined);

    const handlePointerMove = useCallback((event: PointerEvent) => {
        const s = stateRef.current;
        if (!s.dragKey) return;

        if (!s.moved) {
            const dx = event.clientX - s.startX;
            const dy = event.clientY - s.startY;
            if (Math.hypot(dx, dy) < DRAG_THRESHOLD_PX) return;
            s.moved = true;
        }

        const target = document
            .elementFromPoint(event.clientX, event.clientY)
            ?.closest<HTMLElement>("[data-tile-key]");

        const overKey = target?.getAttribute("data-tile-key");
        if (!overKey || overKey === s.dragKey || !s.order.includes(overKey)) {
            return;
        }

        const fromIndex = s.order.indexOf(s.dragKey);
        const toIndex = s.order.indexOf(overKey);
        if (fromIndex === toIndex) return;

        const next = [...s.order];
        next.splice(fromIndex, 1);
        next.splice(toIndex, 0, s.dragKey);

        s.order = next;
        setPreviewOrder(next);
    }, []);

    const handlePointerUp = useCallback(() => {
        const s = stateRef.current;

        document.removeEventListener("pointermove", handlePointerMove);
        document.body.style.userSelect = "";

        if (s.moved && s.dragKey) {
            // The browser fires a plain "click" right after pointerup
            // for this same gesture — swallow it once so dropping a
            // tile doesn't also trigger its button/link's own click.
            const suppressClick = (event: MouseEvent) => {
                event.stopPropagation();
                event.preventDefault();
            };
            window.addEventListener("click", suppressClick, {
                capture: true,
                once: true,
            });

            void onReorder(s.order);
        }

        s.dragKey = null;
        s.moved = false;
        setDragKey(null);
        setPreviewOrder(null);
    }, [handlePointerMove, onReorder]);

    const getPointerDownHandler = useCallback(
        (key: string) => (event: React.PointerEvent<HTMLElement>) => {
            if (event.button !== 0) return;

            stateRef.current = {
                dragKey: key,
                startX: event.clientX,
                startY: event.clientY,
                moved: false,
                order: items.map(getKey),
            };

            setDragKey(key);

            document.addEventListener("pointermove", handlePointerMove);
            document.addEventListener("pointerup", handlePointerUp, { once: true });
            document.body.style.userSelect = "none";
        },
        [items, getKey, handlePointerMove, handlePointerUp]
    );

    useEffect(() => {
        return () => {
            document.removeEventListener("pointermove", handlePointerMove);
            document.removeEventListener("pointerup", handlePointerUp);
            document.body.style.userSelect = "";
        };
    }, [handlePointerMove, handlePointerUp]);

    return {
        orderedItems,
        isDragging: (key: string) => dragKey === key,
        getPointerDownHandler,
    };
}
