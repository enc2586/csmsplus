import { fileURLToPath } from "node:url";
import { crx } from "@crxjs/vite-plugin";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite-plus";
import manifest from "./manifest.config.ts";

const unsupported = fileURLToPath(new URL("src/shared/unsupported-module.ts", import.meta.url));

// Generated files are skipped through .gitignore, which fmt and lint both honour.
const ignored = ["**/*.md"];

export default defineConfig({
  fmt: {
    printWidth: 100,
    ignorePatterns: ignored,
    // Class order follows our theme, and strings inside cn() are sorted like className.
    sortTailwindcss: { functions: ["cn"], stylesheet: "src/styles/tailwind.css" },
  },
  lint: {
    ignorePatterns: ignored,
    plugins: ["typescript", "oxc", "react"],
    options: { typeAware: true, typeCheck: true },
  },
  resolve: {
    // jsPDF lazily imports these for HTML/SVG rendering, which is never used here.
    alias: { html2canvas: unsupported, canvg: unsupported, dompurify: unsupported },
  },
  build: {
    // Not referenced from the manifest, so CRXJS would not build it on its own.
    rollupOptions: { input: { offscreen: "src/offscreen/index.html" } },
  },
  plugins: [react(), tailwindcss(), crx({ manifest })],
  test: {
    include: ["src/**/*.test.{ts,tsx}"],
  },
});
