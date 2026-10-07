import { describe, expect, it } from "vite-plus/test";
import { countStatuses } from "./stats.ts";

const now = new Date(2026, 8, 30, 12, 0);
const assignments = [
  { id: "1", deadline: "2026-09-30 22:00", isSubmitted: false },
  { id: "2", deadline: "2026-09-29 12:00", isSubmitted: false },
  { id: "3", deadline: "2026-09-29 12:00", isSubmitted: true },
  { id: "4", deadline: "2026-10-02 12:00", isSubmitted: false },
  { id: "5", deadline: null, isSubmitted: false },
  { id: "6", deadline: "2026-09-30 13:00", isSubmitted: false },
];

describe("countStatuses", () => {
  it("skips excluded assignments", () => {
    expect(countStatuses(assignments, new Set(["6"]), 24, now)).toEqual({
      submitted: 1,
      urgent: 1,
      overdue: 1,
      remaining: 2,
    });
  });

  it("follows the urgent threshold", () => {
    expect(countStatuses(assignments, new Set(["6"]), 8, now)).toMatchObject({
      urgent: 0,
      remaining: 3,
    });
  });
});
