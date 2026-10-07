import { countStatuses } from "../shared/assignment/stats.ts";
import { loadTracked } from "../shared/assignment/tracked.ts";

export const BADGE_ALARM = "badge";

// Statuses move with the clock (remaining becomes urgent, urgent becomes overdue), so the
// badge is recomputed on a timer as well as whenever stored data changes.
export async function updateBadge(): Promise<void> {
  const { assignments, excluded, options, syncStatus } = await loadTracked();
  if (!options.tracker.showBadge) {
    await chrome.action.setBadgeText({ text: "" });
    return;
  }
  if (syncStatus?.state === "signed-out") {
    await chrome.action.setBadgeBackgroundColor({ color: "#d32f2f" });
    await chrome.action.setBadgeText({ text: "!" });
    return;
  }
  const { urgent } = countStatuses(
    assignments,
    excluded,
    options.tracker.urgentThresholdHours,
    Date.now(),
  );
  await chrome.action.setBadgeBackgroundColor({ color: "#f57c00" });
  await chrome.action.setBadgeText({ text: urgent > 0 ? String(urgent) : "" });
}
