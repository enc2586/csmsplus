export const seenKey = (courseId: string) => `seenModules_${courseId}`;

export function isSeenKey(key: string): boolean {
  return key.startsWith("seenModules_");
}

export async function loadSeen(courseId: string): Promise<Set<string> | null> {
  const { [seenKey(courseId)]: seen } = await chrome.storage.local.get(seenKey(courseId));
  return Array.isArray(seen) ? new Set(seen as string[]) : null;
}

// The first visit only records what is there; nothing is new before there is something to
// compare with.
export function newModules(current: string[], seen: ReadonlySet<string> | null): string[] {
  return seen ? current.filter((id) => !seen.has(id)) : [];
}

export function markSeen(courseId: string, modules: string[]): Promise<void> {
  return chrome.storage.local.set({ [seenKey(courseId)]: modules });
}
