import { fileURLToPath } from "node:url";
import { crx } from "@crxjs/vite-plugin";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite-plus";
import manifest from "./manifest.config.ts";

const unsupported = fileURLToPath(new URL("src/shared/unsupported-module.ts", import.meta.url));

const generated = ["dist/**", "release/**", "test-results/**", "playwright-report/**", "**/*.md"];

export default defineConfig({
  fmt: {
    printWidth: 100,
    ignorePatterns: generated,
  },
  lint: {
    ignorePatterns: generated,
    plugins: ["typescript", "oxc", "react"],
    options: { typeAware: true, typeCheck: true },
  },
  resolve: {
    // jsPDF lazily imports these for HTML/SVG rendering, which is never used here.
    alias: { html2canvas: unsupported, canvg: unsupported, dompurify: unsupported },
  },
  plugins: [react(), tailwindcss(), crx({ manifest })],
  test: {
    include: ["src/**/*.test.{ts,tsx}"],
  },
});
