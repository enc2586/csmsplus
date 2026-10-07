type Listener = (changes: Record<string, chrome.storage.StorageChange>, area: string) => void;

export function installFakeChrome(initial: Record<string, unknown> = {}) {
  const store: Record<string, unknown> = structuredClone(initial);
  const listeners = new Set<Listener>();
  const emit = (changes: Record<string, chrome.storage.StorageChange>) =>
    listeners.forEach((listener) => listener(changes, "local"));

  const local = {
    async get(keys: string | string[] | null) {
      if (keys === null) return structuredClone(store);
      const list = typeof keys === "string" ? [keys] : keys;
      return Object.fromEntries(
        list.filter((key) => key in store).map((key) => [key, structuredClone(store[key])]),
      );
    },
    async set(items: Record<string, unknown>) {
      const changes: Record<string, chrome.storage.StorageChange> = {};
      for (const [key, value] of Object.entries(items)) {
        changes[key] = { oldValue: store[key], newValue: value };
        store[key] = structuredClone(value);
      }
      emit(changes);
    },
    async remove(keys: string | string[]) {
      const changes: Record<string, chrome.storage.StorageChange> = {};
      for (const key of typeof keys === "string" ? [keys] : keys) {
        changes[key] = { oldValue: store[key] };
        delete store[key];
      }
      emit(changes);
    },
  };

  globalThis.chrome = {
    storage: {
      local,
      onChanged: {
        addListener: (listener: Listener) => listeners.add(listener),
        removeListener: (listener: Listener) => listeners.delete(listener),
      },
    },
  } as unknown as typeof chrome;

  return { store, local };
}
