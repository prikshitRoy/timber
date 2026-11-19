# Timber

Timber is a Yarn Workspaces monorepo containing the **Timber** cross-browser New Tab bookmark extension, the **Timber Mobile** Android bookmark companion app, and the `@timber/core` shared pure-TypeScript domain library.

## Features

- **Single Shared Domain Core (`@timber/core`):** Centralizes bookmark types, URL normalization, JSON backup parsing/merging, and nested folder layout logic across browser and mobile apps with zero code duplication.
- **Unified New Tab Browser Extension (`@timber/extension`):** Replaces the browser New Tab page in Chrome, Brave, and Firefox with a deduplicated grid of nestable folders and links.
- **User-Controlled Browser Sync:** Scans native browser bookmarks and presents a diff checklist before importing new links or folders.
- **Portable JSON Backups & HTML Export:** Exports timestamped `.json` backup files (supporting non-destructive **Merge** and full **Replace** modes) and standard Netscape `.html` bookmark files.
- **Android Bookmark Viewer (`@timber/mobile`):** Tauri v2 + Next.js 14 Android app that imports Timber `.json` backup files for offline browsing, folder navigation, and search.
- **Automated Cross-Package Verification:** Watches `@timber/core`, `@timber/extension`, and `@timber/mobile` simultaneously, running type-checks and unit tests on save with instant failure alerts.

## Monorepo Architecture & How Packages Connect

| Workspace Package   | Path             | Role & Connections                                                                                                                                                                                                                          |
| ------------------- | ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `@timber/core`      | `packages/core`  | Pure TypeScript library with zero browser, DOM storage, or Tauri dependencies. Exports `TimberState` types, `parseBackup`, `mergeBackupIntoState`, `normalizeBookmarkUrl`, `computeRootTiles`, `tile-ordering`, and state mutation helpers. |
| `@timber/extension` | `apps/extension` | WXT + React 19 browser extension for Chrome, Brave, and Firefox. Imports all pure domain/backup/layout logic from `@timber/core` and handles WebExtension side effects (`browser.storage.local`, `browser.bookmarks`).                      |
| `@timber/mobile`    | `apps/mobile`    | Tauri v2 + Next.js 14 (`output: "export"`) + React 18 Android application. Imports `@timber/core` to parse and lay out `.json` backup files, persists state locally, and opens external links via `@tauri-apps/plugin-opener`.              |

## Tech Stack

| Layer                                        | Technology                                                                                                               |
| -------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| Monorepo & Package Manager                   | Yarn Classic (`v1`) Workspaces                                                                                           |
| Shared Core (`packages/core`)                | TypeScript `^5.7.0`, Node.js built-in test runner (`node:test`)                                                          |
| Browser Extension (`apps/extension`)         | WXT `^0.21.3` (`@wxt-dev/module-react` `^1.1.5`), React `^19.2.0`, Tailwind CSS `^4.3.4`, Vite `^8`, `web-ext` `^10.5.0` |
| Mobile Frontend (`apps/mobile`)              | Next.js `14.2.23` (Static Export), React `^18`, TypeScript `^5`, Tailwind CSS `^3.4.1`                                   |
| Mobile Native Host (`apps/mobile/src-tauri`) | Tauri `2.12` (Rust 2021 edition), `tauri-plugin-opener` `2.7`, `@tauri-apps/cli` `^2.2.3`                                |

## Prerequisites

- **Node.js:** `v22.6.0` or newer (required for `--experimental-strip-types` in unit tests)
- **Yarn:** `v1.22+` (Yarn Classic)
- **Supported Browsers (for `@timber/extension`):** Google Chrome / Chromium, Brave, or Mozilla Firefox
- **Rust & Android Toolchain (for `@timber/mobile`):**
  - Rust (`rustup`, `cargo`) with Android targets installed (`rustup target add aarch64-linux-android armv7-linux-androideabi i686-linux-android x86_64-linux-android`)
  - Android Studio with Android SDK, NDK, and `JAVA_HOME` / `ANDROID_HOME` / `NDK_HOME` environment variables configured

## Installation

1. Navigate into the monorepo root directory:

```bash
cd "Timber"
```

2. Install dependencies for all workspaces (this links `@timber/core` into both `apps/extension` and `apps/mobile` and runs `wxt prepare`):

```bash
yarn install
```

3. Verify that all packages compile and all unit tests pass:

```bash
yarn typecheck
yarn test
```

## Usage & Running the Project

### 1. Automated Watcher (Recommended During Development)

Start the workspace watcher in a terminal before editing code. It watches `packages/core/src`, `apps/extension`, and `apps/mobile/src`, automatically running `yarn typecheck` and `yarn test` on every save and sounding an alert if any package fails:

```bash
yarn watch
```

### 2. Running the Browser Extension (`@timber/extension`)

Start the WXT development server with hot reload from the monorepo root:

```bash
# Chrome / Chromium (Manifest V3)
yarn dev:extension

# Brave (Manifest V3)
yarn workspace @timber/extension dev:brave

# Firefox
yarn workspace @timber/extension dev:firefox
```

#### Loading the Unpacked Extension Manually

Build the production extension bundle first:

```bash
# Chrome / Brave (outputs to apps/extension/.output/chrome-mv3)
yarn build:extension

# Firefox (outputs to apps/extension/.output/firefox-mv2)
yarn workspace @timber/extension build:firefox
```

- **Chrome / Brave:** Open `chrome://extensions` (or `brave://extensions`), enable **Developer mode**, click **Load unpacked**, and select `apps/extension/.output/chrome-mv3`.
- **Firefox:** Open `about:debugging#/runtime/this-firefox`, click **Load Temporary Add-on...**, and select `apps/extension/.output/firefox-mv2/manifest.json`.

#### Browser Extension Permissions

Defined in [apps/extension/wxt.config.ts](./apps/extension/wxt.config.ts):

| Permission  | Type     | Purpose                                                                                        |
| ----------- | -------- | ---------------------------------------------------------------------------------------------- |
| `storage`   | Required | Saves the Timber bookmark catalog, custom folders, and tile order in `browser.storage.local`.  |
| `bookmarks` | Optional | Requested only when clicking **Connect Bookmarks** to read the browser's native bookmark tree. |

### 3. Running the Android App (`@timber/mobile`)

1. Initialize the Tauri Android project (first time only):

```bash
yarn workspace @timber/mobile tauri android init
```

2. Start an Android Emulator in Android Studio or connect a physical Android device with **USB Debugging** enabled (`adb devices`).
3. Run the Android app in development mode:

```bash
yarn dev:mobile
```

4. Build the production Android APK / AAB:

### 3. Running the Android App (`@timber/mobile`)

1. Initialize the Tauri Android project (first time only):

```bash
yarn workspace @timber/mobile tauri android init
```

2. On your Android device (connected to the same Wi-Fi network as your PC), enable **Developer options** and turn on **Wireless debugging**.
3. Connect your PC to the device using the IP address and port shown on the phone's **Wireless debugging** screen, then verify it is detected:

```bash
# Connect over Wi-Fi (replace with your phone's IP:port)
adb connect 192.168.xxx.xx:xxxxx

# Confirm the device appears with status "device"
adb devices
```

4. Tunnel port `3000` from the Android device to your PC so the Tauri WebView can load the local Next.js dev server (`127.0.0.1:3000`):

```bash
yarn android:reverse
# or: yarn workspace @timber/mobile android:reverse
```

5. Start the Tauri Android development build:

```bash
yarn dev:mobile
# or: yarn workspace @timber/mobile android:dev
```

*(If your phone disconnects from Wi-Fi or restarts, re-run `adb connect` and `yarn android:reverse` before launching `yarn dev:mobile`.)*

6. Build the production Android APK / AAB:

```bash
yarn build:mobile
```

## Developer Guide: How to Make Changes

### What We Did to Eliminate Duplication

All pure business logic was extracted from the browser extension into [packages/core/src](./packages/core/src) and exported via [packages/core/src/index.ts](./packages/core/src/index.ts):

- **Domain Models:** `TimberState`, `Bookmark`, `BookmarkPage`, `BookmarkSource`, `BrowserSource` ([packages/core/src/types/timber.ts](./packages/core/src/types/timber.ts))
- **Backup Engine:** `createBackup`, `parseBackup`, `mergeBackupIntoState`, `dropStaleNativeLinks`, `exportBookmarksHtml` ([packages/core/src/backup](./packages/core/src/backup))
- **Layout & Ordering:** `normalizeBookmarkUrl`, `computeRootTiles`, `applyStoredOrder`, `sortAlphabetically`, `findOrCreateFolderChainInState` ([packages/core/src/bookmarks](./packages/core/src/bookmarks))
- **State Operations:** Pure mutation functions in [packages/core/src/bookmarks/operations](./packages/core/src/bookmarks/operations)

### Workflow When Changing Code

1. **Changing or adding shared logic in `@timber/core`:**
   - Edit or add a module inside `packages/core/src/`.
   - Re-export any new public function or type in `packages/core/src/index.ts`.
   - Add or update unit tests in `packages/core/src/**/*.test.ts`.
   - Verify `@timber/core` and both downstream apps:

```bash
yarn workspace @timber/core compile
yarn workspace @timber/core test
yarn workspace @timber/extension compile
yarn workspace @timber/mobile compile
```

2. **Changing the Browser Extension (`@timber/extension`):**
   - Put WebExtension-specific code (`wxt/browser` storage, native bookmark tree reading, New Tab React components) in `apps/extension/`.
   - Import shared types and helpers from `@timber/core`.
   - Verify with:

```bash
yarn workspace @timber/extension compile
```

3. **Changing the Android App (`@timber/mobile`):**
   - Put Next.js UI components, `localStorage` persistence, and Tauri native plugin calls inside `apps/mobile/src/`.
   - Import backup parsing and layout helpers from `@timber/core`.
   - Verify TypeScript types and Next.js static export with:

```bash
yarn workspace @timber/mobile compile
yarn workspace @timber/mobile next-build
```

## Project Structure

```text
Timber/
├── packages/
│   └── core/                        # @timber/core shared pure-TypeScript package
│       ├── src/
│       │   ├── appearance/          # Theme mode types, resolution helpers, and unit tests
│       │   ├── backup/              # JSON backup parser, merger, validators, HTML export, and tests
│       │   ├── bookmarks/           # URL normalizer, root layout, tile ordering, operations, and tests
│       │   ├── testing/             # Deterministic test state factory builders
│       │   ├── types/               # Core TimberState, Bookmark, and BookmarkPage interfaces
│       │   └── index.ts             # Public package barrel export
│       ├── package.json
│       └── tsconfig.json
├── apps/
│   ├── extension/                   # @timber/extension WXT browser extension (Chrome, Brave, Firefox)
│   │   ├── entrypoints/             # New Tab dashboard, background service worker, popup, content script
│   │   ├── src/shared/              # Extension-only adapters (browser.storage.local, native bookmark reader)
│   │   ├── package.json
│   │   └── wxt.config.ts
│   └── mobile/                      # @timber/mobile Tauri v2 + Next.js 14 Android application
│       ├── src/app/                 # Next.js App Router layout, styles, and main view
│       ├── src-tauri/               # Tauri v2 Rust host, capabilities, and generated Android project
│       ├── next.config.mjs          # Static export configuration (output: "export")
│       ├── package.json
│       └── tailwind.config.ts
├── scripts/
│   └── watch-verify.mjs             # Automated cross-package typecheck and unit test watcher
├── .gitignore
├── package.json                     # Yarn Workspaces root manifest and scripts
├── PROJECT_OVERVIEW.md              # Single source of truth for project status and architecture
└── README.md
```

## Scripts and Commands Reference

### Root Scripts (`Timber/package.json`)

| Command                | Description                                                                                   |
| ---------------------- | --------------------------------------------------------------------------------------------- |
| `yarn install`         | Install dependencies across all workspaces and link `@timber/core`                            |
| `yarn watch`           | Watch all packages and run type-checks + unit tests on save (`node scripts/watch-verify.mjs`) |
| `yarn typecheck`       | Run `tsc --noEmit` across `@timber/core`, `@timber/extension`, and `@timber/mobile`           |
| `yarn test`            | Run `@timber/core` unit test suites                                                           |
| `yarn test:watch`      | Run `@timber/core` unit tests in continuous watch mode                                        |
| `yarn dev:extension`   | Start WXT development server for Chrome MV3                                                   |
| `yarn build:extension` | Build production Chrome MV3 extension bundle                                                  |
| `yarn android:reverse` | Forward Android device port `3000` to PC (`adb reverse tcp:3000 tcp:3000`) |
| `yarn dev:mobile` | Run Tauri Android development build on `127.0.0.1` (`apps/mobile` `android:dev`) |
| `yarn build:mobile` | Build Tauri Android production package (`tauri android build`) |

### Per-Workspace Scripts (`yarn workspace <pkg> <script>`)

| Workspace           | Command                                          | Description                                                                  |
| ------------------- | ------------------------------------------------ | ---------------------------------------------------------------------------- |
| `@timber/core`      | `yarn workspace @timber/core compile`            | Type-check `@timber/core` (`tsc --noEmit`)                                   |
| `@timber/core`      | `yarn workspace @timber/core test`               | Run unit tests (`node --experimental-strip-types --test "src/**/*.test.ts"`) |
| `@timber/extension` | `yarn workspace @timber/extension compile`       | Type-check the WXT browser extension (`tsc --noEmit`)                        |
| `@timber/extension` | `yarn workspace @timber/extension dev`           | Start Chrome MV3 extension dev server                                        |
| `@timber/extension` | `yarn workspace @timber/extension dev:brave`     | Start Brave MV3 extension dev server                                         |
| `@timber/extension` | `yarn workspace @timber/extension dev:firefox`   | Start Firefox extension dev server                                           |
| `@timber/extension` | `yarn workspace @timber/extension build`         | Build production Chrome MV3 extension                                        |
| `@timber/extension` | `yarn workspace @timber/extension build:firefox` | Build production Firefox extension                                           |
| `@timber/extension` | `yarn workspace @timber/extension zip`           | Package Chrome MV3 and Firefox extension `.zip` archives                     |
| `@timber/mobile`    | `yarn workspace @timber/mobile compile`          | Type-check the Next.js mobile app (`tsc --noEmit`)                           |
| `@timber/mobile`    | `yarn workspace @timber/mobile next-start`       | Start Next.js frontend dev server on port 3000                               |
| `@timber/mobile` | `yarn workspace @timber/mobile next-build` | Build static Next.js frontend export to `apps/mobile/out` |
| `@timber/mobile` | `yarn workspace @timber/mobile android:reverse` | Tunnel device port `3000` over ADB (`adb reverse tcp:3000 tcp:3000`) |
| `@timber/mobile` | `yarn workspace @timber/mobile android:dev` | Run Tauri Android dev build bound to `127.0.0.1` |
| `@timber/mobile` | `yarn workspace @timber/mobile tauri` | Run Tauri CLI commands for `@timber/mobile` |                            |

## Testing

All pure domain, URL normalization, layout, ordering, and backup parsing tests live in `packages/core/src/**/*.test.ts` and use Node's built-in test runner (`node:test` and `node:assert/strict`).

```bash
# Run all unit tests once
yarn test

# Or run directly inside the @timber/core workspace
yarn workspace @timber/core test

# Run unit tests in watch mode
yarn test:watch
```

## Contributing

1. Create a short-lived branch from `main` (`feat/short-description`, `fix/short-description`, `refactor/short-description`).
2. Keep files small and single-purpose, keep pure logic in `@timber/core`, and isolate side effects in `apps/extension` or `apps/mobile`.
3. Add a one-line summary comment above public functions and write unit tests for new logic.
4. Confirm `yarn typecheck` and `yarn test` pass before committing with Conventional Commits (`feat:`, `fix:`, `refactor:`, `test:`, `docs:`, `chore:`).

## License

MIT License — Copyright (c) 2026 Parikshit Roy. See [apps/extension/LICENSE](./apps/extension/LICENSE) for full license text.
