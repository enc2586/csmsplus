import { describe, expect, it } from "vite-plus/test";
import { createTodoistGateway, TaskGoneError } from "./client.ts";

type Call = { method: string; path: string; body: unknown };

function fakeFetch(respond: (call: Call) => { status?: number; body: unknown }) {
  const calls: Call[] = [];
  const fetchImpl = async (url: string, init?: RequestInit) => {
    const call = {
      method: init?.method ?? "GET",
      path: new URL(url).pathname + new URL(url).search,
      body: init?.body ? JSON.parse(String(init.body)) : undefined,
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
  content: "[자료구조] 과제 1",
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

describe("createTodoistGateway", () => {
  it("sends the deadline and project in Todoist's API v1 format", async () => {
    const { calls, fetchImpl } = fakeFetch(() => ({ body: rawTask }));
    const todoist = createTodoistGateway("token", fetchImpl);
    await todoist.addTask("p1", {
      content: "[자료구조] 과제 1",
      description: "d",
      deadlineDate: "2026-10-09",
    });
    expect(calls[0]).toMatchObject({
      method: "POST",
      path: "/api/v1/tasks",
      body: {
        project_id: "p1",
        content: "[자료구조] 과제 1",
        description: "d",
        deadline_date: "2026-10-09",
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

  it("reports a task deleted in Todoist", async () => {
    const { fetchImpl } = fakeFetch(() => ({ status: 404, body: { error: "Task not found" } }));
    await expect(createTodoistGateway("token", fetchImpl).closeTask("t1")).rejects.toBeInstanceOf(
      TaskGoneError,
    );
  });
});
