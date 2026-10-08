import PQueue from "p-queue";

// One request at a time with a gap between starts, so the LMS never sees a burst
// when a page lists dozens of assignments.
export function createFetchQueue(intervalMs: number): PQueue {
  return new PQueue({ concurrency: 1, interval: intervalMs, intervalCap: 1 });
}
