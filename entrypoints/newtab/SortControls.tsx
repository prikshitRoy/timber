/**
 * Compact A-Z / Z-A sort toolbar rendered above the root grid and inside expanded folders.
 */

interface SortControlsProps {
    onSortAsc: () => void;
    onSortDesc: () => void;
}

/**
 * Render ascending (A–Z) and descending (Z–A) alphabetical sort buttons.
 */
export default function SortControls({ onSortAsc, onSortDesc }: SortControlsProps) {
    return (
        <div className="sort-controls">
            <button type="button" onClick={onSortAsc} title="Sort A to Z">
                A–Z
            </button>
            <button type="button" onClick={onSortDesc} title="Sort Z to A">
                Z–A
            </button>
        </div>
    );
}
