import { isBefore } from "date-fns";
import type { ListedAssignment } from "../assignment/groups.ts";
import { formatDeadline, parseDeadline } from "../assignment/status.ts";
import { type TaskFields, TaskGoneError, type TodoistGateway } from "./client.ts";
import { toTodoistDeadline } from "./deadline.ts";

export type TaskLink = {
  taskId: string;
  deadlineDate: string | null;
  description: string;
  // Missing on tasks added before courses became sections; null when there is no course.
  sectionId?: string | null;
  state: "open" | "closed" | "deleted";
};

export type TodoistCounts = { added: number; updated: number; closed: number; removed: number };
export type TodoistStatus = {
  state: "ok" | "error";
  message?: string;
  at: number;
} & Partial<TodoistCounts>;

export const taskKey = (assignmentId: string) => `todoistTask_${assignmentId}`;
export const PROJECT_KEY = "todoistProject";
// Marks tasks as managed by the extension, so users know the LMS will keep changing them.
export const TASK_LABEL = "CSMS+";

export function isTodoistKey(key: string): boolean {
  return key.startsWith("todoistTask_") || key === PROJECT_KEY;
}

export function taskFields(a: ListedAssignment): TaskFields {
  return {
    content: a.title,
    // The deadline field has no time, so the real one stays readable in the description.
    description: [a.url, a.deadline ? `${formatDeadline(a.deadline)}까지` : ""]
      .filter(Boolean)
      .join("\n"),
    deadlineDate: toTodoistDeadline(a.deadline),
    labels: [TASK_LABEL],
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

// Tasks follow the LMS: created for open assignments under a section per course, moved when
// the deadline moves, completed once submitted, and deleted when the assignment is excluded
// from tracking. Tasks the user deleted in Todoist are left alone, and assignments already
// past their deadline are not added late.
export async function syncTodoist(
  assignments: ListedAssignment[],
  excluded: ReadonlySet<string>,
  gateway: TodoistGateway,
  projectName: string,
  now: number,
): Promise<TodoistCounts> {
  const counts: TodoistCounts = { added: 0, updated: 0, closed: 0, removed: 0 };
  const stored = await chrome.storage.local.get(assignments.map((a) => taskKey(a.id)));
  const sections = new Map<string, Promise<string>>();
  const sectionId = async (courseName: string) => {
    if (!courseName) return null;
    const project = await projectId(gateway, projectName);
    if (!sections.has(courseName)) {
      sections.set(courseName, gateway.findOrCreateSection(project, courseName));
    }
    return sections.get(courseName)!;
  };

  for (const a of assignments) {
    const key = taskKey(a.id);
    const link = stored[key] as TaskLink | undefined;
    if (excluded.has(a.id)) {
      if (link?.state !== "open") continue;
      try {
        await gateway.deleteTask(link.taskId);
        counts.removed++;
      } catch (error) {
        if (!(error instanceof TaskGoneError)) throw error;
      }
      // Forgetting the link lets the task come back if the assignment is tracked again.
      await chrome.storage.local.remove(key);
      continue;
    }
    if (link && link.state !== "open") continue;
    const fields = taskFields(a);

    try {
      if (!link) {
        const due = parseDeadline(a.deadline);
        if (a.isSubmitted || (due && isBefore(due, now))) continue;
        const section = await sectionId(a.courseName);
        const project = await projectId(gateway, projectName);
        const taskId = await gateway.addTask(project, section, fields);
        const created: TaskLink = { taskId, ...pick(fields), sectionId: section, state: "open" };
        await chrome.storage.local.set({ [key]: created });
        counts.added++;
      } else if (a.isSubmitted) {
        await gateway.closeTask(link.taskId);
        await chrome.storage.local.set({ [key]: { ...link, state: "closed" } });
        counts.closed++;
      } else if (link.sectionId === undefined) {
        // Earlier tasks sat in the project root with a "[course] " title prefix and no label.
        const section = await sectionId(a.courseName);
        if (section) await gateway.moveTask(link.taskId, section);
        await gateway.updateTask(link.taskId, fields);
        await chrome.storage.local.set({ [key]: { ...link, ...pick(fields), sectionId: section } });
        counts.updated++;
      } else if (
        link.deadlineDate !== fields.deadlineDate ||
        link.description !== fields.description
      ) {
        // Only the deadline and description follow the LMS; a title the user edited is kept.
        await gateway.updateTask(link.taskId, pick(fields));
        await chrome.storage.local.set({ [key]: { ...link, ...pick(fields) } });
        counts.updated++;
      }
    } catch (error) {
      if (!(error instanceof TaskGoneError)) throw error;
      if (link) {
        await chrome.storage.local.set({ [key]: { ...link, state: "deleted" } });
        continue;
      }
      // Adding failed because the saved project was deleted; look it up again next sync.
      await chrome.storage.local.remove(PROJECT_KEY);
      return counts;
    }
  }
  return counts;
}

const pick = ({ deadlineDate, description }: TaskFields) => ({ deadlineDate, description });
