import { parse } from "date-fns";
import { describe, expect, it } from "vite-plus/test";
import type { ListedAssignment } from "./groups.ts";
import { dueReminders, reminderKey } from "./reminders.ts";

const now = parse("2026-09-30 12:00", "yyyy-MM-dd HH:mm", 0).getTime();
const item = (id: string, deadline: string | null, isSubmitted = false): ListedAssignment => ({
  id,
  url: "",
  title: `과제 ${id}`,
  courseName: "",
  professor: "",
  deadline,
  isSubmitted,
});

describe("dueReminders", () => {
  const assignments = [
    item("1", "2026-10-01 11:00"), // 23h left: past the 24h point only
    item("2", "2026-09-30 14:00"), // 2h left: past both points
    item("3", "2026-10-02 12:00"), // 48h left: nothing yet
    item("4", "2026-09-30 11:00"), // already overdue
    item("5", "2026-09-30 13:00", true), // submitted
    item("6", "2026-09-30 13:00"), // excluded
    item("7", null),
  ];

  it("picks the closest reached point and records the rest", () => {
    const reminders = dueReminders(assignments, new Set(["6"]), [24, 3], new Set(), now);
    expect(reminders.map((r) => [r.assignment.id, r.hours, r.notedHours])).toEqual([
      ["1", 24, [24]],
      ["2", 3, [24, 3]],
    ]);
  });

  it("skips points already notified", () => {
    const notified = new Set([reminderKey("1", 24), reminderKey("2", 24)]);
    const reminders = dueReminders(assignments, new Set(["6"]), [24, 3], notified, now);
    expect(reminders.map((r) => [r.assignment.id, r.hours])).toEqual([["2", 3]]);
  });
});
