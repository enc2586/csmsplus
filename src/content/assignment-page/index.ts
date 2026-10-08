import { writeCachedAssignment } from "../../shared/assignment/cache.ts";
import { hasSubmissionSummary, parseAssignmentDocument } from "../../shared/assignment/scrape.ts";

// Opening an assignment shows its current status, so the cache is refreshed for free and
// course pages visited next do not have to fetch it again.
const id = new URLSearchParams(location.search).get("id");

// The assignment URL carries only the module id; the course comes from the breadcrumb.
function courseId(): string | null {
  const link = document.querySelector('.breadcrumb a[href*="course/view.php?id="]');
  return link && new URL(link.getAttribute("href")!, location.href).searchParams.get("id");
}

if (id && hasSubmissionSummary(document)) {
  void writeCachedAssignment({
    id,
    courseId: courseId(),
    ...parseAssignmentDocument(document),
    timestamp: Date.now(),
  });
}
