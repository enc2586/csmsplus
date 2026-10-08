import { describe, expect, it } from "vite-plus/test";
import { toTodoistDeadline } from "./deadline.ts";

describe("toTodoistDeadline", () => {
  it("uses the day before the LMS deadline", () => {
    expect(toTodoistDeadline("2026-10-10 23:59")).toBe("2026-10-09");
    expect(toTodoistDeadline("2026-10-10 00:00")).toBe("2026-10-09");
    expect(toTodoistDeadline("2025년 12월 10일 (수) 23:59")).toBe("2025-12-09");
  });

  it("crosses month, year and leap day boundaries", () => {
    expect(toTodoistDeadline("2026-03-01 09:00")).toBe("2026-02-28");
    expect(toTodoistDeadline("2028-03-01 09:00")).toBe("2028-02-29");
    expect(toTodoistDeadline("2027-01-01 10:00")).toBe("2026-12-31");
  });

  it("leaves assignments without a deadline undated", () => {
    expect(toTodoistDeadline(null)).toBeNull();
    expect(toTodoistDeadline("마감 없음")).toBeNull();
  });
});
