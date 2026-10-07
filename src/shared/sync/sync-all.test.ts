import { describe, expect, it } from "vite-plus/test";
import { installFakeChrome } from "../../test-utils/fake-chrome.ts";
import { createFetchQueue } from "../assignment/queue.ts";
import { DEFAULT_OPTIONS } from "../options.ts";
import type { PageKind, PageLoader, PageOf, ParsedPage } from "./pages.ts";
import { type SyncContext, syncAll } from "./sync-all.ts";

const assignment = (deadline: string) => ({
  title: "과제",
  content: "",
  deadline,
  isSubmitted: false,
});

function context(pages: Record<string, ParsedPage>): SyncContext & { requested: string[] } {
  const requested: string[] = [];
  const load = (async (_kind: PageKind, url: string) => {
    requested.push(url.replace("https://lms.gist.ac.kr", ""));
    return pages[url.replace("https://lms.gist.ac.kr", "")] ?? null;
  }) as PageLoader;
  return { load, queue: createFetchQueue(10), options: DEFAULT_OPTIONS, requested };
}

const list: PageOf<"courseList"> = {
  kind: "courseList",
  signedIn: true,
  courses: [{ id: "100", name: "자료구조" }],
};
const course: PageOf<"coursePage"> = {
  kind: "coursePage",
  signedIn: true,
  modules: [],
  links: [
    { id: "1", url: "https://lms.gist.ac.kr/mod/assign/view.php?id=1" },
    { id: "2", url: "https://lms.gist.ac.kr/mod/assign/view.php?id=2" },
  ],
};

describe("syncAll", () => {
  it("saves courses and fetches only assignments without a fresh cache", async () => {
    const { store } = installFakeChrome({
      assignment_1: {
        id: "1",
        courseId: "100",
        ...assignment("2026-10-10 23:59"),
        timestamp: Date.now(),
      },
    });
    const ctx = context({
      "/": list,
      "/course/view.php?id=100": course,
      "/mod/assign/view.php?id=2": {
        kind: "assignment",
        signedIn: true,
        assignment: assignment("2026-10-12 23:59"),
      },
    });

    const status = await syncAll(ctx);
    expect(status.state).toBe("ok");
    expect(ctx.requested).toEqual(["/", "/course/view.php?id=100", "/mod/assign/view.php?id=2"]);
    expect(store.courses).toEqual({ "100": { id: "100", name: "자료구조" } });
    expect(store.assignment_2).toMatchObject({
      id: "2",
      courseId: "100",
      deadline: "2026-10-12 23:59",
    });
    expect(store.syncStatus).toEqual(status);
  });

  it("reports an expired session without caching the login page", async () => {
    const { store } = installFakeChrome();
    const ctx = context({
      "/": list,
      "/course/view.php?id=100": course,
      "/mod/assign/view.php?id=1": { kind: "assignment", signedIn: false, assignment: null },
    });
    expect((await syncAll(ctx)).state).toBe("signed-out");
    expect(store).not.toHaveProperty("assignment_1");

    expect((await syncAll(context({ "/": { ...list, signedIn: false } }))).state).toBe(
      "signed-out",
    );
  });

  it("reports an error when the LMS cannot be reached", async () => {
    installFakeChrome();
    expect((await syncAll(context({}))).state).toBe("error");
  });
});
