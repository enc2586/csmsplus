import type { PageKind, PageOf } from "./sync/pages.ts";
import type { SyncStatus } from "./sync/sync-all.ts";
import type { TodoistStatus } from "./todoist/sync.ts";

// The service worker cannot parse HTML, so it hands fetched pages to the offscreen document.
export type ParseRequest = { target: "offscreen"; kind: PageKind; html: string; url: string };
export type ParseResponse<K extends PageKind = PageKind> = PageOf<K>;

export type SyncRequest = { action: "syncNow" };
export type SyncResponse = SyncStatus;

export type TodoistSyncRequest = { action: "syncTodoist" };
export type TodoistSyncResponse = TodoistStatus | null;

// The options page asks with the token being edited, which may not be saved yet.
export type TodoistLabelsRequest = { action: "todoistLabels"; token: string };
export type TodoistLabelsResponse = { labels: string[] } | { error: string };
