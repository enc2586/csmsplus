import {
  type CustomFetch,
  type GetLabelsResponse,
  type GetSectionsResponse,
  TodoistApi,
  TodoistRequestError,
} from "@doist/todoist-sdk";

export type TaskFields = {
  content: string;
  description: string;
  deadlineDate: string | null;
  labels: string[];
};

// The sync rules only need these calls, which keeps them testable without the SDK.
export type TodoistGateway = {
  findOrCreateProject(name: string): Promise<string>;
  findOrCreateSection(projectId: string, name: string): Promise<string>;
  getLabels(): Promise<string[]>;
  // Tasks take labels by name, so missing ones are created first rather than left to chance.
  createMissingLabels(names: string[]): Promise<void>;
  addTask(projectId: string, sectionId: string | null, fields: TaskFields): Promise<string>;
  updateTask(taskId: string, fields: Partial<TaskFields>): Promise<void>;
  moveTask(taskId: string, sectionId: string): Promise<void>;
  closeTask(taskId: string): Promise<void>;
  deleteTask(taskId: string): Promise<void>;
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
  const getLabels = async () => {
    const names: string[] = [];
    let cursor: string | null = null;
    do {
      const page: GetLabelsResponse = await api.getLabels({ cursor });
      names.push(...page.results.map((label) => label.name));
      cursor = page.nextCursor;
    } while (cursor);
    return names;
  };
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
    async findOrCreateSection(projectId, name) {
      let cursor: string | null = null;
      do {
        const page: GetSectionsResponse = await gone(api.getSections({ projectId, cursor }));
        const found = page.results.find((section) => section.name === name && !section.isArchived);
        if (found) return found.id;
        cursor = page.nextCursor;
      } while (cursor);
      return (await gone(api.addSection({ projectId, name }))).id;
    },
    getLabels,
    async createMissingLabels(names) {
      const existing = new Set(await getLabels());
      for (const name of names) {
        if (!existing.has(name)) await api.addLabel({ name });
      }
    },
    async addTask(projectId, sectionId, { deadlineDate, ...fields }) {
      const task = await gone(
        api.addTask({
          ...fields,
          projectId,
          sectionId: sectionId ?? undefined,
          deadlineDate: deadlineDate ?? undefined,
        }),
      );
      return task.id;
    },
    async updateTask(taskId, fields) {
      await gone(api.updateTask(taskId, fields));
    },
    async moveTask(taskId, sectionId) {
      await gone(api.moveTask(taskId, { sectionId }));
    },
    async closeTask(taskId) {
      await gone(api.closeTask(taskId));
    },
    async deleteTask(taskId) {
      await gone(api.deleteTask(taskId));
    },
  };
}
