import { describe, expect, it } from "vite-plus/test";
import { installFakeChrome } from "../../test-utils/fake-chrome.ts";
import { loadSeen, markSeen, newModules } from "./seen-modules.ts";

describe("newModules", () => {
  it("reports nothing on the first visit", () => {
    expect(newModules(["1", "2"], null)).toEqual([]);
  });

  it("reports modules added since the last visit", async () => {
    installFakeChrome();
    await markSeen("100", ["1", "2"]);
    expect(newModules(["1", "2", "3"], await loadSeen("100"))).toEqual(["3"]);
    expect(await loadSeen("200")).toBeNull();
  });
});
