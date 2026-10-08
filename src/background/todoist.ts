import { TodoistRequestError } from "@doist/todoist-sdk";
import { loadTracked } from "../shared/assignment/tracked.ts";
import { createTodoistGateway } from "../shared/todoist/client.ts";
import type { TodoistLabelsResponse } from "../shared/messages.ts";
import { syncTodoist, type TodoistStatus } from "../shared/todoist/sync.ts";

export const TODOIST_ORIGIN = "https://api.todoist.com/*";

function describe(error: unknown): string {
  if (error instanceof TodoistRequestError && error.isAuthenticationError()) {
    return "API 토큰이 올바르지 않습니다.";
  }
  return error instanceof Error ? error.message : String(error);
}

async function run(): Promise<TodoistStatus | null> {
  const { assignments, excluded, options } = await loadTracked();
  const { enable, token } = options.todoist;
  if (!enable || !token) return null;
  if (!(await chrome.permissions.contains({ origins: [TODOIST_ORIGIN] }))) return null;

  let todoistStatus: TodoistStatus;
  try {
    const gateway = createTodoistGateway(token);
    const counts = await syncTodoist(assignments, excluded, gateway, options.todoist, Date.now());
    todoistStatus = { state: "ok", at: Date.now(), ...counts };
  } catch (error) {
    todoistStatus = { state: "error", message: describe(error), at: Date.now() };
  }
  await chrome.storage.local.set({ todoistStatus });
  return todoistStatus;
}

// Runs one at a time: two overlapping runs would both see an assignment without a task and
// add it twice.
let queue: Promise<unknown> = Promise.resolve();
export function runTodoist(): Promise<TodoistStatus | null> {
  const next = queue.then(run, run);
  queue = next.catch(() => {});
  return next;
}

export async function listTodoistLabels(token: string): Promise<TodoistLabelsResponse> {
  if (!(await chrome.permissions.contains({ origins: [TODOIST_ORIGIN] }))) {
    return { error: "Todoist 접근 권한이 없습니다." };
  }
  try {
    return { labels: await createTodoistGateway(token).getLabels() };
  } catch (error) {
    return { error: describe(error) };
  }
}
