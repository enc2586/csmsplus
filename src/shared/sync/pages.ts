import {
  hasSubmissionSummary,
  parseAssignmentDocument,
  type ScrapedAssignment,
} from "../assignment/scrape.ts";

export const LMS = "https://lms.gist.ac.kr";

export type CourseSummary = { id: string; name: string };
export type AssignmentLink = { id: string; url: string };

export type ParsedPage =
  | { kind: "courseList"; signedIn: boolean; courses: CourseSummary[] }
  | { kind: "coursePage"; signedIn: boolean; links: AssignmentLink[]; modules: string[] }
  | { kind: "assignment"; signedIn: boolean; assignment: ScrapedAssignment | null };

export type PageKind = ParsedPage["kind"];

const normalize = (text: string | null | undefined) => text?.replace(/\s+/g, " ").trim() ?? "";

// A parsed document's base URL is the page that created the parser, not the LMS, so
// hrefs are resolved from the raw attribute.
function lmsUrl(anchor: Element): URL {
  return new URL(anchor.getAttribute("href")!, LMS);
}

export function findAssignmentLinks(root: ParentNode): AssignmentLink[] {
  const links = new Map<string, string>();
  for (const anchor of root.querySelectorAll('a[href*="mod/assign/view.php?id="]')) {
    const url = lmsUrl(anchor);
    const id = url.searchParams.get("id");
    if (id && !links.has(id)) links.set(id, url.href);
  }
  return [...links].map(([id, url]) => ({ id, url }));
}

// Every activity on a course page (assignment, file, board, ...) is an <li id="module-N">.
export function findModules(root: ParentNode): string[] {
  return [...root.querySelectorAll('li.activity[id^="module-"]')].map((li) =>
    li.id.slice("module-".length),
  );
}

export const COURSE_CARDS = ".progress_courses .course_lists ul > li";

export function courseFromCard(card: Element): CourseSummary | null {
  const link = card.querySelector("a.course_link");
  const id = link && lmsUrl(link).searchParams.get("id");
  if (!link || !id) return null;
  return {
    id,
    name: normalize(link.querySelector(".course-title, h3")?.textContent ?? link.textContent),
  };
}

export function findCourses(root: ParentNode): CourseSummary[] {
  return [...root.querySelectorAll(COURSE_CARDS)].flatMap((card) => courseFromCard(card) ?? []);
}

// Moodle answers a logged-out request with its login page instead of an error status.
export function isLoginPage(doc: Document, url: string): boolean {
  return (
    new URL(url).pathname.startsWith("/login/") ||
    doc.querySelector('input[type="password"]') !== null
  );
}

export type PageOf<K extends PageKind> = Extract<ParsedPage, { kind: K }>;

export function parsePage<K extends PageKind>(kind: K, doc: Document, url: string): PageOf<K> {
  const signedIn = !isLoginPage(doc, url);
  const page: ParsedPage =
    kind === "courseList"
      ? { kind, signedIn, courses: findCourses(doc) }
      : kind === "coursePage"
        ? { kind, signedIn, links: findAssignmentLinks(doc), modules: findModules(doc) }
        : {
            kind: "assignment",
            signedIn,
            assignment: hasSubmissionSummary(doc) ? parseAssignmentDocument(doc) : null,
          };
  // The branch above always builds the variant matching `kind`.
  return page as PageOf<K>;
}

export type PageLoader = <K extends PageKind>(kind: K, url: string) => Promise<PageOf<K> | null>;

// For pages with a DOM (content scripts). The service worker has no DOMParser and parses
// through the offscreen document instead.
export const domPageLoader: PageLoader = async (kind, url) => {
  try {
    const response = await fetch(url, { credentials: "include" });
    const doc = new DOMParser().parseFromString(await response.text(), "text/html");
    return parsePage(kind, doc, response.url || url);
  } catch {
    return null;
  }
};
