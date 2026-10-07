import { createStore } from "zustand/vanilla";
import type { AssignmentRecord } from "../../shared/assignment/cache.ts";

export type CourseProgress = {
  progress: number;
  // Null until every assignment of the course has been read from cache or fetched.
  records: AssignmentRecord[] | null;
};

export type HomeState = {
  courses: Record<string, CourseProgress>;
  courseNames: Record<string, string>;
  excluded: ReadonlySet<string>;
  urgentThresholdHours: number;
};

export const homeStore = createStore<HomeState>()(() => ({
  courses: {},
  courseNames: {},
  excluded: new Set(),
  urgentThresholdHours: 72,
}));

export function updateCourse(courseId: string, progress: CourseProgress) {
  homeStore.setState((state) => ({ courses: { ...state.courses, [courseId]: progress } }));
}
