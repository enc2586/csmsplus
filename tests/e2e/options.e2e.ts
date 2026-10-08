import { expect, test } from "./extension.ts";

test("options page saves settings and clears only cached assignments", async ({
  context,
  extensionId,
  storage,
}) => {
  await storage.set({
    assignment_1: { id: "1", timestamp: Date.now() },
    excludedAssignment_6: true,
    notified_1_24: true,
  });
  const page = await context.newPage();
  page.on("dialog", (dialog) => dialog.accept());
  await page.goto(`chrome-extension://${extensionId}/src/options/index.html`);

  await expect(page.locator("#tracker-urgentThresholdHours")).toHaveValue("72");
  await expect(page.locator("#pdfdl-enable")).toBeChecked();
  await expect(page).toHaveScreenshot("options-settings.png", { fullPage: true });

  const threshold = page.locator("#tracker-urgentThresholdHours");
  await threshold.fill("0");
  await page.locator("#save-btn").click();
  expect(await storage.get()).not.toHaveProperty("options");

  await threshold.fill("24");
  await page.locator("#notifications-hoursBefore").fill("3, 48 3, 0");
  await page.locator("#save-btn").click();
  await expect
    .poll(async () => (await storage.get()).options)
    .toMatchObject({
      tracker: { urgentThresholdHours: 24 },
      notifications: { enable: false, hoursBefore: [48, 3] },
    });

  await page.locator("#clear-cache-btn").click();
  await expect
    .poll(async () => Object.keys(await storage.get()).sort())
    .toEqual(["excludedAssignment_6", "notified_1_24", "options"]);

  await page.locator("nav").getByText("Patch Notes").click();
  // A released version, so the text does not change with upcoming notes.
  await expect(page.getByText("대시보드 로딩 속도 및 진행률 표시줄 개선")).toBeVisible();
});

test("turning Todoist on syncs right away and reports the result", async ({
  context,
  extensionId,
}) => {
  const page = await context.newPage();
  await page.goto(`chrome-extension://${extensionId}/src/options/index.html`);
  // Chrome's permission prompt cannot be clicked from a test, and the background run is
  // covered by the sync unit tests, so both ends are stubbed to check the page in between.
  await page.evaluate(() => {
    const sent: unknown[] = [];
    Object.assign(window, { sent });
    chrome.permissions.request = async () => true;
    chrome.runtime.sendMessage = (async (request: unknown) => {
      sent.push(request);
      return { state: "ok", at: Date.now(), added: 3, updated: 0, closed: 1 };
    }) as typeof chrome.runtime.sendMessage;
  });

  await page.locator("#todoist-enable").click();
  await page.locator("#todoist-token").fill("token");
  await page.locator("#save-btn").click();
  const toast = page.locator("[data-sonner-toast]");
  await expect(toast).toContainText("Todoist와 동기화했습니다.");
  await expect(toast).toContainText("과제 3개 추가 · 1개 완료 처리");
  await expect(toast).toHaveScreenshot("options-todoist-toast.png");

  // Saving again without touching Todoist does not sync a second time.
  await page.locator("#tracker-urgentThresholdHours").fill("24");
  await page.locator("#save-btn").click();
  await expect
    .poll(() => page.evaluate(() => (window as unknown as { sent: unknown[] }).sent))
    .toEqual([{ action: "syncTodoist" }]);
});

test("Todoist labels are picked from the user's labels or typed in", async ({
  context,
  extensionId,
  storage,
}) => {
  const page = await context.newPage();
  await page.goto(`chrome-extension://${extensionId}/src/options/index.html`);
  await page.evaluate(() => {
    chrome.permissions.request = async () => true;
    chrome.runtime.sendMessage = (async (request: { action: string }) =>
      request.action === "todoistLabels"
        ? { labels: ["과제", "CSMS+", "시험"] }
        : null) as typeof chrome.runtime.sendMessage;
  });

  const picker = page.locator("#todoist-labels");
  await expect(picker).toBeDisabled();
  await page.locator("#todoist-enable").click();
  await page.locator("#todoist-token").fill("token");
  await picker.click();
  const list = page.locator("[data-slot=command]");
  // CSMS+ is always added, so it is not offered.
  await expect(list.getByRole("option")).toHaveText(["과제", "시험"]);
  await list.getByRole("option", { name: "과제" }).click();
  await list.getByRole("combobox").fill("주간");
  await list.getByRole("option", { name: '"주간" 새 라벨로 추가' }).click();
  await expect(page.locator("[data-slot=popover-content]")).toHaveScreenshot(
    "options-todoist-labels.png",
  );
  await page.keyboard.press("Escape");
  await expect(picker).toHaveText("과제주간");

  await page.locator("#save-btn").click();
  await expect
    .poll(async () => (await storage.get()).options)
    .toMatchObject({ todoist: { labels: ["과제", "주간"] } });
});
