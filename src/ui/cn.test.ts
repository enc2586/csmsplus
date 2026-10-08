import { describe, expect, it } from "vite-plus/test";
import { cn } from "./cn.ts";

describe("cn", () => {
  it("keeps a font size next to a text color", () => {
    expect(cn("text-[13px] text-muted-foreground")).toBe("text-[13px] text-muted-foreground");
    expect(cn("text-sm text-status-urgent")).toBe("text-sm text-status-urgent");
  });

  it("still resolves conflicts within a group", () => {
    expect(cn("text-[13px]", "text-xs")).toBe("text-xs");
    expect(cn("text-muted-foreground", "text-white")).toBe("text-white");
    expect(cn("p-2", null, undefined, { "p-0.5": false, "p-1": true })).toBe("p-1");
  });
});
