import { assignments, deadlineText } from "./lms-fixtures.ts";
import { expect, renderedText, test } from "./extension.ts";

const COURSE_URL = "https://lms.gist.ac.kr/course/view.php?id=100";
const due = (id: string) => deadlineText(assignments.find((a) => a.id === id)!.hoursFromNow!);
const dates = /\d{4}-\d{2}-\d{2} \d{2}:\d{2}/;

test.beforeEach(async ({ storage }) => {
  await storage.set({ excludedAssignment_6: true });
});

test("home page shows assignment counts per course", async ({ context }) => {
  const page = await context.newPage();
  await page.goto("https://lms.gist.ac.kr/");
  const card = page.locator(".course_lists li").first();
  await expect
    .poll(() => renderedText(page, ".course_lists li"))
    .toBe("자료구조 완료 1 마감 임박 1 마감 지남 1 남음 2");
  await expect(card).toHaveScreenshot("home-course-card.png");
});

test("course page shows dashboard and per-assignment status", async ({ context, storage }) => {
  const page = await context.newPage();
  await page.goto(COURSE_URL);
  await expect
    .poll(() => renderedText(page, "#assignment-dashboard-root"), { timeout: 10_000 })
    .toBe(
      "과제 개요 1 완료 1 마감 임박 1 마감 지남 2 남음 " +
        `마감 임박 과제 마감 임박 과제 1 첫 번째 과제 설명 ${due("1")}까지 (10시간 1분 남음) ` +
        `마감 지남 과제 마감 지남 과제 2 두 번째 과제 설명 ${due("2")}까지`,
    );
  // Counts can settle before every row has loaded: assignment 5 has no deadline and is
  // "remaining" either way, and excluded ones are not counted. The loading bar leaves
  // only after all of them finish.
  await expect(page.getByRole("progressbar")).toHaveCount(0);
  const week = (n: number) => `#section-1 li:nth-child(${n}) .activityinstance`;
  expect(await renderedText(page, "#section-0 .activityinstance")).toBe(
    "과제 1 과제 추적 제외 마감 임박 10시간 1분 남음",
  );
  expect(await renderedText(page, week(1))).toBe(
    `과제 1 과제 추적 제외 마감 임박 ${due("1")}까지 (10시간 1분 남음) 첫 번째 과제 설명`,
  );
  expect(await renderedText(page, week(3))).toBe(
    `과제 3 과제 추적 제외 제출완료 ${due("3")}까지 세 번째 과제 설명`,
  );
  expect(await renderedText(page, week(5))).toBe(
    "과제 5 과제 추적 제외 미제출 마감일 정보 없음 다섯 번째 과제 설명",
  );
  expect(await renderedText(page, week(6))).toBe("과제 6 과제 다시 추적 추적 제외됨");

  const mask = [page.getByText(dates)];
  await expect(page.locator("#assignment-dashboard-root")).toHaveScreenshot(
    "course-dashboard.png",
    { mask },
  );
  await expect(page.locator("#section-0")).toHaveScreenshot("course-overview-card.png");
  await expect(page.locator("#section-1")).toHaveScreenshot("course-week-list.png", { mask });

  const cached = await storage.get();
  expect(cached.assignment_1).toMatchObject({
    id: "1",
    title: "과제 1",
    deadline: due("1"),
    isSubmitted: false,
  });
  expect(cached.assignment_3).toMatchObject({ isSubmitted: true });
});

test("course page reuses fresh caches and still loads excluded assignments", async ({
  context,
  storage,
}) => {
  const cached = Object.fromEntries(
    assignments.slice(0, 5).map((a) => [
      `assignment_${a.id}`,
      {
        id: a.id,
        courseId: "100",
        title: a.title,
        content: a.intro,
        deadline: a.hoursFromNow === null ? null : deadlineText(a.hoursFromNow),
        isSubmitted: a.submitted,
        timestamp: Date.now(),
      },
    ]),
  );
  await storage.set(cached);
  const fetched: string[] = [];
  context.on("request", (request) => {
    const url = new URL(request.url());
    if (url.pathname === "/mod/assign/view.php") fetched.push(url.searchParams.get("id")!);
  });

  const page = await context.newPage();
  await page.goto(COURSE_URL);
  await expect
    .poll(() => renderedText(page, "#assignment-dashboard-root"))
    .toContain("1 완료 1 마감 임박 1 마감 지남 2 남음");
  expect(fetched).toEqual(["6"]);
});

test("excluding an assignment syncs duplicate links and recounts", async ({ context, storage }) => {
  const page = await context.newPage();
  await page.goto(COURSE_URL);
  const dashboard = () => renderedText(page, "#assignment-dashboard-root");
  await expect.poll(dashboard).toContain("1 완료 1 마감 임박 1 마감 지남 2 남음");

  await page
    .locator("#section-1 li:nth-child(1)")
    .getByRole("button", { name: /추적 제외/ })
    .click();
  await expect.poll(dashboard).toContain("1 완료 0 마감 임박 1 마감 지남 2 남음");
  expect(await renderedText(page, "#section-0 .activityinstance")).toBe(
    "과제 1 과제 다시 추적 추적 제외됨",
  );
  expect((await storage.get()).excludedAssignment_1).toBe(true);

  await page
    .locator("#section-0")
    .getByRole("button", { name: /다시 추적/ })
    .click();
  await expect.poll(dashboard).toContain("1 완료 1 마감 임박 1 마감 지남 2 남음");
  expect(await storage.get()).not.toHaveProperty("excludedAssignment_1");
});

test("course page follows option changes", async ({ context, storage }) => {
  const page = await context.newPage();
  await page.goto(COURSE_URL);
  const dashboard = () => renderedText(page, "#assignment-dashboard-root");
  await expect.poll(dashboard).toContain("1 완료 1 마감 임박 1 마감 지남 2 남음");

  await storage.set({ options: { tracker: { urgentThresholdHours: 8 } } });
  await expect.poll(dashboard).toContain("1 완료 0 마감 임박 1 마감 지남 3 남음");
  expect(await renderedText(page, "#section-1 li:nth-child(1) .activityinstance")).toContain(
    "미제출",
  );

  await storage.set({ options: { tracker: { enableAssignmentDetail: false } } });
  await expect
    .poll(() => renderedText(page, "#section-1 li:nth-child(1) .activityinstance"))
    .toBe("과제 1 과제 추적 제외");
  expect(await renderedText(page, "#section-1 li:nth-child(6) .activityinstance")).toBe(
    "과제 6 과제 다시 추적 추적 제외됨",
  );

  await storage.set({ options: { tracker: { enableSummaryAtLecture: false } } });
  await expect(page.locator("#assignment-dashboard-root")).toHaveCount(0);
});

test("visiting an assignment page refreshes its cache", async ({ context, storage }) => {
  const page = await context.newPage();
  await page.goto("https://lms.gist.ac.kr/mod/assign/view.php?id=3");
  await expect
    .poll(async () => (await storage.get()).assignment_3)
    .toMatchObject({
      id: "3",
      title: "과제 3",
      content: "세 번째 과제 설명",
      deadline: due("3"),
      isSubmitted: true,
    });
});
