import { applyExclusionChanges, loadExcludedIds } from "../../shared/assignment/exclusions.ts";
import { loadOptions, watchOptions } from "../../shared/options.ts";
import { loadSeen, markSeen, newModules } from "../../shared/assignment/seen-modules.ts";
import { findModules } from "../../shared/sync/pages.ts";
import { NewChip } from "../../ui/new-chip.tsx";
import { mount } from "../mount.tsx";
import { AssignmentControls } from "./assignment-controls.tsx";
import { AssignmentInfo } from "./assignment-info.tsx";
import { Dashboard } from "./dashboard.tsx";
import { courseStore, loadAssignments, registerAssignment } from "./store.ts";

const DASHBOARD_ID = "assignment-dashboard-root";

// The dashboard <li> joins the LMS section list. Its box styles must stay weaker than the
// LMS's own section rules, as they were in the original stylesheet, so they are a plain
// class rule on the page rather than inline styles.
const DASHBOARD_BOX = `.assignment-dashboard-container {
  position: relative; list-style: none; background: #fff; border: 1px solid #e1e1e1;
  border-radius: 4px; padding: 20px; margin: 0 0 20px 0; box-shadow: none;
}`;

function linkTitle(link: HTMLAnchorElement): string {
  const clone = link.cloneNode(true) as HTMLAnchorElement;
  clone.querySelector(".accesshide")?.remove();
  return clone.textContent?.trim() ?? "";
}

function attachToLinks() {
  for (const link of document.querySelectorAll<HTMLAnchorElement>(
    'a[href*="mod/assign/view.php?id="]',
  )) {
    const id = new URL(link.href).searchParams.get("id");
    if (!id) continue;
    const title = linkTitle(link);
    registerAssignment(id, link.href, title);

    // The course overview (section 0) shows assignments as narrow cards, so they get the
    // compact layout; cards are centred while list rows indent past the activity icon.
    const compact = link.closest("#section-0") !== null;
    const card = link.closest(".course_box0") !== null;
    const parent = link.closest(".activityinstance") ?? link.parentElement!;

    const controls = document.createElement("span");
    const info = document.createElement("div");
    parent.append(controls, info);
    mount(controls, <AssignmentControls id={id} title={title} card={card} />);
    mount(info, <AssignmentInfo id={id} url={link.href} compact={compact} card={card} />);
  }
}

let unmountDashboard: (() => void) | null = null;

function showDashboard(enabled: boolean) {
  const existing = document.getElementById(DASHBOARD_ID);
  if (!enabled) {
    unmountDashboard?.();
    unmountDashboard = null;
    existing?.remove();
    return;
  }
  if (existing) return;

  const topics = document.querySelector(".course-content")?.querySelector("ul.topics, ul.weeks");
  if (!topics) return;
  const item = document.createElement("li");
  item.id = DASHBOARD_ID;
  item.className = "section main assignment-dashboard-container";
  const section0 = topics.querySelector("#section-0");
  topics.insertBefore(item, section0 ? section0.nextSibling : topics.firstChild);

  const host = document.createElement("div");
  item.append(host);
  unmountDashboard = mount(host, <Dashboard />);
}

// Opening the course page is what marks its activities as seen, so the markers show once.
async function markNewActivities(courseId: string) {
  const modules = findModules(document);
  for (const id of newModules(modules, await loadSeen(courseId))) {
    const item = document.getElementById(`module-${id}`);
    const title = item?.querySelector(".activityinstance a, a");
    if (!title) continue;
    const host = document.createElement("span");
    title.after(host);
    mount(host, <NewChip />);
  }
  await markSeen(courseId, modules);
}

async function main() {
  const style = document.createElement("style");
  style.textContent = DASHBOARD_BOX;
  document.head.append(style);
  courseStore.setState({ options: await loadOptions(), excluded: await loadExcludedIds() });
  watchOptions((options) => {
    courseStore.setState({ options });
    showDashboard(options.tracker.enableSummaryAtLecture);
  });
  chrome.storage.onChanged.addListener((changes, area) => {
    const excluded =
      area === "local" && applyExclusionChanges(courseStore.getState().excluded, changes);
    if (excluded) courseStore.setState({ excluded });
  });

  attachToLinks();
  showDashboard(courseStore.getState().options.tracker.enableSummaryAtLecture);
  const courseId = new URLSearchParams(location.search).get("id");
  if (courseId && courseStore.getState().options.tracker.markNewActivities) {
    void markNewActivities(courseId);
  }
  await loadAssignments(courseId);
}

void main();
