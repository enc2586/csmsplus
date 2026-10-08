import { describe, expect, it } from "vite-plus/test";
import { installFakeChrome } from "../test-utils/fake-chrome.ts";
import { DEFAULT_OPTIONS, loadOptions, parseOptions, watchOptions } from "./options.ts";

describe("parseOptions", () => {
  it("fills every missing field with its default", () => {
    expect(parseOptions(undefined)).toEqual(DEFAULT_OPTIONS);
    expect(parseOptions({ tracker: { showBody: false } })).toEqual({
      ...DEFAULT_OPTIONS,
      tracker: { ...DEFAULT_OPTIONS.tracker, showBody: false },
    });
  });

  it("replaces only the invalid fields", () => {
    const options = parseOptions({
      tracker: { urgentThresholdHours: 0, showBody: "yes" },
      advanced: { fetchInterval: 5, cacheTtl: 2000 },
    });
    expect(options.tracker.urgentThresholdHours).toBe(72);
    expect(options.tracker.showBody).toBe(true);
    expect(options.advanced).toEqual({ ...DEFAULT_OPTIONS.advanced, cacheTtl: 2000 });
  });

  it("falls back to defaults for non-object values", () => {
    expect(parseOptions("broken")).toEqual(DEFAULT_OPTIONS);
    expect(parseOptions({ tracker: null })).toEqual(DEFAULT_OPTIONS);
  });
});

describe("storage", () => {
  it("loads stored options and reports later changes", async () => {
    const { local } = installFakeChrome({ options: { tracker: { urgentThresholdHours: 24 } } });
    expect((await loadOptions()).tracker.urgentThresholdHours).toBe(24);

    const seen: number[] = [];
    const stop = watchOptions((options) => seen.push(options.tracker.urgentThresholdHours));
    await local.set({ options: { tracker: { urgentThresholdHours: 8 } } });
    await local.set({ other: 1 });
    stop();
    await local.set({ options: { tracker: { urgentThresholdHours: 12 } } });
    expect(seen).toEqual([8]);
  });
});
