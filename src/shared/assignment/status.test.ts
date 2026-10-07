import { describe, expect, it } from "vite-plus/test";
import { formatDeadline, getAssignmentStatus, parseDeadline, timeRemaining } from "./status.ts";

const now = new Date(2026, 8, 30, 12, 0);

describe("getAssignmentStatus", () => {
  it("uses the urgent threshold in hours", () => {
    expect(getAssignmentStatus("2026-09-30 22:00", false, 8, now)).toBe("remaining");
    expect(getAssignmentStatus("2026-09-30 22:00", false, 10, now)).toBe("urgent");
    expect(getAssignmentStatus("2026-09-30 12:00", false, 24, now)).toBe("urgent");
    expect(getAssignmentStatus("2026-09-30 11:59", false, 24, now)).toBe("overdue");
  });

  it("puts submission before the deadline check", () => {
    expect(getAssignmentStatus("2026-09-29 12:00", true, 24, now)).toBe("submitted");
  });

  it("treats a missing deadline as remaining", () => {
    expect(getAssignmentStatus(null, false, 24, now)).toBe("remaining");
  });
});

describe("parseDeadline", () => {
  it("reads both LMS date formats as local time", () => {
    expect(parseDeadline("2025-12-10 9:05")).toEqual(new Date(2025, 11, 10, 9, 5));
    expect(parseDeadline("2025년 12월 10일 (수) 23:59")).toEqual(new Date(2025, 11, 10, 23, 59));
    expect(parseDeadline("마감 없음")).toBeNull();
    expect(parseDeadline(null)).toBeNull();
  });
});

describe("formatDeadline", () => {
  it("zero-pads the numeric format and leaves others alone", () => {
    expect(formatDeadline("2025-1-5 9:05")).toBe("2025-01-05 09:05");
    expect(formatDeadline("2025년 12월 10일 23:59")).toBe("2025년 12월 10일 23:59");
  });
});

describe("timeRemaining", () => {
  it("lists only the non-zero units", () => {
    expect(timeRemaining(new Date(2026, 9, 2, 15, 5), now)).toBe("2일 3시간 5분");
    expect(timeRemaining(new Date(2026, 8, 30, 22, 0), now)).toBe("10시간");
    expect(timeRemaining(new Date(2026, 8, 30, 12, 0, 30), now)).toBe("");
    expect(timeRemaining(new Date(2026, 8, 30, 11, 0), now)).toBe("");
  });
});
