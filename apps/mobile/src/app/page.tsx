"use client";

import { TIMBER_SCHEMA_VERSION } from "@timber/core";

/**
 * Root mobile screen entry point (placeholder before wiring useTimberCatalog in Step 5).
 */
export default function Home() {
  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100 p-4">
      <h1 className="text-lg font-semibold">Timber Mobile</h1>
      <p className="text-xs text-zinc-400">
        Schema v{TIMBER_SCHEMA_VERSION} ready
      </p>
    </main>
  );
}
