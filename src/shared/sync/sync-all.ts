import type PQueue from "p-queue";
import {
  type AssignmentRecord,
  isFresh,
  readCachedAssignments,
  writeCachedAssignment,
} from "../assignment/cache.ts";
import type { Options } from "../options.ts";
import { type AssignmentLink, type CourseSummary, LMS, type PageLoader } from "./pages.ts";

export type SyncContext = { load: PageLoader; queue: PQueue; options: Options };

export type SyncStatus = { state: "ok" | "signed-out" | "error"; at: number };

export class SignedOutError extends Error {
  constructor() {
    super("The LMS session has expired.");
  }
}

// Each assignment is read from cache while fresh and fetched otherwise; failed fetches are
// skipped rather than cached, so they are retried on the next sync.
export async function syncCourse(
  courseId: string,
  { load, queue, options }: SyncContext,
  onProgress?: (progress: number) => void,
): Promise<AssignmentRecord[]> {
  const page = await queue.add(() => load("coursePage", `${LMS}/course/view.php?id=${courseId}`));
  if (page && !page.signedIn) throw new SignedOutError();
  const links = page?.links ?? [];
  if (links.length === 0) {
    onProgress?.(1);
    return [];
  }

  const cached = await readCachedAssignments(links.map((link) => link.id));
  const records: AssignmentRecord[] = [];
  const missing: AssignmentLink[] = [];
  for (const link of links) {
    const hit = cached.get(link.id);
    if (hit && isFresh(hit, options.advanced)) records.push(hit);
    else missing.push(link);
  }
  let processed = records.length;
  onProgress?.(processed / links.length);

  for (const link of missing) {
    const result = await queue.add(() => load("assignment", link.url));
    if (result && !result.signedIn) throw new SignedOutError();
    if (result?.assignment) {
      const record = { id: link.id, courseId, ...result.assignment, timestamp: Date.now() };
      records.push(record);
      await writeCachedAssignment(record);
    }
    processed++;
    onProgress?.(processed / links.length);
  }
  return records;
}

export async function loadCourses(): Promise<Record<string, CourseSummary>> {
  const { courses } = await chrome.storage.local.get("courses");
  return (courses as Record<string, CourseSummary> | undefined) ?? {};
}

async function syncCourses(context: SyncContext): Promise<SyncStatus["state"]> {
  const list = await context.queue.add(() => context.load("courseList", `${LMS}/`));
  if (!list) return "error";
  if (!list.signedIn) return "signed-out";
  await chrome.storage.local.set({
    courses: Object.fromEntries(list.courses.map((course) => [course.id, course])),
  });
  for (const course of list.courses) await syncCourse(course.id, context);
  return "ok";
}

export async function syncAll(context: SyncContext): Promise<SyncStatus> {
  let state: SyncStatus["state"];
  try {
    state = await syncCourses(context);
  } catch (error) {
    state = error instanceof SignedOutError ? "signed-out" : "error";
  }
  const syncStatus: SyncStatus = { state, at: Date.now() };
  await chrome.storage.local.set({ syncStatus });
  return syncStatus;
}
