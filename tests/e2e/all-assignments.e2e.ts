import { assignments, deadlineText } from "./lms-fixtures.ts";
import { expect, renderedText, test } from "./extension.ts";

const due = (id: string) => deadlineText(assignments.find((a) => a.id === id)!.hoursFromNow!);

test.beforeEach(async ({ storage }) => {
  await storage.set({ excludedAssignment_6: true });
});

test("home page lists every assignment by status", async ({ context }) => {
  const page = await context.newPage();
  await page.goto("https://lms.gist.ac.kr/");
  await expect(page.getByRole("heading", { name: "전체 과제" })).toBeVisible();
  await expect(page.getByText(/강좌 \d+\/\d+ 불러옴/)).toHaveCount(0, { timeout: 10_000 });

  const list = () => renderedText(page, "section:has(> div > h2)");
  const open =
    `마감 임박 1 마감 임박 자료구조 과제 1 ${due("1")}까지 (10시간 남음) 추적 제외 ` +
    `마감 지남 1 마감 지남 자료구조 과제 2 ${due("2")}까지 추적 제외 ` +
    `남음 2 미제출 자료구조 과제 4 ${due("4")}까지 (5일 남음) 추적 제외 ` +
    "미제출 자료구조 과제 5 마감일 정보 없음 추적 제외";
  // Submitted and excluded assignments stay folded until asked for.
  expect(await list()).toBe(`전체 과제 ${open} 완료 1 추적 제외 1`);

  await page.getByRole("button", { name: "완료 1" }).click();
  await page.getByRole("button", { name: "추적 제외 1" }).click();
  expect(await list()).toBe(
    `전체 과제 ${open} ` +
      `완료 1 제출완료 자료구조 과제 3 ${due("3")}까지 추적 제외 ` +
      `추적 제외 1 제외됨 자료구조 과제 6 ${due("6")}까지 (1시간 남음) 다시 추적`,
  );
  await page.screenshot({ path: "test-results/all-assignments.png", fullPage: true });
});

test("excluding from the list moves the assignment and updates the course card", async ({
  context,
  storage,
}) => {
  const page = await context.newPage();
  await page.goto("https://lms.gist.ac.kr/");
  await expect(page.getByText(/강좌 \d+\/\d+ 불러옴/)).toHaveCount(0, { timeout: 10_000 });

  await page.getByRole("button", { name: "과제 1: 추적 제외" }).click();
  await expect.poll(async () => (await storage.get()).excludedAssignment_1).toBe(true);
  await expect
    .poll(() => renderedText(page, ".course_lists li"))
    .toBe("자료구조 완료 1 마감 임박 0 마감 지남 1 남음 2");
  // It now sits in the folded "추적 제외" section, next to the already excluded 과제 6.
  await page.getByRole("button", { name: "추적 제외 2" }).click();
  await expect(page.getByRole("button", { name: "과제 1: 다시 추적" })).toBeVisible();
});

test("the list follows its option", async ({ context, storage }) => {
  await storage.set({ options: { tracker: { enableAllAssignmentsAtDashboard: false } } });
  const page = await context.newPage();
  await page.goto("https://lms.gist.ac.kr/");
  await expect.poll(() => renderedText(page, ".course_lists li")).toContain("완료 1");
  await expect(page.getByRole("heading", { name: "전체 과제" })).toHaveCount(0);
});
