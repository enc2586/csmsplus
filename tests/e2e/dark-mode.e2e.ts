import type { Page } from "@playwright/test";
import { expect, test } from "./extension.ts";

// Relative luminance of a computed "rgb(r, g, b)" colour, 0 (black) to 1 (white).
const luminance = (rgb: string) => {
  const [r, g, b] = rgb
    .match(/\d+(\.\d+)?/g)!
    .slice(0, 3)
    .map(Number);
  return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
};

const colours = (page: Page) =>
  page.evaluate(() => {
    const host = document.querySelector("#assignment-dashboard-root > div")!;
    const row = host.shadowRoot!.querySelector("a")!;
    return {
      page: getComputedStyle(document.body).backgroundColor,
      dashboardRow: getComputedStyle(row).backgroundColor,
    };
  });

test("dark mode darkens LMS pages and the extension's own UI", async ({ context, storage }) => {
  const page = await context.newPage();
  await page.goto("https://lms.gist.ac.kr/course/view.php?id=100");
  await expect(page.getByText("마감 임박 과제", { exact: true })).toBeVisible();
  const light = await colours(page);
  expect(luminance(light.page)).toBeGreaterThan(0.8);

  await storage.set({ options: { appearance: { darkMode: "on" } } });
  await expect.poll(async () => luminance((await colours(page)).page)).toBeLessThan(0.3);
  // The row's background transitions over 200ms, so it is polled like the page.
  await expect.poll(async () => luminance((await colours(page)).dashboardRow)).toBeLessThan(0.3);
  await page.screenshot({ path: "test-results/dark-mode.png" });

  await storage.set({ options: { appearance: { darkMode: "off" } } });
  await expect.poll(async () => luminance((await colours(page)).page)).toBeGreaterThan(0.8);
});
