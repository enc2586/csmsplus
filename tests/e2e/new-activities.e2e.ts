import { addActivities } from "./lms-fixtures.ts";
import { expect, renderedText, test } from "./extension.ts";

const COURSE_URL = "https://lms.gist.ac.kr/course/view.php?id=100";

test("marks activities added since the last course page visit", async ({ context, storage }) => {
  const page = await context.newPage();
  await page.goto(COURSE_URL);
  await expect
    .poll(async () => (await storage.get()).seenModules_100)
    .toEqual(["1", "2", "3", "4", "5", "6"]);
  await expect(page.getByText("NEW", { exact: true })).toHaveCount(0);

  addActivities(["900"]);
  await page.goto("https://lms.gist.ac.kr/");
  await expect.poll(() => renderedText(page, ".course_lists li")).toContain("새 항목 1");

  await page.goto(COURSE_URL);
  await expect(page.getByText("NEW", { exact: true })).toHaveCount(1);
  expect(await renderedText(page, "#module-900")).toBe("강의자료 900 NEW");
  await expect.poll(async () => (await storage.get()).seenModules_100).toContain("900");

  await page.reload();
  await expect(page.locator("#assignment-dashboard-root")).toBeVisible();
  await expect(page.getByText("NEW", { exact: true })).toHaveCount(0);
});
