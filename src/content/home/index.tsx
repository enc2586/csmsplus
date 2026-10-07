import {
  readCachedAssignments,
  isFresh,
  writeCachedAssignment,
  type AssignmentRecord,
} from "../../shared/assignment/cache.ts";
import { applyExclusionChanges, loadExcludedIds } from "../../shared/assignment/exclusions.ts";
import {
  type AssignmentLink,
  fetchAssignment,
  fetchCourseAssignmentLinks,
} from "../../shared/assignment/fetch.ts";
import { createFetchQueue } from "../../shared/assignment/queue.ts";
import { loadOptions, type Options, watchOptions } from "../../shared/options.ts";
import { mount } from "../mount.tsx";
import { CourseStats } from "./course-stats.tsx";
import { GlobalProgressBar } from "./global-progress-bar.tsx";
import { homeStore, updateCourse } from "./store.ts";

type Course = { id: string; card: HTMLElement };

function findCourses(): Course[] {
  return [...document.querySelectorAll(".progress_courses .course_lists ul > li")].flatMap((li) => {
    const href = li.querySelector<HTMLAnchorElement>("a.course_link")?.href;
    const card = li.querySelector("div");
    const id = href ? new URL(href).searchParams.get("id") : null;
    return id && card ? [{ id, card }] : [];
  });
}

async function loadCourse(
  courseId: string,
  options: Options,
  queue: ReturnType<typeof createFetchQueue>,
) {
  updateCourse(courseId, { progress: 0, records: null });
  const links = await queue.add(() => fetchCourseAssignmentLinks(courseId));
  if (!links.length) {
    updateCourse(courseId, { progress: 1, records: [] });
    return;
  }

  const cached = await readCachedAssignments(links.map((link) => link.id));
  const records: AssignmentRecord[] = [];
  const missing: AssignmentLink[] = [];
  for (const link of links) {
    const record = cached.get(link.id);
    if (record && isFresh(record, options.advanced)) records.push(record);
    else missing.push(link);
  }
  let processed = records.length;
  updateCourse(courseId, { progress: processed / links.length, records: null });

  for (const link of missing) {
    const record = await queue.add(() => fetchAssignment(link.url, link.id, courseId));
    if (record) {
      records.push(record);
      void writeCachedAssignment(record);
    }
    processed++;
    updateCourse(courseId, { progress: processed / links.length, records: null });
  }
  updateCourse(courseId, { progress: 1, records });
}

async function main() {
  const options = await loadOptions();
  if (!options.tracker.enableSummaryAtDashboard) return;

  homeStore.setState({
    excluded: await loadExcludedIds(),
    urgentThresholdHours: options.tracker.urgentThresholdHours,
  });
  watchOptions((next) =>
    homeStore.setState({ urgentThresholdHours: next.tracker.urgentThresholdHours }),
  );
  chrome.storage.onChanged.addListener((changes, area) => {
    const excluded =
      area === "local" && applyExclusionChanges(homeStore.getState().excluded, changes);
    if (excluded) homeStore.setState({ excluded });
  });

  const courses = findCourses();
  for (const { id } of courses) updateCourse(id, { progress: 0, records: null });

  const list = document.querySelector(".progress_courses .course_lists");
  if (list) {
    const host = document.createElement("div");
    const ul = list.querySelector("ul");
    if (ul) list.insertBefore(host, ul);
    else list.prepend(host);
    mount(host, <GlobalProgressBar />);
  }

  for (const { id, card } of courses) {
    // The stats are absolutely positioned against the course card.
    card.style.setProperty("position", "relative", "important");
    const host = document.createElement("div");
    card.append(host);
    mount(host, <CourseStats courseId={id} />);
  }

  const queue = createFetchQueue(options.advanced.fetchInterval);
  for (const { id } of courses) void loadCourse(id, options, queue);
}

void main();
