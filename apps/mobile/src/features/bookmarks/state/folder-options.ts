/**
 * Pure helper for formatting nested custom folders into sorted, path-labeled dropdown options.
 */

import type { BookmarkPage } from "@timber/core";

export interface FolderOption {
    id: string;
    label: string;
}

/**
 * Build a flat, alphabetically sorted list of custom folder paths (e.g. "Work / Docs").
 */
export function buildFolderOptions(pages: BookmarkPage[]): FolderOption[] {
    const customPages = pages.filter((page) => page.type === "custom");
    const byParent = new Map<string, BookmarkPage[]>();

    for (const page of customPages) {
        const key = page.parentId ?? "";
        const siblings = byParent.get(key) ?? [];
        siblings.push(page);
        byParent.set(key, siblings);
    }

    for (const siblings of byParent.values()) {
        siblings.sort((a, b) =>
            a.name.localeCompare(b.name, undefined, { sensitivity: "base" })
        );
    }

    const options: FolderOption[] = [];
    const visited = new Set<string>();

    function visit(parentId: string, prefix: string[]) {
        for (const child of byParent.get(parentId) ?? []) {
            if (visited.has(child.id)) continue;
            visited.add(child.id);
            const path = [...prefix, child.name];
            options.push({ id: child.id, label: path.join(" / ") });
            visit(child.id, path);
        }
    }

    visit("", []);

    // Preserve orphaned folders whose parentId is missing or cyclic.
    for (const page of customPages) {
        if (!visited.has(page.id)) {
            options.push({ id: page.id, label: page.name });
        }
    }

    return options;
}
