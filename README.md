# Timber

Timber is a cross-browser New Tab bookmark dashboard extension for Chrome, Brave, and Firefox that unifies your bookmarks into a single deduplicated, searchable catalog with nestable folders, drag-and-drop ordering, and portable backups.

## Features

- **Unified New Tab Dashboard:** Replaces the browser's New Tab page with an organized grid of folders and standalone links.
- **Cross-Browser Bookmark Deduplication:** Normalizes URLs so identical bookmarks imported from Brave, Chrome, or Firefox collapse into one canonical record.
- **User-Controlled Sync Review:** Never overwrites your layout automatically—use **Scan** to review new native browser bookmarks and pick which ones to import.
- **Nestable Folders & Bulk Editing:** Create folders and sub-folders at any depth, file bookmarks into multiple folders, and bulk-edit, copy, or delete folder links.
- **Custom Drag-and-Drop & A–Z Ordering:** Switch into **Edit** mode to drag tiles into any order, or sort folders and links A–Z / Z–A at both the root level and inside every folder.
- **Portable JSON Backups & HTML Export:** Export full JSON backups (with non-destructive **Merge** or full **Replace** restore modes) or standard Netscape `.html` bookmark files.
- **Light, Dark & System Themes + Custom Backgrounds:** Follows your OS color scheme by default (or switch manually between **Light** and **Dark**), and lets you upload or link a custom background image with frosted-glass tiles.
- **Offline-First Local Storage:** Works immediately with manual links or imported backups even before granting browser bookmark permissions.

## Tech Stack

| Layer               | Technology                                                       |
| ------------------- | ---------------------------------------------------------------- |
| Extension Framework | [WXT](https://wxt.dev/) `0.21.5` (`@wxt-dev/module-react` `1.2.2`) |
| UI Library          | React `19.3.1` + React DOM `19.3.1`                              |
| Language            | TypeScript `7.0.2`                                               |
| Bundler & Runner    | Vite `8.3.5`, `web-ext` `10.8.0`                                 |
| Styling             | Tailwind CSS `4.3.4` (`@tailwindcss/vite`) + modular CSS         |
| Package Manager     | Yarn Classic (`v1`)                                              |
| Testing             | Node.js built-in test runner (`node:test`)                       |

## Prerequisites

- **Node.js:** `v22.6.0` or newer (required for running `.ts` unit tests natively with `--experimental-strip-types`)
- **Yarn:** `v1.22+` (Yarn Classic)
- **Supported Browsers:** Google Chrome / Chromium, Brave, or Mozilla Firefox

## Installation

1. Clone the repository and navigate into the project directory:

```bash
cd timber
```

2. Install dependencies (this also runs `wxt prepare` via `postinstall` to generate `.wxt` types):

```bash
yarn install
```

## Usage

### Development Mode

Start the WXT development server with hot reload for your target browser:

```bash
# Chrome / Chromium (Manifest V3)
yarn dev

# Brave (Manifest V3)
yarn dev:brave

# Firefox
yarn dev:firefox
```

### Loading the Unpacked Extension Manually

First, build the production bundle for your browser:

```bash
# Build for Chrome / Brave (outputs to .output/chrome-mv3)
yarn build

# Build for Firefox (outputs to .output/firefox-mv2)
yarn build:firefox
```

- **Chrome / Brave:**
  1. Open `chrome://extensions` (or `brave://extensions`).
  2. Enable **Developer mode** in the top-right corner.
  3. Click **Load unpacked** and select the `.output/chrome-mv3` directory.
- **Firefox:**
  1. Open `about:debugging#/runtime/this-firefox`.
  2. Click **Load Temporary Add-on...**.
  3. Select the `manifest.json` file inside `.output/firefox-mv2`.

## Permissions

Timber requests the minimum permissions required in `wxt.config.ts`:

| Permission  | Type     | Why It Is Needed                                                                                              |
| ----------- | -------- | ------------------------------------------------------------------------------------------------------------- |
| `storage`   | Required | Saves your Timber bookmark catalog, custom folders, and tile ordering locally in `browser.storage.local`.     |
| `bookmarks` | Optional | Requested only when you click **Connect Bookmarks** so Timber can read your browser's native bookmark tree.   |

## Project Structure

```text
timber/
├── entrypoints/
│   ├── background.ts                # Background service worker for bookmark change listeners and sync diffs
│   ├── content.ts                   # Placeholder content script entrypoint
│   ├── newtab/                      # New Tab dashboard React application
│   │   ├── App.tsx                  # Top-level dashboard coordinator
│   │   ├── RootGrid.tsx             # Root grid of folders and standalone links
│   │   ├── TimberFolderContents.tsx # Recursive folder contents view
│   │   ├── components/              # Focused UI components (Header, Footer, SearchResults, SubFolderTile, etc.)
│   │   ├── hooks/                   # Custom React hooks for catalog state, sync, CRUD, and backups
│   │   └── styles/                  # Feature-scoped CSS stylesheets imported by style.css
│   └── popup/                       # Placeholder extension toolbar popup
├── public/
│   └── icon/                        # Extension icons (16, 32, 48, 96, 128 px)
├── src/
│   ├── assets/
│   │   └── tailwind.css             # Tailwind CSS v4 entry point
│   └── shared/
│       ├── backup/                  # Backup creation, validation, parsing, merging, and HTML export
│       ├── bookmarks/               # URL normalizer, tree reader, layout, ordering, and repository
│       │   └── operations/          # Pure state mutation functions (bookmarks, folders, sync)
│       ├── browser/                 # Browser family detection and display names
│       ├── messages/                # Typed runtime message contracts and boundary guards
│       ├── storage/                 # browser.storage.local persistence adapter
│       ├── testing/                 # Deterministic state builders for unit tests
│       └── types/                   # Core TimberState and domain data models
├── package.json                     # Scripts and dependencies
├── tsconfig.json                    # TypeScript configuration extending .wxt/tsconfig.json
└── wxt.config.ts                    # WXT manifest and Vite/Tailwind plugin configuration
```

## Scripts and Commands

All scripts defined in `package.json`:

| Command              | Description                                                                 |
| -------------------- | --------------------------------------------------------------------------- |
| `yarn dev`           | Start development mode targeting Chrome (`wxt -b chrome --mv3`)             |
| `yarn dev:brave`     | Start development mode targeting Brave (`wxt -b chrome --mv3`)              |
| `yarn dev:firefox`   | Start development mode targeting Firefox (`wxt -b firefox`)                 |
| `yarn build`         | Build production bundle for Chrome (`wxt build -b chrome --mv3`)            |
| `yarn build:brave`   | Build production bundle for Brave (`wxt build -b chrome --mv3`)             |
| `yarn build:firefox` | Build production bundle for Firefox (`wxt build -b firefox`)                |
| `yarn zip`           | Package both Chrome MV3 and Firefox builds into `.zip` files (`wxt zip -b chrome --mv3 && wxt zip -b firefox`) |
| `yarn zip:chrome`    | Package Chrome MV3 build into a `.zip` file (`wxt zip -b chrome --mv3`)     |
| `yarn zip:brave`     | Package Brave MV3 build into a `.zip` file (`wxt zip -b chrome --mv3`)      |
| `yarn zip:firefox`   | Package Firefox build into a `.zip` file (`wxt zip -b firefox`)             |
| `yarn compile`       | Run TypeScript compiler type check without emitting files (`tsc --noEmit`)  |
| `yarn test`          | Run unit test suites (`node --experimental-strip-types --test "src/**/*.test.ts"`) |
| `yarn postinstall`   | Generate `.wxt` configuration and type declarations (`wxt prepare`)         |

## Testing

Run the unit test suites across the bookmark and backup modules:

```bash
yarn test
```

Run static type-checking across the entire project:

```bash
yarn compile
```

## Contributing

1. Create a feature or fix branch from `main` (e.g. `feat/short-description` or `fix/short-description`).
2. Keep files small and modular, add a one-line summary comment above public functions, and add unit tests for new logic.
3. Verify `yarn compile` and `yarn test` pass before committing with Conventional Commits (`feat:`, `fix:`, `refactor:`, `test:`, `docs:`).

## License

`TODO: Add a LICENSE file and specify the license (package.json currently marks the project as "private": true).`
