import { isBefore } from "date-fns";
import type { ListedAssignment } from "../assignment/groups.ts";
import { formatDeadline, parseDeadline } from "../assignment/status.ts";
import { type TaskFields, TaskGoneError, type TodoistGateway } from "./client.ts";
import { toTodoistDeadline } from "./deadline.ts";

export type TaskLink = {
  taskId: string;
  deadlineDate: string | null;
  description: string;
  state: "open" | "closed" | "deleted";
};

export type TodoistStatus = { state: "ok" | "error"; message?: string; at: number };

export const taskKey = (assignmentId: string) => `todoistTask_${assignmentId}`;
export const PROJECT_KEY = "todoistProject";

export function isTodoistKey(key: string): boolean {
  return key.startsWith("todoistTask_") || key === PROJECT_KEY;
}

export function taskFields(a: ListedAssignment): TaskFields {
  return {
    content: a.courseName ? `[${a.courseName}] ${a.title}` : a.title,
    // The deadline field has no time, so the real one stays readable in the description.
    description: [a.url, a.deadline ? `${formatDeadline(a.deadline)}까지` : ""]
      .filter(Boolean)
      .join("\n"),
    deadlineDate: toTodoistDeadline(a.deadline),
  };
}

async function projectId(gateway: TodoistGateway, name: string): Promise<string> {
  const { [PROJECT_KEY]: saved } = await chrome.storage.local.get(PROJECT_KEY);
  const project = saved as { name: string; id: string } | undefined;
  if (project?.name === name) return project.id;
  const id = await gateway.findOrCreateProject(name);
  await chrome.storage.local.set({ [PROJECT_KEY]: { name, id } });
  return id;
}

// Tasks follow the LMS: created for open assignments, moved when the deadline moves, and
// completed once submitted. Excluded assignments and tasks the user deleted in Todoist are
// left alone, and assignments already past their deadline are not added late.
export async function syncTodoist(
  assignments: ListedAssignment[],
  excluded: ReadonlySet<string>,
  gateway: TodoistGateway,
  projectName: string,
  now: number,
): Promise<void> {
  const stored = await chrome.storage.local.get(assignments.map((a) => taskKey(a.id)));
  for (const a of assignments) {
    if (excluded.has(a.id)) continue;
    const key = taskKey(a.id);
    const link = stored[key] as TaskLink | undefined;
    if (link && link.state !== "open") continue;
    const fields = taskFields(a);

    try {
      if (!link) {
        const due = parseDeadline(a.deadline);
        if (a.isSubmitted || (due && isBefore(due, now))) continue;
        const taskId = await gateway.addTask(await projectId(gateway, projectName), fields);
        const created: TaskLink = { taskId, ...pick(fields), state: "open" };
        await chrome.storage.local.set({ [key]: created });
      } else if (a.isSubmitted) {
        await gateway.closeTask(link.taskId);
        await chrome.storage.local.set({ [key]: { ...link, state: "closed" } });
      } else if (
        link.deadlineDate !== fields.deadlineDate ||
        link.description !== fields.description
      ) {
        await gateway.updateTask(link.taskId, fields);
        await chrome.storage.local.set({ [key]: { ...link, ...pick(fields) } });
      }
    } catch (error) {
      if (!(error instanceof TaskGoneError)) throw error;
      if (link) {
        await chrome.storage.local.set({ [key]: { ...link, state: "deleted" } });
        continue;
      }
      // Adding failed because the saved project was deleted; look it up again next sync.
      await chrome.storage.local.remove(PROJECT_KEY);
      return;
    }
  }
}

const pick = ({ deadlineDate, description }: TaskFields) => ({ deadlineDate, description });
