import { parse } from "date-fns";
import { describe, expect, it } from "vite-plus/test";
import { formatDeadline, getAssignmentStatus, parseDeadline, timeRemaining } from "./status.ts";

const at = (text: string) => parse(text, "yyyy-MM-dd HH:mm:ss", 0);
const now = at("2026-09-30 12:00:00");

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
    expect(parseDeadline("2025-12-10 9:05")).toEqual(at("2025-12-10 09:05:00"));
    expect(parseDeadline("2025년 12월 10일 (수) 23:59")).toEqual(at("2025-12-10 23:59:00"));
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
    expect(timeRemaining(at("2026-10-02 15:05:00"), now)).toBe("2일 3시간 5분");
    expect(timeRemaining(at("2026-11-04 12:00:00"), now)).toBe("35일");
    expect(timeRemaining(at("2026-09-30 22:00:00"), now)).toBe("10시간");
    expect(timeRemaining(at("2026-09-30 12:00:30"), now)).toBe("");
    expect(timeRemaining(at("2026-09-30 11:00:00"), now)).toBe("");
  });
});
