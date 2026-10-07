import { readFileSync } from "node:fs";
import { crx } from "@crxjs/vite-plugin";
import { defineConfig, type Plugin } from "vite-plus";
import manifest, { contentScriptFiles } from "./manifest.config.ts";

// The legacy scripts share globals through window.GistAssignmentTracker and depend
// on manifest order. CRXJS's default loader imports each file asynchronously, which
// can reorder them, so they are built as self-contained IIFEs instead.

// options.html loads options.js as a classic script and fetches patch_notes.json at
// runtime, so Vite never sees either file. Removed once the options page is rewritten.
function legacyOptionsAssets(): Plugin {
  return {
    name: "legacy-options-assets",
    generateBundle() {
      for (const file of ["src/options/options.js", "src/options/patch_notes.json"]) {
        this.emitFile({ type: "asset", fileName: file, source: readFileSync(file) });
      }
    },
  };
}

// Shrinks as each legacy file is replaced by its rewrite.
const legacyFiles = [
  "src/background/background.js",
  "src/features/**",
  "src/options/options.{html,css,js}",
  "src/options/patch_notes.json",
  "tests/tracker-check.cjs",
  "tests/tracker-layout.html",
];
const generated = ["dist/**", "release/**", "test-results/**", "playwright-report/**", "**/*.md"];

export default defineConfig({
  fmt: {
    printWidth: 100,
    ignorePatterns: [...generated, ...legacyFiles],
  },
  lint: {
    ignorePatterns: [...generated, ...legacyFiles],
    plugins: ["typescript", "oxc"],
    options: { typeAware: true, typeCheck: true },
  },
  plugins: [
    crx({ manifest, contentScripts: { standaloneFiles: contentScriptFiles } }),
    legacyOptionsAssets(),
  ],
  test: {
    include: ["src/**/*.test.{ts,tsx}"],
  },
});
