import { createFetchQueue } from "../shared/assignment/queue.ts";
import type { ParseRequest } from "../shared/messages.ts";
import { loadOptions } from "../shared/options.ts";
import type { PageLoader } from "../shared/sync/pages.ts";
import { type SyncStatus, syncAll } from "../shared/sync/sync-all.ts";
import { sendReminders } from "./reminders.ts";
import { runTodoist } from "./todoist.ts";

const OFFSCREEN_URL = "src/offscreen/index.html";
let creating: Promise<void> | null = null;

async function ensureParser(): Promise<void> {
  const existing = await chrome.runtime.getContexts({
    contextTypes: [chrome.runtime.ContextType.OFFSCREEN_DOCUMENT],
  });
  if (existing.length > 0) return;
  // Two loads can race to create the document, and a second createDocument call throws.
  creating ??= chrome.offscreen
    .createDocument({
      url: OFFSCREEN_URL,
      reasons: [chrome.offscreen.Reason.DOM_PARSER],
      justification: "Parse LMS pages fetched for background assignment sync.",
    })
    .finally(() => {
      creating = null;
    });
  await creating;
}

// Requests from the service worker carry the LMS session cookie because the extension holds
// host permission for the LMS, even though the cookie is SameSite=Lax.
const offscreenPageLoader: PageLoader = async (kind, url) => {
  try {
    const response = await fetch(url, { credentials: "include" });
    const html = await response.text();
    await ensureParser();
    const request: ParseRequest = { target: "offscreen", kind, html, url: response.url || url };
    return await chrome.runtime.sendMessage(request);
  } catch {
    return null;
  }
};

let running: Promise<SyncStatus> | null = null;

export function runSync(): Promise<SyncStatus> {
  running ??= (async () => {
    try {
      const options = await loadOptions();
      const status = await syncAll({
        load: offscreenPageLoader,
        queue: createFetchQueue(options.advanced.fetchInterval),
        options,
      });
      // Reminders and Todoist act on fresh data only; a failed sync leaves them for next time.
      if (status.state === "ok") {
        await sendReminders();
        await runTodoist();
      }
      return status;
    } finally {
      running = null;
    }
  })();
  return running;
}

export const SYNC_ALARM = "sync";

export async function scheduleSync(): Promise<void> {
  const { advanced } = await loadOptions();
  await chrome.alarms.create(SYNC_ALARM, { periodInMinutes: advanced.syncIntervalMinutes });
}
