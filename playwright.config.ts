import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "tests/e2e",
  testMatch: "*.e2e.ts",
  workers: 1,
  snapshotPathTemplate: "tests/e2e/snapshots/{arg}{ext}",
  expect: { toHaveScreenshot: { animations: "disabled", maxDiffPixelRatio: 0.01 } },
});
