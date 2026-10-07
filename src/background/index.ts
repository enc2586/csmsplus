import { watchOptions } from "../shared/options.ts";
import { BADGE_ALARM, updateBadge } from "./badge.ts";
import { listenForReminderClicks, sendReminders } from "./reminders.ts";
import { runSync, SYNC_ALARM, scheduleSync } from "./sync.ts";

// Document viewer images are on doc.coursemos.co.kr, which the content script cannot
// fetch across origins, so the service worker downloads them and returns base64.
async function downloadImage(url: string) {
  try {
    const response = await fetch(url);
    if (!response.ok) return { success: false, status: response.status };
    const bytes = new Uint8Array(await response.arrayBuffer());
    let binary = "";
    for (const byte of bytes) binary += String.fromCharCode(byte);
    return { success: true, data: btoa(binary) };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
}

chrome.runtime.onMessage.addListener((request, _sender, sendResponse) => {
  if (request.action === "downloadImage") {
    void downloadImage(request.url).then(sendResponse);
  } else if (request.action === "syncNow") {
    void runSync().then(sendResponse);
  } else {
    return;
  }
  // Keeps the message channel open for the asynchronous response.
  return true;
});

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === SYNC_ALARM) void runSync().then(sendReminders);
  if (alarm.name === BADGE_ALARM) {
    void updateBadge();
    void sendReminders();
  }
});

// Alarms survive browser restarts but not every update, so they are re-registered here.
function scheduleAll() {
  void chrome.alarms.create(BADGE_ALARM, { periodInMinutes: 5 });
  void updateBadge();
  return scheduleSync();
}
chrome.runtime.onInstalled.addListener(() => {
  void scheduleAll().then(runSync);
});
chrome.runtime.onStartup.addListener(() => {
  void scheduleAll();
});
watchOptions(() => void scheduleSync());
listenForReminderClicks();

// Sync results, exclusions and options all live in storage, so any change can move the count.
chrome.storage.onChanged.addListener((_changes, area) => {
  if (area === "local") void updateBadge();
});
