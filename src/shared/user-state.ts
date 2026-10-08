import { isExclusionKey } from "./assignment/exclusions.ts";
import { isReminderKey } from "./assignment/reminders.ts";
import { isTodoistKey } from "./todoist/sync.ts";

// What "clear cache" must keep: settings and choices, plus records whose loss would repeat
// work outside the extension (reminders sent again, Todoist tasks created twice).
export function isUserState(key: string): boolean {
  return key === "options" || isExclusionKey(key) || isReminderKey(key) || isTodoistKey(key);
}
