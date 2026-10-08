import { readFileSync } from "node:fs";
import path from "node:path";
import {
  test as base,
  chromium,
  expect,
  type BrowserContext,
  type Page,
  type Worker,
} from "@playwright/test";
import {
  assignmentPage,
  coursePage,
  documentPage,
  homePage,
  PDF_DOC,
  resetFixtureTime,
} from "./lms-fixtures.ts";

const distDir = path.resolve("dist");
const pdfPages = ["icon16.png", "icon48.png", "icon128.png"].map((file) =>
  readFileSync(path.resolve("assets/icons", file)),
);

type Fixtures = {
  context: BrowserContext;
  worker: Worker;
  extensionId: string;
  storage: {
    get: () => Promise<Record<string, unknown>>;
    set: (items: Record<string, unknown>) => Promise<void>;
  };
};

export const test = base.extend<Fixtures>({
  // Playwright reads fixture dependencies from this destructuring pattern, so it must stay.
  // oxlint-disable-next-line no-empty-pattern
  context: async ({}, use) => {
    resetFixtureTime();
    const context = await chromium.launchPersistentContext("", {
      channel: "chromium",
      timezoneId: "Asia/Seoul",
      locale: "ko-KR",
      viewport: { width: 1000, height: 900 },
      acceptDownloads: true,
      args: [`--disable-extensions-except=${distDir}`, `--load-extension=${distDir}`],
    });
    await context.route("https://lms.gist.ac.kr/**", (route) => {
      const url = new URL(route.request().url());
      const html = (body: string) =>
        route.fulfill({ contentType: "text/html; charset=utf-8", body });
      if (url.pathname === "/" || url.pathname === "/index.php") return html(homePage());
      if (url.pathname === "/course/view.php") return html(coursePage());
      if (url.pathname === "/mod/assign/view.php")
        return html(assignmentPage(url.searchParams.get("id")!));
      if (url.pathname.startsWith("/local/ubdoc/")) return html(documentPage());
      return route.fulfill({ status: 404, body: "" });
    });
    await context.route("https://doc.coursemos.co.kr/**", (route) => {
      const url = new URL(route.request().url());
      const match = url.pathname.match(
        new RegExp(`^${PDF_DOC.rs}/${PDF_DOC.fn}\\.files/(\\d+)\\.png$`),
      );
      const image = match ? pdfPages[Number(match[1]) - 1] : undefined;
      if (image) return route.fulfill({ contentType: "image/png", body: image });
      if (url.pathname.startsWith("/view/"))
        return route.fulfill({ contentType: "text/html", body: "<p>viewer</p>" });
      return route.fulfill({ status: 404, body: "" });
    });
    await use(context);
    await context.close();
  },
  worker: async ({ context }, use) => {
    const worker = context.serviceWorkers()[0] ?? (await context.waitForEvent("serviceworker"));
    // Installing starts a background sync that fills the cache. Waiting for it and clearing
    // storage gives every test the same empty starting point.
    await expect
      .poll(() => worker.evaluate(() => chrome.storage.local.get("syncStatus")), {
        timeout: 15_000,
      })
      .toHaveProperty("syncStatus");
    await worker.evaluate(() => chrome.storage.local.clear());
    await use(worker);
  },
  extensionId: async ({ worker }, use) => {
    await use(new URL(worker.url()).host);
  },
  storage: async ({ worker }, use) => {
    await use({
      get: () => worker.evaluate(() => chrome.storage.local.get(null)),
      set: (items) => worker.evaluate((value) => chrome.storage.local.set(value), items),
    });
  },
});

export { expect } from "@playwright/test";

// Reads rendered text through open shadow roots, so assertions hold for both the
// legacy light-DOM UI and the shadow-DOM rewrite.
export async function renderedText(page: Page, selector: string): Promise<string> {
  const text = await page
    .locator(selector)
    .first()
    .evaluate((root) => {
      const parts: string[] = [];
      const walk = (node: Node) => {
        if (node.nodeType === Node.TEXT_NODE) {
          parts.push(node.textContent ?? "");
          return;
        }
        if (!(node instanceof Element)) return;
        if (
          node instanceof HTMLElement &&
          (node.hidden || getComputedStyle(node).display === "none")
        ) {
          return;
        }
        if (["STYLE", "SCRIPT"].includes(node.tagName)) return;
        const children = node.shadowRoot ? node.shadowRoot.childNodes : node.childNodes;
        parts.push(" ");
        children.forEach(walk);
        parts.push(" ");
      };
      walk(root);
      return parts.join("").replace(/\s+/g, " ").trim();
    });
  // "10시간 1분 남음" becomes "10시간 남음": the minutes depend on when in the minute a test
  // happens to render, while hours and days are what the assertions are about.
  return text.replace(/(\d+(?:일|시간)) \d+분 남음/g, "$1 남음");
}
