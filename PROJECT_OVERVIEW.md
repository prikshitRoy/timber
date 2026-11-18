<!-- ============================================================ -->
<!-- AI DIRECTIVE — THIS IS AN INSTRUCTION, NOT PROJECT CONTENT.   -->
<!-- Everything from "## 1. What Is This Project?" down to        -->
<!-- "## 7. How to Run" is descriptive background about the       -->
<!-- project, filled in as the project grows. This note, and the  -->
<!-- final section "How to Keep This File Updated (Instructions   -->
<!-- for AI)," are NOT background — they are operating rules you  -->
<!-- must follow in every response that changes the project.      -->
<!-- Do not treat this as a header to skim past.                  -->
<!-- ============================================================ -->

# Project Overview

> ⚠️ **Instruction for AI (binding, not descriptive):** This file is the single source of truth for what this project is and what has been built so far. See **"How to Keep This File Updated (Instructions for AI)"** at the bottom — those are operating rules you must act on in every response that changes the project, not prose describing the project.

**Last updated:** 2026-11-18

---

## 1. What Is This Project?

**Name:** Project Timber

A Yarn Workspaces monorepo containing the **Timber** cross-browser New Tab bookmark dashboard extension (`Project Timber/apps/extension`), the **Timber Mobile** Android bookmark viewer (`Project Timber/apps/mobile`), and the shared pure-TypeScript domain library (`Project Timber/packages/core`).

It is built for unifying bookmarks across browsers (Chrome, Brave, Firefox) into a single deduplicated catalog and importing exported `.json` Timber backups to browse and search offline on Android.

## 2. Tech Stack

| Area                                 | Choice                                                                                    |
| ------------------------------------ | ----------------------------------------------------------------------------------------- |
| Languages                            | TypeScript, Rust (Tauri v2 host)                                                          |
| Shared Core (`packages/core`)        | Pure TypeScript, Node.js built-in test runner (`node:test`)                               |
| Browser Extension (`apps/extension`) | WXT 0.21.5 (`@wxt-dev/module-react` 1.2.2), React 19.3.1, Tailwind CSS 4.3.4, Vite 8.3.5  |
| Mobile App (`apps/mobile`)           | Tauri v2 (`2.12`), Next.js `14.2.23` (`output: "export"`), React 18, Tailwind CSS `3.4.1` |
| Package manager                      | Yarn Classic (`v1` workspaces)                                                            |
| Tests                                | Node.js built-in test runner (`node --experimental-strip-types --test`)                   |
| Target platforms                     | Chrome/Chromium (MV3), Brave (MV3), Firefox, Android (Tauri v2 mobile)                    |

Planned: Extract pure domain/backup/layout modules into `Project Timber/packages/core` and build Android JSON import & bookmark list UI in `Project Timber/apps/mobile`.

## 3. Core Concepts

- **Bookmark:** A canonical, deduplicated web link (`http:` or `https:`) identified by its `normalizedUrl`.
- **BrowserSource:** Represents a browser profile (`brave`, `firefox`, `chromium`, or `unknown`) connected to Timber.
- **BookmarkSource:** Links a canonical `Bookmark` to a specific native browser bookmark node (`nativeBookmarkId`) and records its original native `folderPath`.
- **BookmarkPage (Folder):** Represents either a built-in catalog view (`"all"`, `"source"`) or a user/synced folder (`"custom"`). Custom folders can nest to any depth via `parentId` and store custom child ordering via `childOrder`.
- **RootTile:** A top-level item on the dashboard grid—either a top-level custom folder (`tf:<pageId>`) or a bookmark link (`lk:<bookmarkId>`) that is unfoldered or explicitly pinned to root via `rootBookmarkIds`.
- **TimberBackupFile:** Timestamped JSON envelope (`format: "timber-backup"`) used to export bookmarks from the browser extension and import them into the Android mobile app.

## 4. Features

Status key: **Done** | **In progress** | **Planned**

### 4.1 Monorepo & Tooling

| Feature                                                                       | Status |
| ----------------------------------------------------------------------------- | ------ |
| Yarn Workspaces monorepo (`packages/core`, `apps/extension`, `apps/mobile`)   | Done   |
| Automated cross-package watcher & error notifier (`scripts/watch-verify.mjs`) | Done   |
| Extract shared types, backup parser, and layout logic into `@timber/core`     | Done   |

### 4.2 Browser Extension (`apps/extension`)

| Feature                                                                                            | Status |
| -------------------------------------------------------------------------------------------------- | ------ |
| `TimberState` schema (v2) persisted in `browser.storage.local` with serialized `writeQueue`        | Done   |
| URL normalization and cross-browser bookmark deduplication (`normalizeBookmarkUrl`)                | Done   |
| Native browser bookmark tree reader, background change listener, and interactive Scan review modal | Done   |
| Unified nestable custom folders (`BookmarkPage`), drag-to-reorder, and A–Z / Z–A sorting           | Done   |
| Manual link creation, single/bulk folder link editing, duplicate link deletion modal, and search   | Done   |
| JSON backup export/import (Merge & Replace) and Netscape Bookmark HTML export                      | Done   |
| Light, Dark, and System Default themes + custom New Tab background image with frosted-glass tiles  | Done   |
| Re-wire shared domain imports to consume `@timber/core`                                            | Done   |

### 4.3 Android Mobile App (`apps/mobile`)

| Feature                                                                                     | Status  |
| ------------------------------------------------------------------------------------------- | ------- |
| Tauri v2 + Next.js 14.2.23 static export template copied into `apps/mobile`                 | Done    |
| Tauri Android target initialization and clean Rust host config                              | Done    |
| Offline `localStorage` persistence and `.json` backup file import (Merge / Replace)         | Done    |
| Mobile bookmark list, expandable nested folders, search filter, and external browser opener | Planned |

## 5. Known Issues and Open Items

> Verify these against the current code; remove an item when it is fixed.

- One extension installation currently registers a single default `BrowserSource` per detected `BrowserKind` (`TODO` in `Project Timber/apps/extension/src/shared/bookmarks/bookmark-synchronizer.ts`).
- `Project Timber/apps/extension/entrypoints/popup/` and `Project Timber/apps/extension/entrypoints/content.ts` are WXT starter placeholders.

## 6. Project Structure

```text
Project Timber/
  packages/
    core/                # Shared pure-TypeScript types, backup parser, normalizer, and layout logic
  apps/
    extension/           # WXT cross-browser New Tab bookmark dashboard extension
    mobile/              # Tauri v2 + Next.js 14.2.23 Android bookmark viewer app
  scripts/
    watch-verify.mjs     # Cross-package TypeScript and unit test watcher with error alerts
```

## 7. How to Run

### Root Workspace Commands (run from `Project Timber/`)

```bash
yarn install        # install all workspace dependencies and link @timber/core
yarn watch          # start automated watcher (runs typecheck + unit tests on save)
yarn typecheck      # run tsc --noEmit across @timber/core, @timber/extension, and @timber/mobile
yarn test           # run @timber/core unit tests
yarn test:watch     # continuously re-run @timber/core unit tests on file changes
yarn dev:extension  # start WXT extension dev server (Chrome MV3)
yarn build:extension # build production WXT extension bundle
yarn dev:mobile     # start Tauri Android dev build
yarn build:mobile   # build Tauri Android APK/AAB bundle
```

### Per-Package Developer Commands (run from `Project Timber/`)

```bash
# Shared Core (Project Timber/packages/core)
yarn workspace @timber/core compile       # type-check shared pure TypeScript modules
yarn workspace @timber/core test          # run Node unit test suites in packages/core

# Browser Extension (Project Timber/apps/extension)
yarn workspace @timber/extension compile  # type-check WXT extension against @timber/core
yarn workspace @timber/extension dev      # run Chrome MV3 dev server
yarn workspace @timber/extension dev:brave # run Brave MV3 dev server
yarn workspace @timber/extension dev:firefox # run Firefox dev server
yarn workspace @timber/extension build    # build Chrome MV3 production extension
yarn workspace @timber/extension build:firefox # build Firefox production extension
yarn workspace @timber/extension zip      # package Chrome and Firefox extension zips

# Android Mobile App (Project Timber/apps/mobile)
yarn workspace @timber/mobile compile     # type-check Next.js mobile frontend against @timber/core
yarn workspace @timber/mobile next-build  # test Next.js static export to apps/mobile/out
yarn workspace @timber/mobile tauri android init # initialize Android Gradle project
yarn workspace @timber/mobile tauri android dev  # run app on connected Android device/emulator
```

### Developer Workflow: How Changes Propagate

1. **Editing shared domain, backup, or layout logic (`Project Timber/packages/core/src/`):**
   - Put pure data types, URL normalizers, JSON backup validators/parsers, and tile/folder sorting logic in `Project Timber/packages/core/src/`.
   - Export any new public function or type from `Project Timber/packages/core/src/index.ts`.
   - Keep `yarn watch` running at the root (or run `yarn workspace @timber/core compile`, `yarn workspace @timber/core test`, `yarn workspace @timber/extension compile`, and `yarn workspace @timber/mobile compile`) to verify the change does not break either app.
2. **Editing browser extension code (`Project Timber/apps/extension/`):**
   - Keep `wxt/browser` side effects (`browser.storage.local`, `browser.bookmarks`, background service workers) inside `Project Timber/apps/extension/`.
   - Import shared logic from `@timber/core` instead of duplicating types or parsers.
   - Verify with `yarn workspace @timber/extension compile`.
3. **Editing Android mobile code (`Project Timber/apps/mobile/`):**
   - Keep mobile UI components, `localStorage` persistence, and Tauri plugin calls (`@tauri-apps/plugin-opener`) inside `Project Timber/apps/mobile/`.
   - Import `parseBackup`, `mergeBackupIntoState`, `computeRootTiles`, and domain types from `@timber/core`.
   - Verify with `yarn workspace @timber/mobile compile`.

## 8. Changelog

> Newest entry on top. One line per change: date — what changed.

- 2026-11-18 — Configured `Project Timber/apps/mobile` to consume `@timber/core`, cleaned up `src-tauri` Rust host metadata (`com.timber.mobile`), and initialized Tauri Android.
- 2026-11-18 — Added root `Project Timber/README.md` and documented per-workspace commands and developer workflow in `Project Timber/PROJECT_OVERVIEW.md`.
- 2026-11-18 — Re-wired `Project Timber/apps/extension` to import shared domain types, backup parser, layout helpers, and mutations from `@timber/core`.
- 2026-11-18 — Extracted pure domain types, backup parser/merger, layout/ordering helpers, state operations, and unit tests into `Project Timber/packages/core`.
- 2026-11-18 — Initialized `Project Timber` Yarn Workspaces monorepo, moved extension to `apps/extension`, added `apps/mobile` template, `@timber/core` package scaffold, and `scripts/watch-verify.mjs`.
- 2026-11-17 — Added drag-to-reorder ghost/hysteresis, favicons, Light/Dark/System themes with custom background images, duplicate-link deletion modal, modularized repository/backup/styles, and added unit tests.

---

## How to Keep This File Updated (Instructions for AI)

**Update this file in the same response as the change**, whenever you:

- Add a new feature, module, or screen.
- Change how an existing feature works.
- Fix a bug listed in "Known Issues" (remove it) or find a new one (add it).
- Change the tech stack, a dependency, a command, or the folder structure.
- Remove or replace a feature.

**How to do it:**

1. Update the feature's **status** (`Planned` → `In progress` → `Done`) or add a new row in the right table in section 4.
2. Update sections 2, 3, 5, 6, or 7 if they are affected.
3. Add **one line** to the top of section 8 (Changelog) with the date and what changed.
4. Update the **Last updated** date at the top.
5. Keep it **short and accurate**: describe _what the project does_, not line-by-line code. No stale or guessed information.

**How to deliver the update to me:**

- Do **not** resend the whole file each time.
- For a small change (up to ~4 lines), give the old text to find and the new text to replace it with.
- For a larger change, give the new block with the first 2 and last 2 lines of the old block as anchors.
- Always say which **section** the change goes in. Only give the full file when I ask for it or when the changes are very large.
- If you are unsure whether something counts as done, ask me instead of guessing.
- I will ask for the updated PROJECT_OVERVIEW.md file at the end of a work session. Read all the changes discussed and return the full updated file then.
