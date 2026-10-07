import { TodoistRequestError } from "@doist/todoist-sdk";
import { loadTracked } from "../shared/assignment/tracked.ts";
import { createTodoistGateway } from "../shared/todoist/client.ts";
import { syncTodoist, type TodoistStatus } from "../shared/todoist/sync.ts";

export const TODOIST_ORIGIN = "https://api.todoist.com/*";

function describe(error: unknown): string {
  if (error instanceof TodoistRequestError && error.isAuthenticationError()) {
    return "API 토큰이 올바르지 않습니다.";
  }
  return error instanceof Error ? error.message : String(error);
}

export async function runTodoist(): Promise<void> {
  const { assignments, excluded, options } = await loadTracked();
  const { enable, token, projectName } = options.todoist;
  if (!enable || !token) return;
  if (!(await chrome.permissions.contains({ origins: [TODOIST_ORIGIN] }))) return;

  let todoistStatus: TodoistStatus;
  try {
    await syncTodoist(assignments, excluded, createTodoistGateway(token), projectName, Date.now());
    todoistStatus = { state: "ok", at: Date.now() };
  } catch (error) {
    todoistStatus = { state: "error", message: describe(error), at: Date.now() };
  }
  await chrome.storage.local.set({ todoistStatus });
}
