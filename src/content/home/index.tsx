import { applyExclusionChanges, loadExcludedIds } from "../../shared/assignment/exclusions.ts";
import { createFetchQueue } from "../../shared/assignment/queue.ts";
import { loadOptions, watchOptions } from "../../shared/options.ts";
import {
  COURSE_CARDS,
  courseFromCard,
  domPageLoader,
  findCourses,
} from "../../shared/sync/pages.ts";
import { SignedOutError, type SyncContext, syncCourse } from "../../shared/sync/sync-all.ts";
import { mount } from "../mount.tsx";
import { CourseStats } from "./course-stats.tsx";
import { GlobalProgressBar } from "./global-progress-bar.tsx";
import { homeStore, updateCourse } from "./store.ts";

type Course = { id: string; card: HTMLElement };

function findCards(): Course[] {
  return [...document.querySelectorAll(COURSE_CARDS)].flatMap((li) => {
    const course = courseFromCard(li);
    const card = li.querySelector("div");
    return course && card ? [{ id: course.id, card }] : [];
  });
}

async function loadCourse(courseId: string, context: SyncContext) {
  updateCourse(courseId, { progress: 0, records: null });
  try {
    const records = await syncCourse(courseId, context, (progress) =>
      updateCourse(courseId, { progress, records: null }),
    );
    updateCourse(courseId, { progress: 1, records });
  } catch (error) {
    if (!(error instanceof SignedOutError)) throw error;
    updateCourse(courseId, { progress: 1, records: [] });
  }
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

  // The home page already lists every course by name, so the list is saved for screens that
  // show assignments outside their course page.
  void chrome.storage.local.set({
    courses: Object.fromEntries(findCourses(document).map((course) => [course.id, course])),
  });
  const courses = findCards();
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

  const context: SyncContext = {
    load: domPageLoader,
    queue: createFetchQueue(options.advanced.fetchInterval),
    options,
  };
  for (const { id } of courses) void loadCourse(id, context);
}

void main();
