import type { AssignmentRecord } from "./cache.ts";
import { hasSubmissionSummary, parseAssignmentDocument } from "./scrape.ts";

const LMS = "https://lms.gist.ac.kr";

async function fetchDocument(url: string): Promise<Document | null> {
  try {
    const response = await fetch(url, { credentials: "include" });
    return new DOMParser().parseFromString(await response.text(), "text/html");
  } catch {
    return null;
  }
}

// A logged-out session gets the login page back instead of an error, so a page without
// the submission summary is treated as a failed fetch rather than cached.
export async function fetchAssignment(
  url: string,
  id: string,
  courseId: string | null,
): Promise<AssignmentRecord | null> {
  const doc = await fetchDocument(url);
  if (!doc || !hasSubmissionSummary(doc)) return null;
  return { id, courseId, ...parseAssignmentDocument(doc), timestamp: Date.now() };
}

export type AssignmentLink = { id: string; url: string };

export function findAssignmentLinks(root: ParentNode): AssignmentLink[] {
  const links = new Map<string, string>();
  for (const anchor of root.querySelectorAll('a[href*="mod/assign/view.php?id="]')) {
    // A parsed document's base URL is the page that created the parser, not the LMS.
    const url = new URL(anchor.getAttribute("href")!, LMS);
    const id = url.searchParams.get("id");
    if (id && !links.has(id)) links.set(id, url.href);
  }
  return [...links].map(([id, url]) => ({ id, url }));
}

export async function fetchCourseAssignmentLinks(courseId: string): Promise<AssignmentLink[]> {
  const doc = await fetchDocument(`${LMS}/course/view.php?id=${courseId}`);
  return doc ? findAssignmentLinks(doc) : [];
}
