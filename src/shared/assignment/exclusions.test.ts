import { describe, expect, it } from "vite-plus/test";
import { installFakeChrome } from "../../test-utils/fake-chrome.ts";
import { applyExclusionChanges, loadExcludedIds, setExcluded } from "./exclusions.ts";

describe("exclusions", () => {
  it("persists exclusions as individual keys", async () => {
    const { store } = installFakeChrome({
      excludedAssignment_6: true,
      excludedAssignment_7: false,
      options: {},
    });
    expect(await loadExcludedIds()).toEqual(new Set(["6"]));
    await setExcluded("1", true);
    await setExcluded("6", false);
    expect(store).toEqual({ excludedAssignment_1: true, excludedAssignment_7: false, options: {} });
  });

  it("applies storage changes without mutating the current set", () => {
    const current = new Set(["1"]);
    const next = applyExclusionChanges(current, {
      excludedAssignment_1: { oldValue: true },
      excludedAssignment_2: { newValue: true },
    });
    expect(next).toEqual(new Set(["2"]));
    expect(current).toEqual(new Set(["1"]));
    expect(applyExclusionChanges(current, { options: { newValue: {} } })).toBeNull();
  });
});
