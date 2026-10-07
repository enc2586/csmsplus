import { writeCachedAssignment } from "../../shared/assignment/cache.ts";
import { hasSubmissionSummary, parseAssignmentDocument } from "../../shared/assignment/scrape.ts";

// Opening an assignment shows its current status, so the cache is refreshed for free and
// course pages visited next do not have to fetch it again.
const params = new URLSearchParams(location.search);
const id = params.get("id");

if (id && hasSubmissionSummary(document)) {
  void writeCachedAssignment({
    id,
    courseId: params.get("course"),
    ...parseAssignmentDocument(document),
    timestamp: Date.now(),
  });
}
