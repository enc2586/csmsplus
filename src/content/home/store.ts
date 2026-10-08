import { createStore } from "zustand/vanilla";
import type { AssignmentRecord } from "../../shared/assignment/cache.ts";
import type { CourseSummary } from "../../shared/sync/pages.ts";

export type CourseProgress = {
  progress: number;
  // Null until every assignment of the course has been read from cache or fetched.
  records: AssignmentRecord[] | null;
  // Activities added since the course page was last opened.
  newCount?: number;
};

export type HomeState = {
  courses: Record<string, CourseProgress>;
  courseInfo: Record<string, CourseSummary>;
  excluded: ReadonlySet<string>;
  urgentThresholdHours: number;
};

export const homeStore = createStore<HomeState>()(() => ({
  courses: {},
  courseInfo: {},
  excluded: new Set(),
  urgentThresholdHours: 72,
}));

export function updateCourse(courseId: string, progress: CourseProgress) {
  homeStore.setState((state) => ({ courses: { ...state.courses, [courseId]: progress } }));
}
