/**
 * Viewport edge-detection helper for positioning kebab popover menus
 * without clipping at the right, left, or bottom edges of the screen.
 */

const ALIGN_RIGHT_CLASS = "root-tile-menu-popover--align-right";
const OPEN_UP_CLASS = "root-tile-menu-popover--open-up";

/**
 * Adjust a rendered popover element so it opens left-aligned and downward by default,
 * flipping right-aligned or upward automatically when near viewport boundaries.
 */
export function adjustPopoverPosition(
  popover: HTMLElement,
  margin = 8
): void {
  popover.classList.remove(ALIGN_RIGHT_CLASS, OPEN_UP_CLASS);
  popover.style.transform = "";

  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  let rect = popover.getBoundingClientRect();

  // Flip to right-aligned if the default left-aligned dropdown overflows the right edge
  if (rect.right > viewportWidth - margin) {
    popover.classList.add(ALIGN_RIGHT_CLASS);
    rect = popover.getBoundingClientRect();
  }

  // Clamp horizontally if still outside either edge on narrow windows
  if (rect.left < margin) {
    popover.style.transform = `translateX(${Math.ceil(margin - rect.left)}px)`;
  } else if (rect.right > viewportWidth - margin) {
    popover.style.transform = `translateX(${Math.floor(viewportWidth - margin - rect.right)}px)`;
  }

  // Flip upward if overflowing the bottom edge and more room exists above
  if (rect.bottom > viewportHeight - margin) {
    const spaceBelow = viewportHeight - rect.top - margin;
    popover.classList.add(OPEN_UP_CLASS);
    const upRect = popover.getBoundingClientRect();
    const spaceAbove = upRect.bottom - margin;

    if (upRect.top < margin && spaceAbove < spaceBelow) {
      popover.classList.remove(OPEN_UP_CLASS);
    }
  }
}
