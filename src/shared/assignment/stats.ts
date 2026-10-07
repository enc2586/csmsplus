import { type AssignmentStatus, getAssignmentStatus } from "./status.ts";

export type StatusCounts = Record<AssignmentStatus, number>;

type Countable = { id: string; deadline: string | null; isSubmitted: boolean };

export function countStatuses(
  assignments: Iterable<Countable>,
  excluded: ReadonlySet<string>,
  urgentThresholdHours: number,
  now = new Date(),
): StatusCounts {
  const counts: StatusCounts = { submitted: 0, urgent: 0, overdue: 0, remaining: 0 };
  for (const a of assignments) {
    if (excluded.has(a.id)) continue;
    counts[getAssignmentStatus(a.deadline, a.isSubmitted, urgentThresholdHours, now)]++;
  }
  return counts;
}
