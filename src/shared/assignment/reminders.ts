import { isAfter, isBefore, subHours } from "date-fns";
import type { ListedAssignment } from "./groups.ts";
import { parseDeadline } from "./status.ts";

export const reminderKey = (id: string, hours: number) => `notified_${id}_${hours}`;

export function isReminderKey(key: string): boolean {
  return key.startsWith("notified_");
}

export type Reminder = { assignment: ListedAssignment; hours: number; notedHours: number[] };

// When several reminder points have already passed (first sync two hours before a deadline),
// only the closest one is shown, and the earlier ones are recorded so they never fire late.
export function dueReminders(
  assignments: ListedAssignment[],
  excluded: ReadonlySet<string>,
  hoursBefore: number[],
  notified: ReadonlySet<string>,
  now: number,
): Reminder[] {
  const reminders: Reminder[] = [];
  for (const assignment of assignments) {
    if (assignment.isSubmitted || excluded.has(assignment.id)) continue;
    const due = parseDeadline(assignment.deadline);
    if (!due || !isBefore(now, due)) continue;
    const reached = hoursBefore
      .filter((hours) => !isAfter(subHours(due, hours), now))
      .filter((hours) => !notified.has(reminderKey(assignment.id, hours)));
    if (reached.length === 0) continue;
    reminders.push({ assignment, hours: Math.min(...reached), notedHours: reached });
  }
  return reminders;
}
