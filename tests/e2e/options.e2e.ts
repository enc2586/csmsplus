import { expect, test } from "./extension.ts";

test("options page saves settings and clears only cached assignments", async ({
  context,
  extensionId,
  storage,
}) => {
  await storage.set({
    assignment_1: { id: "1", timestamp: Date.now() },
    excludedAssignment_6: true,
  });
  const page = await context.newPage();
  page.on("dialog", (dialog) => dialog.accept());
  await page.goto(`chrome-extension://${extensionId}/src/options/options.html`);

  await expect(page.locator("#tracker-urgentThresholdHours")).toHaveValue("72");
  await expect(page.locator("#pdfdl-enable")).toBeChecked();
  await expect(page).toHaveScreenshot("options-settings.png", { fullPage: true });

  const threshold = page.locator("#tracker-urgentThresholdHours");
  await threshold.fill("0");
  await page.locator("#save-btn").click();
  expect(await storage.get()).not.toHaveProperty("options");

  await threshold.fill("24");
  await page.locator("#save-btn").click();
  await expect
    .poll(async () => (await storage.get()).options)
    .toMatchObject({ tracker: { urgentThresholdHours: 24 } });

  await page.locator("#clear-cache-btn").click();
  await expect
    .poll(async () => Object.keys(await storage.get()).sort())
    .toEqual(["excludedAssignment_6", "options"]);

  await page.locator("nav").getByText("Patch Notes").click();
  await expect(page.getByText("과제 상태 구분 및 추적 제외 기능 추가")).toBeVisible();
});
