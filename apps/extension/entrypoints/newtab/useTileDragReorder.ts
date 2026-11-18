/**
 * Pointer-based drag-to-reorder hook with floating cursor ghost, midpoint hysteresis,
 * viewport auto-scroll, Escape cancellation, and nested-folder event isolation.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import {
  hasCrossedTileMidpoint,
  moveKeyInOrder,
} from "../../src/shared/bookmarks/tile-ordering";

const DRAG_THRESHOLD_PX = 5;
const AUTO_SCROLL_EDGE_PX = 65;
const AUTO_SCROLL_MAX_SPEED_PX = 14;

/**
 * Create a floating visual clone of the dragged tile that tracks the cursor smoothly.
 */
function createDragGhost(
  sourceEl: HTMLElement,
  rect: DOMRect
): HTMLDivElement {
  const ghost = sourceEl.cloneNode(true) as HTMLDivElement;
  ghost.className = `${sourceEl.className} tile-drag-ghost`;
  ghost.removeAttribute("data-tile-key");
  ghost.style.position = "fixed";
  ghost.style.left = `${rect.left}px`;
  ghost.style.top = `${rect.top}px`;
  ghost.style.width = `${rect.width}px`;
  ghost.style.height = `${rect.height}px`;
  ghost.style.margin = "0";
  ghost.style.pointerEvents = "none";
  ghost.style.zIndex = "9999";
  ghost.style.willChange = "transform";
  document.body.appendChild(ghost);
  return ghost;
}

/**
 * Scroll the window vertically when the pointer nears the top or bottom edge of the viewport during a drag.
 */
function autoScrollViewport(clientY: number): void {
  if (clientY < AUTO_SCROLL_EDGE_PX) {
    const ratio = (AUTO_SCROLL_EDGE_PX - clientY) / AUTO_SCROLL_EDGE_PX;
    window.scrollBy(0, -Math.ceil(ratio * AUTO_SCROLL_MAX_SPEED_PX));
  } else if (window.innerHeight - clientY < AUTO_SCROLL_EDGE_PX) {
    const ratio =
      (AUTO_SCROLL_EDGE_PX - (window.innerHeight - clientY)) /
      AUTO_SCROLL_EDGE_PX;
    window.scrollBy(0, Math.ceil(ratio * AUTO_SCROLL_MAX_SPEED_PX));
  }
}

/**
 * Manage live pointer drag-to-reorder for the root grid or any nested folder level.
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
    offsetX: 0,
    offsetY: 0,
    moved: false,
    initialOrder: [] as string[],
    order: [] as string[],
    sourceEl: null as HTMLElement | null,
    sourceRect: null as DOMRect | null,
    ghostEl: null as HTMLDivElement | null,
  });

  const baseOrder = items.map(getKey);
  const byKey = new Map(items.map((item) => [getKey(item), item] as const));

  const activeOrder = previewOrder ?? baseOrder;
  const orderedItems = activeOrder
    .map((key) => byKey.get(key))
    .filter((item): item is T => item !== undefined);

  /**
   * Remove floating ghost DOM node, listeners, and cursor overrides when a drag ends or cancels.
   */
  const cleanupDragSession = useCallback(
    (
      onMove: (e: PointerEvent) => void,
      onUp: () => void,
      onKey: (e: KeyboardEvent) => void
    ) => {
      const s = stateRef.current;
      if (s.ghostEl) {
        s.ghostEl.remove();
        s.ghostEl = null;
      }
      s.sourceEl = null;
      s.sourceRect = null;
      document.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerup", onUp);
      document.removeEventListener("pointercancel", onUp);
      window.removeEventListener("keydown", onKey);
      document.body.style.userSelect = "";
      document.body.style.cursor = "";
    },
    []
  );

  const handlePointerMove = useCallback((event: PointerEvent) => {
    const s = stateRef.current;
    if (!s.dragKey) return;

    if (!s.moved) {
      const distance = Math.hypot(
        event.clientX - s.startX,
        event.clientY - s.startY
      );
      if (distance < DRAG_THRESHOLD_PX) return;

      s.moved = true;
      setDragKey(s.dragKey);
      document.body.style.cursor = "grabbing";

      if (s.sourceEl && s.sourceRect) {
        s.ghostEl = createDragGhost(s.sourceEl, s.sourceRect);
      }
    }

    if (s.ghostEl && s.sourceRect) {
      const tx = event.clientX - s.offsetX - s.sourceRect.left;
      const ty = event.clientY - s.offsetY - s.sourceRect.top;
      s.ghostEl.style.transform = `translate3d(${tx}px, ${ty}px, 0) scale(1.03)`;
    }

    autoScrollViewport(event.clientY);

    const target = document
      .elementFromPoint(event.clientX, event.clientY)
      ?.closest<HTMLElement>("[data-tile-key]");

    const overKey = target?.getAttribute("data-tile-key");
    if (!target || !overKey || overKey === s.dragKey || !s.order.includes(overKey)) {
      return;
    }

    const fromIndex = s.order.indexOf(s.dragKey);
    const toIndex = s.order.indexOf(overKey);
    if (fromIndex === -1 || toIndex === -1 || fromIndex === toIndex) return;

    const targetRect = target.getBoundingClientRect();
    if (
      !hasCrossedTileMidpoint(
        fromIndex,
        toIndex,
        event.clientX,
        event.clientY,
        targetRect
      )
    ) {
      return;
    }

    const next = moveKeyInOrder(s.order, s.dragKey, overKey);
    s.order = next;
    setPreviewOrder(next);
  }, []);

  const handlePointerUp = useCallback(() => {
    const s = stateRef.current;
    const didMove = s.moved && s.dragKey !== null;
    const orderChanged =
      didMove &&
      s.order.some((key, index) => key !== s.initialOrder[index]);
    const finalOrder = [...s.order];

    cleanupDragSession(handlePointerMove, handlePointerUp, handleKeyDown);

    if (didMove) {
      const suppressClick = (event: MouseEvent) => {
        event.stopPropagation();
        event.preventDefault();
      };
      window.addEventListener("click", suppressClick, {
        capture: true,
        once: true,
      });

      if (orderChanged) {
        void onReorder(finalOrder);
      }
    }

    s.dragKey = null;
    s.moved = false;
    setDragKey(null);
    setPreviewOrder(null);
  }, [cleanupDragSession, handlePointerMove, onReorder]);

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      const s = stateRef.current;
      if (!s.dragKey) return;

      event.preventDefault();
      cleanupDragSession(handlePointerMove, handlePointerUp, handleKeyDown);
      s.dragKey = null;
      s.moved = false;
      setDragKey(null);
      setPreviewOrder(null);
    },
    [cleanupDragSession, handlePointerMove, handlePointerUp]
  );

  const getPointerDownHandler = useCallback(
    (key: string) => (event: React.PointerEvent<HTMLElement>) => {
      if (event.button !== 0) return;

      // Ignore clicks on the kebab menu or its popover so menu actions stay clickable in Edit mode.
      const targetEl = event.target as HTMLElement | null;
      if (targetEl?.closest(".root-tile-menu")) return;

      // Prevent parent folder drag hooks from also starting when dragging an item inside a nested folder.
      event.stopPropagation();

      const currentOrder = items.map(getKey);
      const sourceEl = event.currentTarget;
      const rect = sourceEl.getBoundingClientRect();

      stateRef.current = {
        dragKey: key,
        startX: event.clientX,
        startY: event.clientY,
        offsetX: event.clientX - rect.left,
        offsetY: event.clientY - rect.top,
        moved: false,
        initialOrder: currentOrder,
        order: currentOrder,
        sourceEl,
        sourceRect: rect,
        ghostEl: null,
      };

      document.addEventListener("pointermove", handlePointerMove);
      document.addEventListener("pointerup", handlePointerUp);
      document.addEventListener("pointercancel", handlePointerUp);
      window.addEventListener("keydown", handleKeyDown);
      document.body.style.userSelect = "none";
    },
    [items, getKey, handlePointerMove, handlePointerUp, handleKeyDown]
  );

  useEffect(() => {
    return () => {
      cleanupDragSession(handlePointerMove, handlePointerUp, handleKeyDown);
    };
  }, [cleanupDragSession, handlePointerMove, handlePointerUp, handleKeyDown]);

  return {
    orderedItems,
    isDragging: (key: string) => dragKey === key,
    getPointerDownHandler,
  };
}
