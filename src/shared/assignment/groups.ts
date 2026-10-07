import { differenceInMilliseconds } from "date-fns";
import { getAssignmentStatus, parseDeadline } from "./status.ts";

export type ListedAssignment = {
  id: string;
  url: string;
  title: string;
  courseName: string;
  deadline: string | null;
  isSubmitted: boolean;
};

export type AssignmentGroups = Record<
  "urgent" | "overdue" | "remaining" | "submitted" | "excluded",
  ListedAssignment[]
>;

// Soonest first; assignments without a deadline go last.
function byDeadline(now: number) {
  const left = (a: ListedAssignment) => {
    const due = parseDeadline(a.deadline);
    return due ? differenceInMilliseconds(due, now) : Number.POSITIVE_INFINITY;
  };
  return (a: ListedAssignment, b: ListedAssignment) => left(a) - left(b);
}

export function groupAssignments(
  assignments: ListedAssignment[],
  excluded: ReadonlySet<string>,
  urgentThresholdHours: number,
  now: number,
): AssignmentGroups {
  const groups: AssignmentGroups = {
    urgent: [],
    overdue: [],
    remaining: [],
    submitted: [],
    excluded: [],
  };
  for (const a of assignments) {
    if (excluded.has(a.id)) {
      groups.excluded.push(a);
      continue;
    }
    const status = getAssignmentStatus(a.deadline, a.isSubmitted, urgentThresholdHours, now);
    groups[status].push(a);
  }
  const soonest = byDeadline(now);
  groups.urgent.sort(soonest);
  groups.remaining.sort(soonest);
  groups.excluded.sort(soonest);
  // Recently missed deadlines matter more than ones long past, as on the course dashboard.
  groups.overdue.sort((a, b) => soonest(b, a));
  groups.submitted.sort((a, b) => soonest(b, a));
  return groups;
}
