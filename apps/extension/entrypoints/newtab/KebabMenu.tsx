/**
 * Reusable three-dot ("⋮") popover menu that closes automatically on outside click,
 * Escape key, or item selection, and adjusts its position to stay inside the viewport.
 */

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { adjustPopoverPosition } from "./utils/popover-position";

// Descriptor for a single action button inside a KebabMenu popover.
export interface KebabMenuAction {
    label: string;
    onClick: () => void;
    danger?: boolean;
}

interface KebabMenuProps {
    actions: KebabMenuAction[];
}

/**
 * Render a compact three-dot menu button and its viewport-aware action popover.
 */
export default function KebabMenu({ actions }: KebabMenuProps) {
    const [open, setOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);
    const popoverRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!open) return;

        function handleOutside(event: MouseEvent) {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setOpen(false);
            }
        }

        function handleKeyDown(event: KeyboardEvent) {
            if (event.key === "Escape") {
                setOpen(false);
            }
        }

        document.addEventListener("mousedown", handleOutside);
        document.addEventListener("keydown", handleKeyDown);
        return () => {
            document.removeEventListener("mousedown", handleOutside);
            document.removeEventListener("keydown", handleKeyDown);
        };
    }, [open]);

    useLayoutEffect(() => {
        if (!open || !popoverRef.current) return;

        const reposition = () => {
            if (popoverRef.current) {
                adjustPopoverPosition(popoverRef.current);
            }
        };

        reposition();
        window.addEventListener("resize", reposition);
        return () => window.removeEventListener("resize", reposition);
    }, [open, actions.length]);

    if (actions.length === 0) return null;

    return (
        <div className="root-tile-menu" ref={menuRef}>
            <button
                type="button"
                className="root-tile-kebab"
                aria-haspopup="menu"
                aria-expanded={open}
                onClick={() => setOpen((value) => !value)}
            >
                ⋮
            </button>

            {open && (
                <div
                    ref={popoverRef}
                    role="menu"
                    className="root-tile-menu-popover"
                >
                    {actions.map((action) => (
                        <button
                            type="button"
                            role="menuitem"
                            key={action.label}
                            className={action.danger ? "root-tile-menu-danger" : ""}
                            onClick={() => {
                                setOpen(false);
                                action.onClick();
                            }}
                        >
                            {action.label}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}
