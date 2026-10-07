import { type CustomFetch, TodoistApi, TodoistRequestError } from "@doist/todoist-sdk";

export type TaskFields = { content: string; description: string; deadlineDate: string | null };

// The sync rules only need these calls, which keeps them testable without the SDK.
export type TodoistGateway = {
  findOrCreateProject(name: string): Promise<string>;
  addTask(projectId: string, fields: TaskFields): Promise<string>;
  // Only the deadline and description follow the LMS; a title the user edited is kept.
  updateTask(
    taskId: string,
    fields: Pick<TaskFields, "deadlineDate" | "description">,
  ): Promise<void>;
  closeTask(taskId: string): Promise<void>;
};

// A task the user deleted in Todoist answers 404; the sync stops touching it.
export class TaskGoneError extends Error {}

async function gone<T>(call: Promise<T>): Promise<T> {
  try {
    return await call;
  } catch (error) {
    if (error instanceof TodoistRequestError && error.httpStatusCode === 404) {
      throw new TaskGoneError(error.message);
    }
    throw error;
  }
}

type Fetch = (url: string, init?: RequestInit) => Promise<Response>;

// Handing the SDK the platform fetch keeps it off its Node transport (undici), which the
// service worker cannot run; tests pass a fake fetch through the same door.
function toCustomFetch(fetchImpl: Fetch): CustomFetch {
  return async (url, { timeout, ...init } = {}) => {
    const response = await fetchImpl(url, {
      ...init,
      signal: timeout ? AbortSignal.timeout(timeout) : init.signal,
    });
    return {
      ok: response.ok,
      status: response.status,
      statusText: response.statusText,
      headers: Object.fromEntries(response.headers),
      text: () => response.text(),
      json: () => response.json(),
      arrayBuffer: () => response.arrayBuffer(),
    };
  };
}

export function createTodoistGateway(
  token: string,
  fetchImpl: Fetch = (url, init) => fetch(url, init),
): TodoistGateway {
  const api = new TodoistApi(token, { customFetch: toCustomFetch(fetchImpl) });
  return {
    async findOrCreateProject(name) {
      let cursor: string | null = null;
      do {
        const page = await api.getProjects({ cursor });
        const found = page.results.find((project) => project.name === name);
        if (found) return found.id;
        cursor = page.nextCursor;
      } while (cursor);
      return (await api.addProject({ name })).id;
    },
    async addTask(projectId, { content, description, deadlineDate }) {
      const task = await gone(
        api.addTask({ projectId, content, description, deadlineDate: deadlineDate ?? undefined }),
      );
      return task.id;
    },
    async updateTask(taskId, { description, deadlineDate }) {
      await gone(api.updateTask(taskId, { description, deadlineDate }));
    },
    async closeTask(taskId) {
      await gone(api.closeTask(taskId));
    },
  };
}
