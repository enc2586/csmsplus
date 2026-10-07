import { describe, expect, it } from "vite-plus/test";
import { cn } from "./cn.ts";

describe("cn", () => {
  it("keeps pixel font sizes next to theme colors", () => {
    expect(cn("text-13 text-gray-666")).toBe("text-13 text-gray-666");
    // Separate arguments keep this order, which the formatter would otherwise sort.
    expect(cn("text-status-urgent", "text-11")).toBe("text-status-urgent text-11");
  });

  it("still resolves conflicts within a group", () => {
    expect(cn("text-13", "text-11")).toBe("text-11");
    expect(cn("text-gray-666", "text-white")).toBe("text-white");
    expect(cn("p-8", null, undefined, { "p-2": false, "p-4": true })).toBe("p-4");
  });
});
