import { beforeEach, describe, expect, it } from "vite-plus/test";
import { parse } from "date-fns";
import { installFakeChrome } from "../../test-utils/fake-chrome.ts";
import type { ListedAssignment } from "../assignment/groups.ts";
import { type TaskFields, TaskGoneError, type TodoistGateway } from "./client.ts";
import { PROJECT_KEY, syncTodoist, taskKey } from "./sync.ts";

const now = parse("2026-09-30 12:00", "yyyy-MM-dd HH:mm", 0).getTime();
const item = (id: string, deadline: string | null, isSubmitted = false): ListedAssignment => ({
  id,
  url: `https://lms.gist.ac.kr/mod/assign/view.php?id=${id}`,
  title: `과제 ${id}`,
  courseName: "자료구조",
  professor: "",
  deadline,
  isSubmitted,
});

function fakeTodoist() {
  const calls: string[] = [];
  const gone = new Set<string>();
  let next = 1;
  const gateway: TodoistGateway = {
    async findOrCreateProject(name) {
      calls.push(`project ${name}`);
      return "p1";
    },
    async addTask(projectId, fields: TaskFields) {
      calls.push(`add ${projectId} ${fields.content} ${fields.deadlineDate}`);
      return `t${next++}`;
    },
    async updateTask(taskId, fields) {
      if (gone.has(taskId)) throw new TaskGoneError("not found");
      calls.push(`update ${taskId} ${fields.deadlineDate}`);
    },
    async closeTask(taskId) {
      if (gone.has(taskId)) throw new TaskGoneError("not found");
      calls.push(`close ${taskId}`);
    },
  };
  return { gateway, calls, gone };
}

describe("syncTodoist", () => {
  let store: Record<string, unknown>;
  beforeEach(() => {
    store = installFakeChrome().store;
  });

  it("adds open assignments once, with the deadline a day early", async () => {
    const { gateway, calls } = fakeTodoist();
    const assignments = [
      item("1", "2026-10-10 23:59"),
      item("2", null),
      item("3", "2026-09-29 12:00"), // already overdue: not added late
      item("4", "2026-10-10 23:59", true), // submitted
      item("5", "2026-10-10 23:59"), // excluded
    ];
    await syncTodoist(assignments, new Set(["5"]), gateway, "CSMS+", now);
    await syncTodoist(assignments, new Set(["5"]), gateway, "CSMS+", now);
    expect(calls).toEqual([
      "project CSMS+",
      "add p1 [자료구조] 과제 1 2026-10-09",
      "add p1 [자료구조] 과제 2 null",
    ]);
    expect(store[taskKey("1")]).toMatchObject({
      taskId: "t1",
      deadlineDate: "2026-10-09",
      state: "open",
    });
    expect(store[PROJECT_KEY]).toEqual({ name: "CSMS+", id: "p1" });
  });

  it("moves the deadline, completes on submission and respects deleted tasks", async () => {
    const { gateway, calls, gone } = fakeTodoist();
    await syncTodoist(
      [item("1", "2026-10-10 23:59"), item("2", "2026-10-11 23:59"), item("3", "2026-10-12 23:59")],
      new Set(),
      gateway,
      "CSMS+",
      now,
    );
    calls.length = 0;
    gone.add("t3");

    const later = [
      item("1", "2026-10-12 23:59"),
      item("2", "2026-10-11 23:59", true),
      item("3", "2026-10-15 23:59"),
    ];
    await syncTodoist(later, new Set(), gateway, "CSMS+", now);
    await syncTodoist(later, new Set(), gateway, "CSMS+", now);
    expect(calls).toEqual(["update t1 2026-10-11", "close t2"]);
    expect(store[taskKey("2")]).toMatchObject({ state: "closed" });
    expect(store[taskKey("3")]).toMatchObject({ state: "deleted" });
  });

  it("looks the project up again when it was deleted", async () => {
    const { gateway } = fakeTodoist();
    store[PROJECT_KEY] = { name: "CSMS+", id: "gone" };
    gateway.addTask = async () => {
      throw new TaskGoneError("project not found");
    };
    await syncTodoist([item("1", "2026-10-10 23:59")], new Set(), gateway, "CSMS+", now);
    expect(store).not.toHaveProperty(PROJECT_KEY);
    expect(store).not.toHaveProperty(taskKey("1"));
  });
});
