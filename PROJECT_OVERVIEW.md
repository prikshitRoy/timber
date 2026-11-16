# Project Overview

> **Instruction for AI:** This file is the single source of truth for what this project is and what has been built.

Last updated: 2026-11-17

---

## 1. What Is This Project?

**Name:** Timber

A cross-browser **New Tab bookmark dashboard extension** built with **WXT**, **React**, and **TypeScript**.
Timber lets users bring bookmarks from multiple browsers (Brave, Chrome/Chromium, Firefox) into a single deduplicated catalog on their New Tab page, organize links into nestable folders with drag-and-drop and A–Z sorting, and move or back up their entire collection across browsers using JSON backups or standard Netscape HTML bookmark files.

## 2. Tech Stack

| Area                 | Choice                                                                 |
| -------------------- | ---------------------------------------------------------------------- |
| Extension framework  | WXT 0.21.5 (`@wxt-dev/module-react` 1.2.2)                             |
| Frontend             | React 19.3.1 + React DOM 19.3.1, TypeScript 7.0.2                      |
| Build tool           | Vite 8.3.5 + `web-ext` 10.8.0                                          |
| Styling              | Tailwind CSS 4.3.4 (`@tailwindcss/vite`) + modular CSS stylesheets     |
| Package manager      | Yarn Classic (lockfile v1)                                             |
| Unit tests           | Node.js built-in test runner (`node:test` + `node:assert/strict`)      |
| Target platforms     | Chrome / Chromium (Manifest V3), Brave (Manifest V3), Firefox          |

## 3. Core Concepts

- **Bookmark:** A canonical, deduplicated web link (`http:` or `https:`) identified by its `normalizedUrl`.
- **BrowserSource:** Represents a browser profile (`brave`, `firefox`, `chromium`, or `unknown`) connected to Timber.
- **BookmarkSource:** Links a canonical `Bookmark` to a specific native browser bookmark node (`nativeBookmarkId`) and records its original native `folderPath`.
- **BookmarkPage (Folder):** Represents either a built-in catalog view (`"all"`, `"source"`) or a user/synced folder (`"custom"`). Custom folders can nest to any depth via `parentId` and store custom child ordering via `childOrder`.
- **RootTile:** A top-level item on the New Tab dashboard grid—either a top-level custom folder (`tf:<pageId>`) or a bookmark link (`lk:<bookmarkId>`) that is unfoldered or explicitly pinned to root via `rootBookmarkIds`.
- **Sync Diff & Review:** Native browser bookmark changes never overwrite Timber automatically; the background worker notifies the dashboard, and the user reviews and selects new bookmarks to import via the **Scan** action.

## 4. Features

Status key: **Done** | **In progress** | **Planned**

### 4.1 Catalog state and storage

| Feature                                                                                         | Status |
| ----------------------------------------------------------------------------------------------- | ------ |
| `TimberState` schema (v2) persisted in `browser.storage.local`                                  | Done   |
| Serialized `writeQueue` in `BookmarkRepository` to prevent concurrent storage write races       | Done   |
| URL normalization and cross-browser bookmark deduplication (`normalizeBookmarkUrl`)             | Done   |
| Pure state operation modules (`bookmark-mutations`, `folder-mutations`, `sync-mutations`)       | Done   |
| Explicit multi-profile management per browser family                                            | Planned |

### 4.2 Browser bookmark sync and review

| Feature                                                                                         | Status |
| ----------------------------------------------------------------------------------------------- | ------ |
| Optional `"bookmarks"` permission prompt on user action                                         | Done   |
| Native browser bookmark tree reader (`readNativeBookmarkTree`)                                  | Done   |
| Background bookmark change listener (`TIMBER_BOOKMARKS_CHANGED` badge in header)                | Done   |
| Interactive Scan diff calculation and `SyncReviewModal` checklist                               | Done   |
| Automatic folder-chain creation and cross-browser folder merging by name on Scan import         | Done   |

### 4.3 Unified folders and root layout

| Feature                                                                                         | Status |
| ----------------------------------------------------------------------------------------------- | ------ |
| One-time migration from legacy `folderPath` arrays to unified custom `BookmarkPage` folders     | Done   |
| Top-level folder and link tile computation (`computeRootTiles`)                                 | Done   |
| Nested sub-folders at arbitrary depth (`SubFolderTile` + recursive `TimberFolderContents`)      | Done   |
| Explicit root link visibility even when a bookmark also lives inside a folder (`rootBookmarkIds`) | Done |
| Cascading folder deletion (deletes nested sub-folders and scrubs references from other folders) | Done   |

### 4.4 Drag-and-drop ordering and sorting

| Feature                                                                                         | Status |
| ----------------------------------------------------------------------------------------------- | ------ |
| Pointer-based live drag-to-reorder hook (`useTileDragReorder`) in Edit mode                     | Done   |
| Custom drag order persisted for both the root grid (`rootOrder`) and each folder (`childOrder`) | Done   |
| Alphabetical A–Z and Z–A sort controls on the root grid and inside every expanded folder        | Done   |

### 4.5 Editing and bulk actions

| Feature                                                                                         | Status |
| ----------------------------------------------------------------------------------------------- | ------ |
| Manual link creation (`+ Link`) at root or directly inside a target folder                      | Done   |
| Single bookmark title/URL editing (`EditBookmarkModal`) and clipboard link copying              | Done   |
| Quick folder filing dropdown (`AddToFolderMenu`) on search result cards                         | Done   |
| Bulk folder link editor (`EditFolderLinksModal`) with multi-select copy, delete, and inline edit | Done  |
| Live search filtering by bookmark title or URL                                                  | Done   |

### 4.6 Backup, restore, and HTML export

| Feature                                                                                         | Status |
| ----------------------------------------------------------------------------------------------- | ------ |
| Full state export to timestamped JSON backup (`timber-backup-YYYY-MM-DD.json`)                  | Done   |
| Untrusted backup JSON validation, URL deduplication, and broken-reference sanitization          | Done   |
| Non-destructive backup **Merge** mode and full **Replace** restore mode                         | Done   |
| Stale native bookmark ID pruning on Replace restore (`dropStaleNativeLinks`)                    | Done   |
| Standard Netscape Bookmark HTML export (`timber-bookmarks-YYYY-MM-DD.html`)                     | Done   |

### 4.7 Extension entrypoints and UI

| Feature                                                                                         | Status |
| ----------------------------------------------------------------------------------------------- | ------ |
| New Tab dashboard (`entrypoints/newtab/`) with modular hooks, components, and stylesheets       | Done   |
| Background service worker (`entrypoints/background.ts`) with typed runtime message guards       | Done   |
| Extension toolbar popup (`entrypoints/popup/`)                                                  | Planned (placeholder) |
| In-page content script (`entrypoints/content.ts`)                                               | Planned (placeholder) |

### 4.8 Testing

| Feature                                                                                         | Status |
| ----------------------------------------------------------------------------------------------- | ------ |
| Unit tests with `node:test` covering URL normalizer, ordering, root layout, folder chains, mutations, and backups | Done |
| Shared deterministic state builder (`src/shared/testing/test-state-factory.ts`)                 | Done   |
| End-to-end browser extension UI tests                                                           | Planned |

## 5. Known Issues and Open Items

> Verify these against the current code; remove an item when it is fixed.

- One installation currently registers a single default `BrowserSource` per detected `BrowserKind`; explicit multi-profile management is noted as a `TODO` in [bookmark-synchronizer.ts](file:///e:/Software%20Projects/Web%20Browser%20Extension/timber/src/shared/bookmarks/bookmark-synchronizer.ts).
- [entrypoints/popup/](file:///e:/Software%20Projects/Web%20Browser%20Extension/timber/entrypoints/popup/App.tsx) and [entrypoints/content.ts](file:///e:/Software%20Projects/Web%20Browser%20Extension/timber/entrypoints/content.ts) are currently WXT starter placeholders reserved for future quick-bookmarking features.

## 6. Project Structure

```text
entrypoints/
  background.ts                # Background service worker for bookmark listeners and sync messages
  content.ts                   # Placeholder content script entrypoint
  newtab/                      # New Tab bookmark dashboard application
    App.tsx                    # Top-level dashboard layout and modal coordinator
    RootGrid.tsx               # Root tile grid with sorting and folder expansion
    TimberFolderContents.tsx   # Recursive folder contents view
    components/                # Focused UI components (Header, Footer, SearchResults, SubFolderTile, etc.)
    hooks/                     # Custom React hooks (catalog, sync, CRUD/folder actions, backup actions)
    styles/                    # Modular CSS stylesheets (base, header-footer, search-cards, tiles, folders, modals)
  popup/                       # Placeholder toolbar popup entrypoint
src/
  assets/
    tailwind.css               # Tailwind CSS v4 entry point
  shared/
    backup/                    # JSON backup creation, validation, parsing, merging, and HTML export
    bookmarks/                 # Bookmark normalizer, native tree reader, layout, ordering, and repository
      operations/              # Pure state mutation functions (bookmarks, folders, sync)
    browser/                   # Runtime browser family detection and display names
    messages/                  # Typed runtime message contracts and boundary guards
    storage/                   # browser.storage.local persistence adapter
    testing/                   # Deterministic state builders for unit tests
    types/                     # Core TimberState and domain interfaces
```

## 7. How to Run

```bash
yarn install        # install dependencies and run wxt prepare
yarn compile        # run TypeScript type-checking (tsc --noEmit)
yarn test           # run unit test suites via Node's built-in test runner
yarn dev            # run development build in Chrome (MV3)
yarn dev:brave      # run development build for Brave (MV3)
yarn dev:firefox    # run development build in Firefox
yarn build          # build production extension for Chrome (MV3)
yarn build:firefox  # build production extension for Firefox
yarn zip            # package extension into a distributable zip archive
```

## 8. Changelog

- **2026-11-17:** Modularized `bookmark-repository`, `timber-backup`, `entrypoints/newtab/App.tsx`, and `style.css`; added typed runtime message guards; fixed `rootBookmarkIds` backup merge bug; added `node:test` unit test suites and project documentation.

---

## How to Keep This File Updated (Instructions for AI)

**Update this file in the same response as the change**, whenever you:

- Add a new feature, module, or screen.
- Change how an existing feature works.
- Fix a bug listed in "Known Issues" (remove it) or find a new one (add it).
- Change the tech stack, a dependency, a command, or the folder structure.
- Remove or replace a feature.

**How to do it:**

1. Update the feature's **status** (`Planned` -> `In progress` -> `Done`) or add a new row in the right table in section 4.
2. Update sections 2, 5, 6, or 7 if they are affected.
3. Add **one line** to the top of the Changelog with the date and what changed.
4. Update the `Last updated` date at the top.
5. Keep it **short and accurate**: describe *what the project does*, not line-by-line code. No stale or guessed information.
