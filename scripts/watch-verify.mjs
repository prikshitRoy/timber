/**
 * Cross-workspace file watcher that runs TypeScript checks and unit tests on save
 * and triggers an audible/console error notification when a change breaks any package.
 */

import { spawn } from "node:child_process";
import { existsSync, watch } from "node:fs";
import { resolve } from "node:path";

// Debounce window in milliseconds to batch rapid file saves from the editor.
const DEBOUNCE_DELAY_MS = 300;

// Directories watched relative to the Project Timber root.
const WATCH_TARGETS = [
  "packages/core/src",
  "apps/extension/src",
  "apps/extension/entrypoints",
  "apps/mobile/src",
];

let debounceTimer = null;
let isRunning = false;
let shouldReRun = false;

/**
 * Run a shell command and resolve with true if it exits with code 0.
 */
function runCommand(command, args) {
  return new Promise((resolvePromise) => {
    const child = spawn(command, args, {
      stdio: "inherit",
      shell: true,
    });

    child.on("close", (code) => {
      resolvePromise(code === 0);
    });
  });
}

/**
 * Emit a terminal bell and Windows console beep when type-checking or unit tests fail.
 */
function notifyFailure(stepName) {
  process.stderr.write("\x07");
  console.error(
    `\n[WATCH ERROR] ${stepName} failed. Check the errors above.\n`
  );

  if (process.platform === "win32") {
    spawn(
      "powershell",
      ["-NoProfile", "-Command", "[console]::beep(750, 350)"],
      {
        stdio: "ignore",
      }
    );
  }
}

/**
 * Execute full workspace type-checking followed by unit tests, queueing a re-run if files changed mid-flight.
 */
async function executeVerification(changedPath) {
  if (isRunning) {
    shouldReRun = true;
    return;
  }

  isRunning = true;
  console.log(
    `\n[WATCH] Change detected in ${changedPath}. Verifying workspace...`
  );

  const typecheckPassed = await runCommand("yarn", ["typecheck"]);
  if (!typecheckPassed) {
    notifyFailure("TypeScript typecheck (core / extension / mobile)");
  } else {
    const testsPassed = await runCommand("yarn", ["test"]);
    if (!testsPassed) {
      notifyFailure("Unit test suite (@timber/core)");
    } else {
      console.log("\n[WATCH PASS] All packages compiled and tests passed.\n");
    }
  }

  isRunning = false;
  if (shouldReRun) {
    shouldReRun = false;
    void executeVerification("queued changes");
  }
}

/**
 * Register recursive fs.watch listeners on all workspace source directories.
 */
function startWatcher() {
  for (const relativeDir of WATCH_TARGETS) {
    const fullPath = resolve(process.cwd(), relativeDir);
    if (!existsSync(fullPath)) continue;

    watch(fullPath, { recursive: true }, (_eventType, filename) => {
      if (
        !filename ||
        (!filename.endsWith(".ts") && !filename.endsWith(".tsx"))
      ) {
        return;
      }

      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        void executeVerification(`${relativeDir}/${filename}`);
      }, DEBOUNCE_DELAY_MS);
    });
  }

  console.log(
    "[WATCH] Watching @timber/core, @timber/extension, and @timber/mobile..."
  );
  void executeVerification("initial startup");
}

startWatcher();
