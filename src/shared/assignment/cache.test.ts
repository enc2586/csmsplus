import { describe, expect, it } from "vite-plus/test";
import { installFakeChrome } from "../../test-utils/fake-chrome.ts";
import { DEFAULT_OPTIONS } from "../options.ts";
import {
  type AssignmentRecord,
  isFresh,
  readCachedAssignments,
  writeCachedAssignment,
} from "./cache.ts";

const record = (overrides: Partial<AssignmentRecord> = {}): AssignmentRecord => ({
  id: "1",
  courseId: "100",
  title: "과제 1",
  content: "",
  deadline: "2026-10-01 23:59",
  isSubmitted: false,
  timestamp: 1_000_000,
  ...overrides,
});

describe("isFresh", () => {
  it("keeps submitted assignments longer", () => {
    const later = 1_000_000 + 2 * 60 * 1000;
    expect(isFresh(record(), DEFAULT_OPTIONS.advanced, later)).toBe(false);
    expect(isFresh(record({ isSubmitted: true }), DEFAULT_OPTIONS.advanced, later)).toBe(true);
  });
});

describe("readCachedAssignments", () => {
  it("round-trips records and repairs fields older versions left empty", async () => {
    installFakeChrome({
      assignment_2: { id: "2", isSubmitted: null, deadline: null, timestamp: 5 },
      assignment_3: "bad",
    });
    await writeCachedAssignment(record());
    const cached = await readCachedAssignments(["1", "2", "3", "4"]);
    expect([...cached.keys()]).toEqual(["1", "2"]);
    expect(cached.get("1")).toEqual(record());
    expect(cached.get("2")).toMatchObject({ isSubmitted: false, title: "", courseId: null });
  });
});
