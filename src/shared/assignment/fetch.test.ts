// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vite-plus/test";
import { fetchAssignment, findAssignmentLinks } from "./fetch.ts";

afterEach(() => vi.unstubAllGlobals());

describe("findAssignmentLinks", () => {
  it("returns each assignment once with an absolute URL", () => {
    const doc = new DOMParser().parseFromString(
      `<a href="/mod/assign/view.php?id=1">a</a><a href="https://lms.gist.ac.kr/mod/assign/view.php?id=1">b</a>
       <a href="/mod/assign/view.php?id=2">c</a><a href="/mod/quiz/view.php?id=3">d</a>`,
      "text/html",
    );
    expect(findAssignmentLinks(doc)).toEqual([
      { id: "1", url: "https://lms.gist.ac.kr/mod/assign/view.php?id=1" },
      { id: "2", url: "https://lms.gist.ac.kr/mod/assign/view.php?id=2" },
    ]);
  });
});

describe("fetchAssignment", () => {
  it("does not return data for a login page", async () => {
    vi.stubGlobal("fetch", async () => new Response("<form id='login'></form>"));
    expect(
      await fetchAssignment("https://lms.gist.ac.kr/mod/assign/view.php?id=1", "1", "100"),
    ).toBeNull();
  });

  it("returns a timestamped record", async () => {
    vi.stubGlobal(
      "fetch",
      async () =>
        new Response(
          `<table class="submissionsummarytable"><tr><td class="c0">종료 일시</td><td class="c1">2026-10-01 23:59</td></tr></table>`,
        ),
    );
    const record = await fetchAssignment(
      "https://lms.gist.ac.kr/mod/assign/view.php?id=1",
      "1",
      "100",
    );
    expect(record).toMatchObject({
      id: "1",
      courseId: "100",
      deadline: "2026-10-01 23:59",
      isSubmitted: false,
    });
    expect(record?.timestamp).toBeTypeOf("number");
  });
});
