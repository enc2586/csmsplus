import { describe, expect, it } from "vite-plus/test";
import { msToNaturalLanguage } from "./duration.ts";

describe("msToNaturalLanguage", () => {
  it("shows the largest unit only", () => {
    expect(msToNaturalLanguage(500)).toBe("500ms");
    expect(msToNaturalLanguage(30_000)).toBe("30초");
    expect(msToNaturalLanguage(60_000)).toBe("1분");
    expect(msToNaturalLanguage(90 * 60_000)).toBe("1시간");
    expect(msToNaturalLanguage(3 * 86_400_000)).toBe("3일");
  });

  it("adds the day count next to weeks", () => {
    expect(msToNaturalLanguage(7 * 86_400_000)).toBe("1주 (7일)");
    expect(msToNaturalLanguage(17 * 86_400_000)).toBe("2주 (17일)");
  });
});
