import { useEffect, useRef, useState } from "react";

export interface KebabMenuAction {
    label: string;
    onClick: () => void;
    danger?: boolean;
}

interface KebabMenuProps {
    actions: KebabMenuAction[];
}

export default function KebabMenu({ actions }: KebabMenuProps) {
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!open) return;

        function handleOutside(event: MouseEvent) {
            if (ref.current && !ref.current.contains(event.target as Node)) {
                setOpen(false);
            }
        }

        document.addEventListener("mousedown", handleOutside);
        return () => document.removeEventListener("mousedown", handleOutside);
    }, [open]);

    if (actions.length === 0) return null;

    return (
        <div className="root-tile-menu" ref={ref}>
            <button
                type="button"
                className="root-tile-kebab"
                onClick={() => setOpen((value) => !value)}
            >
                ⋮
            </button>

            {open && (
                <div className="root-tile-menu-popover">
                    {actions.map((action) => (
                        <button
                            type="button"
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
