import { dueReminders, isReminderKey, reminderKey } from "../shared/assignment/reminders.ts";
import { formatDeadline } from "../shared/assignment/status.ts";
import { loadTracked } from "../shared/assignment/tracked.ts";
import { LMS } from "../shared/sync/pages.ts";

const PREFIX = "deadline:";

const hasPermission = () => chrome.permissions.contains({ permissions: ["notifications"] });

export async function sendReminders(): Promise<void> {
  const { assignments, excluded, options } = await loadTracked();
  if (!options.notifications.enable || !(await hasPermission())) return;

  const stored = await chrome.storage.local.get(null);
  const notified = new Set(Object.keys(stored).filter(isReminderKey));
  const reminders = dueReminders(
    assignments,
    excluded,
    options.notifications.hoursBefore,
    notified,
    Date.now(),
  );
  for (const { assignment, hours, notedHours } of reminders) {
    await chrome.notifications.create(`${PREFIX}${assignment.id}`, {
      type: "basic",
      iconUrl: chrome.runtime.getURL("assets/icons/icon128.png"),
      title: `마감 ${hours}시간 전: ${assignment.title}`,
      message: [assignment.courseName, `${formatDeadline(assignment.deadline!)}까지`]
        .filter(Boolean)
        .join(" · "),
    });
    await chrome.storage.local.set(
      Object.fromEntries(notedHours.map((h) => [reminderKey(assignment.id, h), true])),
    );
  }
}

function openAssignment(notificationId: string) {
  if (!notificationId.startsWith(PREFIX)) return;
  const id = notificationId.slice(PREFIX.length);
  void chrome.tabs.create({ url: `${LMS}/mod/assign/view.php?id=${id}` });
  void chrome.notifications.clear(notificationId);
}

// chrome.notifications only exists once the optional permission is granted, which can happen
// after the service worker started, so the click handler is attached at either point.
export function listenForReminderClicks() {
  const attach = () => {
    if (chrome.notifications && !chrome.notifications.onClicked.hasListener(openAssignment)) {
      chrome.notifications.onClicked.addListener(openAssignment);
    }
  };
  attach();
  chrome.permissions.onAdded.addListener(attach);
}
