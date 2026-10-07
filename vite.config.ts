import { crx } from "@crxjs/vite-plugin";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite-plus";
import manifest, { legacyContentScripts } from "./manifest.config.ts";

// Shrinks as each legacy file is replaced by its rewrite.
const legacyFiles = ["src/features/**"];
const generated = ["dist/**", "release/**", "test-results/**", "playwright-report/**", "**/*.md"];

export default defineConfig({
  fmt: {
    printWidth: 100,
    ignorePatterns: [...generated, ...legacyFiles],
  },
  lint: {
    ignorePatterns: [...generated, ...legacyFiles],
    plugins: ["typescript", "oxc", "react"],
    options: { typeAware: true, typeCheck: true },
  },
  plugins: [
    react(),
    tailwindcss(),
    // The legacy PDF scripts share a global (window.PDFLib) and depend on manifest order.
    // CRXJS's default loader imports each file asynchronously, which can reorder them, so
    // they are built as self-contained IIFEs instead.
    crx({ manifest, contentScripts: { standaloneFiles: legacyContentScripts } }),
  ],
  test: {
    include: ["src/**/*.test.{ts,tsx}"],
  },
});
