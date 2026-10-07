import * as z from "zod/mini";

const flag = (fallback: boolean) => z.catch(z.boolean(), fallback);
const positive = (fallback: number) => z.catch(z.number().check(z.positive()), fallback);
// Every field in a section has its own fallback, so `{}` parses even though its type
// does not match the section's declared input.
const section = <Shape extends z.core.$ZodLooseShape>(shape: Shape) =>
  z.prefault(z.object(shape), {} as never);

// Every field falls back on its own, so one corrupt or outdated value in storage
// never discards the rest of the user's settings.
const optionsSchema = z.object({
  pdfdl: section({ enable: flag(true) }),
  tracker: section({
    enableSummaryAtDashboard: flag(true),
    enableSummaryAtLecture: flag(true),
    enableAssignmentDetail: flag(true),
    showBody: flag(true),
    showRemainingTime: flag(true),
    urgentThresholdHours: positive(72),
  }),
  advanced: section({
    fetchInterval: z.catch(z.number().check(z.minimum(10)), 100),
    cacheTtl: positive(60 * 1000),
    cacheTtlSubmitted: positive(7 * 24 * 60 * 60 * 1000),
    // Background sync visits every course, so the LMS should not see it more often than this.
    syncIntervalMinutes: z.catch(z.number().check(z.minimum(5)), 30),
  }),
});

export type Options = z.infer<typeof optionsSchema>;

export const DEFAULT_OPTIONS: Options = optionsSchema.parse({});

export function parseOptions(stored: unknown): Options {
  return optionsSchema.safeParse(stored).data ?? DEFAULT_OPTIONS;
}

export async function loadOptions(): Promise<Options> {
  const { options } = await chrome.storage.local.get("options");
  return parseOptions(options);
}

export function saveOptions(options: Options): Promise<void> {
  return chrome.storage.local.set({ options });
}

export function watchOptions(listener: (options: Options) => void): () => void {
  const handle = (changes: Record<string, chrome.storage.StorageChange>, area: string) => {
    if (area === "local" && changes.options) listener(parseOptions(changes.options.newValue));
  };
  chrome.storage.onChanged.addListener(handle);
  return () => chrome.storage.onChanged.removeListener(handle);
}
