export type AssignmentStatus = "submitted" | "overdue" | "urgent" | "remaining";

const HOUR = 60 * 60 * 1000;

// LMS deadlines carry no time zone; like the LMS itself they are read as local time.
export function parseDeadline(text: string | null | undefined): Date | null {
  if (!text) return null;
  const match =
    text.match(/(\d{4})-(\d{1,2})-(\d{1,2})\s+(\d{1,2}):(\d{1,2})/) ??
    text.match(/(\d{4})년\s*(\d{1,2})월\s*(\d{1,2})일.*?(\d{1,2}):(\d{2})/);
  if (!match) return null;
  const [year, month, day, hour, minute] = match.slice(1).map(Number);
  return new Date(year, month - 1, day, hour, minute);
}

export function getAssignmentStatus(
  deadline: string | null,
  isSubmitted: boolean,
  urgentThresholdHours: number,
  now = new Date(),
): AssignmentStatus {
  if (isSubmitted) return "submitted";
  const dueDate = parseDeadline(deadline);
  if (!dueDate) return "remaining";
  const diff = dueDate.getTime() - now.getTime();
  if (diff < 0) return "overdue";
  return diff <= urgentThresholdHours * HOUR ? "urgent" : "remaining";
}

export function formatDeadline(text: string): string {
  const match = text.match(/(\d{4})-(\d{1,2})-(\d{1,2})\s+(\d{1,2}):(\d{1,2})/);
  if (!match) return text;
  const [year, ...rest] = match.slice(1);
  const [month, day, hour, minute] = rest.map((part) => part.padStart(2, "0"));
  return `${year}-${month}-${day} ${hour}:${minute}`;
}

export function timeRemaining(dueDate: Date, now = new Date()): string {
  const minutes = Math.floor((dueDate.getTime() - now.getTime()) / 60_000);
  if (minutes <= 0) return "";
  const parts = [
    [Math.floor(minutes / (24 * 60)), "일"],
    [Math.floor(minutes / 60) % 24, "시간"],
    [minutes % 60, "분"],
  ] as const;
  return parts
    .filter(([value]) => value > 0)
    .map(([value, unit]) => `${value}${unit}`)
    .join(" ");
}
