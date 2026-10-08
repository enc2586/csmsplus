import { describe, expect, it } from "vite-plus/test";
import { createTodoistGateway, TaskGoneError } from "./client.ts";

type Call = { method: string; path: string; body: unknown };

function fakeFetch(respond: (call: Call) => { status?: number; body: unknown }) {
  const calls: Call[] = [];
  const fetchImpl = async (url: string, init?: RequestInit) => {
    const call = {
      method: init?.method ?? "GET",
      path: new URL(url).pathname + new URL(url).search,
      // The SDK sends JSON text bodies.
      body: typeof init?.body === "string" ? JSON.parse(init.body) : undefined,
    };
    calls.push(call);
    const { status = 200, body } = respond(call);
    return new Response(JSON.stringify(body), {
      status,
      headers: { "content-type": "application/json" },
    });
  };
  return { calls, fetchImpl };
}

// Shaped like Todoist API v1 responses; the SDK validates them before returning.
const rawTask = {
  id: "t1",
  user_id: "u1",
  project_id: "p1",
  section_id: null,
  parent_id: null,
  added_by_uid: "u1",
  assigned_by_uid: null,
  responsible_uid: null,
  labels: [],
  deadline: { date: "2026-10-09", lang: "ko" },
  duration: null,
  checked: false,
  is_deleted: false,
  added_at: "2026-09-30T03:00:00.000000Z",
  completed_at: null,
  updated_at: "2026-09-30T03:00:00.000000Z",
  due: null,
  priority: 1,
  child_order: 1,
  content: "과제 1",
  description: "d",
  day_order: 1,
  is_collapsed: false,
  is_uncompletable: false,
};
const rawProject = (id: string, name: string) => ({
  id,
  name,
  color: "charcoal",
  child_order: 1,
  parent_id: null,
  is_favorite: false,
  is_shared: false,
  inbox_project: false,
  view_style: "list",
  can_assign_tasks: false,
  is_archived: false,
  is_deleted: false,
  is_frozen: false,
  created_at: "2026-09-30T03:00:00.000000Z",
  updated_at: "2026-09-30T03:00:00.000000Z",
  default_order: 1,
  description: "",
  is_collapsed: false,
});

const rawSection = (id: string, name: string) => ({
  id,
  name,
  user_id: "u1",
  project_id: "p1",
  added_at: "2026-09-30T03:00:00.000000Z",
  updated_at: "2026-09-30T03:00:00.000000Z",
  archived_at: null,
  description: null,
  section_order: 1,
  is_archived: false,
  is_deleted: false,
  is_collapsed: false,
});

const rawLabel = (id: string, name: string) => ({
  id,
  name,
  color: "charcoal",
  order: 1,
  is_favorite: false,
});

describe("createTodoistGateway", () => {
  it("sends the deadline and project in Todoist's API v1 format", async () => {
    const { calls, fetchImpl } = fakeFetch(() => ({ body: rawTask }));
    const todoist = createTodoistGateway("token", fetchImpl);
    await todoist.addTask("p1", "s1", {
      content: "과제 1",
      description: "d",
      deadlineDate: "2026-10-09",
      labels: ["CSMS+"],
    });
    expect(calls[0]).toMatchObject({
      method: "POST",
      path: "/api/v1/tasks",
      body: {
        project_id: "p1",
        section_id: "s1",
        content: "과제 1",
        description: "d",
        deadline_date: "2026-10-09",
        labels: ["CSMS+"],
      },
    });
  });

  it("finds an existing project before creating one", async () => {
    const { calls, fetchImpl } = fakeFetch((call) =>
      call.path.startsWith("/api/v1/projects") && call.method === "GET"
        ? { body: { results: [rawProject("p9", "CSMS+")], next_cursor: null } }
        : { body: rawProject("new", "CSMS+") },
    );
    expect(await createTodoistGateway("token", fetchImpl).findOrCreateProject("CSMS+")).toBe("p9");
    expect(calls.map((c) => c.method)).toEqual(["GET"]);
  });

  it("finds a course section in the project before creating one", async () => {
    const { calls, fetchImpl } = fakeFetch((call) =>
      call.method === "GET"
        ? { body: { results: [rawSection("s9", "자료구조")], next_cursor: null } }
        : { body: rawSection("new", "선형대수") },
    );
    const todoist = createTodoistGateway("token", fetchImpl);
    expect(await todoist.findOrCreateSection("p1", "자료구조")).toBe("s9");
    expect(await todoist.findOrCreateSection("p1", "선형대수")).toBe("new");
    expect(calls.map((c) => `${c.method} ${c.path}`)).toEqual([
      "GET /api/v1/sections?project_id=p1",
      "GET /api/v1/sections?project_id=p1",
      "POST /api/v1/sections",
    ]);
    expect(calls[2]?.body).toEqual({ project_id: "p1", name: "선형대수" });
  });

  it("creates only the labels that do not exist yet", async () => {
    const { calls, fetchImpl } = fakeFetch((call) =>
      call.method === "GET"
        ? { body: { results: [rawLabel("l1", "CSMS+")], next_cursor: null } }
        : { body: rawLabel("l2", "과제") },
    );
    await createTodoistGateway("token", fetchImpl).createMissingLabels(["CSMS+", "과제"]);
    expect(calls.map((c) => `${c.method} ${c.path}`)).toEqual([
      "GET /api/v1/labels",
      "POST /api/v1/labels",
    ]);
    expect(calls[1]?.body).toEqual({ name: "과제" });
  });

  it("reports a task deleted in Todoist", async () => {
    const { fetchImpl } = fakeFetch(() => ({ status: 404, body: { error: "Task not found" } }));
    await expect(createTodoistGateway("token", fetchImpl).closeTask("t1")).rejects.toBeInstanceOf(
      TaskGoneError,
    );
  });
});
