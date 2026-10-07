import * as z from "zod/mini";
import type { Options } from "../options.ts";
import type { ScrapedAssignment } from "./scrape.ts";

export type AssignmentRecord = ScrapedAssignment & {
  id: string;
  courseId: string | null;
  timestamp: number;
};

// Older versions stored isSubmitted as null when the status row was missing.
const recordSchema = z.object({
  id: z.string(),
  courseId: z.catch(z.nullable(z.string()), null),
  title: z.catch(z.string(), ""),
  content: z.catch(z.string(), ""),
  deadline: z.catch(z.nullable(z.string()), null),
  isSubmitted: z.catch(z.boolean(), false),
  timestamp: z.number(),
});

export const cacheKey = (id: string) => `assignment_${id}`;

export function isFresh(record: AssignmentRecord, advanced: Options["advanced"], now = Date.now()) {
  const ttl = record.isSubmitted ? advanced.cacheTtlSubmitted : advanced.cacheTtl;
  return now - record.timestamp < ttl;
}

export async function readCachedAssignments(ids: string[]): Promise<Map<string, AssignmentRecord>> {
  const stored = await chrome.storage.local.get(ids.map(cacheKey));
  const records = new Map<string, AssignmentRecord>();
  for (const id of ids) {
    const parsed = recordSchema.safeParse(stored[cacheKey(id)]);
    if (parsed.success) records.set(id, parsed.data);
  }
  return records;
}

export function writeCachedAssignment(record: AssignmentRecord): Promise<void> {
  return chrome.storage.local.set({ [cacheKey(record.id)]: record });
}

export function isCacheKey(key: string): boolean {
  return key.startsWith("assignment_");
}
