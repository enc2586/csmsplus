const PREFIX = "excludedAssignment_";

export const exclusionKey = (id: string) => `${PREFIX}${id}`;

export function isExclusionKey(key: string): boolean {
  return key.startsWith(PREFIX);
}

export function excludedIdsIn(stored: Record<string, unknown>): Set<string> {
  return new Set(
    Object.keys(stored)
      .filter((key) => isExclusionKey(key) && stored[key] === true)
      .map((key) => key.slice(PREFIX.length)),
  );
}

export async function loadExcludedIds(): Promise<Set<string>> {
  return excludedIdsIn(await chrome.storage.local.get(null));
}

/** Returns a new set when any exclusion changed, or null when none did. */
export function applyExclusionChanges(
  excluded: ReadonlySet<string>,
  changes: Record<string, chrome.storage.StorageChange>,
): Set<string> | null {
  const keys = Object.keys(changes).filter(isExclusionKey);
  if (keys.length === 0) return null;
  const next = new Set(excluded);
  for (const key of keys) {
    const id = key.slice(PREFIX.length);
    if (changes[key].newValue === true) next.add(id);
    else next.delete(id);
  }
  return next;
}

export function setExcluded(id: string, excluded: boolean): Promise<void> {
  return excluded
    ? chrome.storage.local.set({ [exclusionKey(id)]: true })
    : chrome.storage.local.remove(exclusionKey(id));
}
