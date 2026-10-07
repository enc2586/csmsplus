import type { Page } from "@playwright/test";
import { expect, test } from "./extension.ts";

const badge = (worker: import("@playwright/test").Worker) =>
  worker.evaluate(() => chrome.action.getBadgeText({}));

async function openPopup(page: Page, extensionId: string) {
  await page.setViewportSize({ width: 440, height: 600 });
  await page.goto(`chrome-extension://${extensionId}/src/popup/index.html`);
}

test("popup syncs on demand and lists assignments", async ({ context, extensionId, storage }) => {
  await storage.set({ excludedAssignment_6: true });
  const page = await context.newPage();
  await openPopup(page, extensionId);
  await expect(page.getByText("아직 불러온 과제가 없습니다.")).toBeVisible();

  await page.getByRole("button", { name: "새로고침" }).click();
  await expect(page.getByText("마감 임박 1")).toBeVisible();
  await expect(page.getByText("마감 지남 1")).toBeVisible();
  await expect(page.getByText("남음 2")).toBeVisible();
  await expect(page.getByText(/동기화$/)).toBeVisible();
  await page.screenshot({ path: "test-results/popup.png" });
});

test("badge counts urgent assignments and follows exclusions and options", async ({
  context,
  extensionId,
  storage,
  worker,
}) => {
  const page = await context.newPage();
  await openPopup(page, extensionId);
  await page.getByRole("button", { name: "새로고침" }).click();
  await expect(page.getByText("마감 임박 2")).toBeVisible();
  await expect.poll(() => badge(worker)).toBe("2");

  await storage.set({ excludedAssignment_6: true });
  await expect.poll(() => badge(worker)).toBe("1");

  await storage.set({ options: { tracker: { showBadge: false } } });
  await expect.poll(() => badge(worker)).toBe("");
});

test("popup and badge report an expired session", async ({ context, extensionId, worker }) => {
  await context.route("https://lms.gist.ac.kr/", (route) =>
    route.fulfill({ status: 302, headers: { location: "https://lms.gist.ac.kr/login/index.php" } }),
  );
  await context.route("https://lms.gist.ac.kr/login/index.php", (route) =>
    route.fulfill({ contentType: "text/html", body: '<form><input type="password"></form>' }),
  );
  const page = await context.newPage();
  await openPopup(page, extensionId);
  await page.getByRole("button", { name: "새로고침" }).click();
  await expect(page.getByText("LMS 로그인이 만료되었습니다.")).toBeVisible();
  await expect.poll(() => badge(worker)).toBe("!");
});
