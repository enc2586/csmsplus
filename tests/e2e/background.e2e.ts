import { expect, test } from "./extension.ts";

const syncNow = (page: import("@playwright/test").Page) =>
  page.evaluate(() => chrome.runtime.sendMessage({ action: "syncNow" }));

test("background sync collects every course without an LMS tab", async ({
  context,
  extensionId,
  storage,
}) => {
  const page = await context.newPage();
  await page.goto(`chrome-extension://${extensionId}/src/options/index.html`);

  expect(await syncNow(page)).toMatchObject({ state: "ok" });
  const stored = await storage.get();
  expect(stored.courses).toEqual({
    "100": { id: "100", name: "자료구조", professor: "홍길동" },
  });
  for (const id of ["1", "2", "3", "4", "5", "6"]) {
    expect(stored[`assignment_${id}`]).toMatchObject({ id, courseId: "100" });
  }
  expect(await page.evaluate(() => chrome.alarms.get("sync"))).toMatchObject({
    periodInMinutes: 30,
  });
});

test("background sync reports an expired session", async ({ context, extensionId, storage }) => {
  await context.route("https://lms.gist.ac.kr/", (route) =>
    route.fulfill({
      status: 302,
      headers: { location: "https://lms.gist.ac.kr/login/index.php" },
    }),
  );
  await context.route("https://lms.gist.ac.kr/login/index.php", (route) =>
    route.fulfill({ contentType: "text/html", body: '<form><input type="password"></form>' }),
  );
  const page = await context.newPage();
  await page.goto(`chrome-extension://${extensionId}/src/options/index.html`);

  expect(await syncNow(page)).toMatchObject({ state: "signed-out" });
  expect((await storage.get()).syncStatus).toMatchObject({ state: "signed-out" });
});
