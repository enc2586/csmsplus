import { createStore } from "zustand/vanilla";
import {
  type AssignmentRecord,
  isFresh,
  readCachedAssignments,
  writeCachedAssignment,
} from "../../shared/assignment/cache.ts";
import { fetchAssignment } from "../../shared/assignment/fetch.ts";
import { createFetchQueue } from "../../shared/assignment/queue.ts";
import { DEFAULT_OPTIONS, type Options } from "../../shared/options.ts";

export type Assignment = {
  id: string;
  url: string;
  // Link text, used until the assignment page provides its own title.
  linkTitle: string;
  state: "loading" | "loaded" | "failed";
  record: AssignmentRecord | null;
};

export type CourseState = {
  assignments: Record<string, Assignment>;
  excluded: ReadonlySet<string>;
  options: Options;
};

export const courseStore = createStore<CourseState>()(() => ({
  assignments: {},
  excluded: new Set(),
  options: DEFAULT_OPTIONS,
}));

function setAssignment(id: string, patch: Partial<Assignment>) {
  courseStore.setState((state) => ({
    assignments: { ...state.assignments, [id]: { ...state.assignments[id], ...patch } },
  }));
}

export function registerAssignment(id: string, url: string, linkTitle: string) {
  if (courseStore.getState().assignments[id]) return;
  setAssignment(id, { id, url, linkTitle, state: "loading", record: null });
}

// Each assignment is loaded once however many links point to it; excluded ones are
// still loaded so that tracking them again shows data immediately.
export async function loadAssignments(courseId: string | null) {
  const { assignments, options } = courseStore.getState();
  const ids = Object.keys(assignments);
  const cached = await readCachedAssignments(ids);
  const queue = createFetchQueue(options.advanced.fetchInterval);

  await Promise.all(
    ids.map(async (id) => {
      const hit = cached.get(id);
      if (hit && isFresh(hit, courseStore.getState().options.advanced)) {
        setAssignment(id, { state: "loaded", record: hit });
        return;
      }
      const record = await queue.add(() => fetchAssignment(assignments[id].url, id, courseId));
      if (!record) {
        setAssignment(id, { state: "failed" });
        return;
      }
      setAssignment(id, { state: "loaded", record });
      await writeCachedAssignment(record);
    }),
  );
}
