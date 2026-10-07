import { parse } from "date-fns";
import { describe, expect, it } from "vite-plus/test";
import { groupAssignments, type ListedAssignment } from "./groups.ts";

const now = parse("2026-09-30 12:00", "yyyy-MM-dd HH:mm", 0).getTime();
const item = (id: string, deadline: string | null, isSubmitted = false): ListedAssignment => ({
  id,
  url: `https://lms.gist.ac.kr/mod/assign/view.php?id=${id}`,
  title: `과제 ${id}`,
  courseName: "자료구조",
  deadline,
  isSubmitted,
});
const ids = (list: ListedAssignment[]) => list.map((a) => a.id);

describe("groupAssignments", () => {
  it("splits by status and keeps excluded ones apart", () => {
    const groups = groupAssignments(
      [
        item("1", "2026-09-30 22:00"),
        item("2", "2026-09-30 13:00"),
        item("3", "2026-09-29 12:00"),
        item("4", "2026-09-30 11:00"),
        item("5", "2026-10-05 12:00"),
        item("6", null),
        item("7", "2026-10-01 12:00"),
        item("8", "2026-09-20 12:00", true),
        item("9", "2026-09-28 12:00", true),
      ],
      new Set(["7"]),
      24,
      now,
    );
    expect(ids(groups.urgent)).toEqual(["2", "1"]);
    expect(ids(groups.overdue)).toEqual(["4", "3"]);
    expect(ids(groups.remaining)).toEqual(["5", "6"]);
    expect(ids(groups.submitted)).toEqual(["9", "8"]);
    expect(ids(groups.excluded)).toEqual(["7"]);
  });
});
