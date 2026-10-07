import type { CourseSummary } from "../sync/pages.ts";
import { LMS } from "../sync/pages.ts";
import type { SyncStatus } from "../sync/sync-all.ts";
import { parseOptions, type Options } from "../options.ts";
import { isCacheKey } from "./cache.ts";
import { excludedIdsIn } from "./exclusions.ts";
import type { ListedAssignment } from "./groups.ts";

export type TrackedSnapshot = {
  assignments: ListedAssignment[];
  excluded: ReadonlySet<string>;
  options: Options;
  syncStatus: SyncStatus | null;
};

type CachedRecord = {
  id: string;
  courseId: string | null;
  title?: string;
  deadline: string | null;
  isSubmitted: boolean;
};

// Everything outside a course page (popup, badge) reads the whole cache at once. Cached
// assignments from courses no longer on the home page (past semesters) are left out once
// the course list is known.
export async function loadTracked(): Promise<TrackedSnapshot> {
  const stored = await chrome.storage.local.get(null);
  const courses = (stored.courses ?? {}) as Record<string, CourseSummary>;
  const knownCourses = Object.keys(courses).length > 0;

  const assignments = Object.entries(stored)
    .filter(([key]) => isCacheKey(key))
    .map(([, value]) => value as CachedRecord)
    .filter((record) => !knownCourses || (record.courseId !== null && record.courseId in courses))
    .map((record) => ({
      id: record.id,
      url: `${LMS}/mod/assign/view.php?id=${record.id}`,
      title: record.title || `과제 ${record.id}`,
      courseName: record.courseId ? (courses[record.courseId]?.name ?? "") : "",
      deadline: record.deadline,
      isSubmitted: record.isSubmitted === true,
    }));

  return {
    assignments,
    excluded: excludedIdsIn(stored),
    options: parseOptions(stored.options),
    syncStatus: (stored.syncStatus as SyncStatus | undefined) ?? null,
  };
}
