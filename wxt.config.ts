import { defineConfig } from 'wxt';

// See https://wxt.dev/api/reference/wxt/interfaces/inlineconfig.html
export default defineConfig({
  modules: ['@wxt-dev/module-react'],

  manifest: {
    name: "Timber",
    description: "A universal bookmark dashboard.",

    permissions: ["storage"],
    optional_permissions: ["bookmarks"],
  }
});
