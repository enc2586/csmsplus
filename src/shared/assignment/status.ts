import {
  addHours,
  differenceInMinutes,
  format,
  formatDuration,
  isAfter,
  isBefore,
  isValid,
  parse,
} from "date-fns";
import { minutesInDay, minutesInHour } from "date-fns/constants";
import { ko } from "date-fns/locale";

export type AssignmentStatus = "submitted" | "overdue" | "urgent" | "remaining";

const NUMERIC = /(\d{4})-(\d{1,2})-(\d{1,2})\s+(\d{1,2}):(\d{1,2})/;
const KOREAN = /(\d{4})년\s*(\d{1,2})월\s*(\d{1,2})일.*?(\d{1,2}):(\d{2})/;

// The text around the date varies (weekday, seconds), so the fields are cut out into
// "yyyy-M-d H:m" first.
export function deadlineFields(text: string | null | undefined): string | null {
  const match = text?.match(NUMERIC) ?? text?.match(KOREAN);
  if (!match) return null;
  const [year, month, day, hour, minute] = match.slice(1);
  return `${year}-${month}-${day} ${hour}:${minute}`;
}

// LMS deadlines carry no time zone; like the LMS itself they are read as local time.
export function parseDeadline(text: string | null | undefined): Date | null {
  const fields = deadlineFields(text);
  if (!fields) return null;
  const date = parse(fields, "yyyy-M-d H:m", 0);
  return isValid(date) ? date : null;
}

export function getAssignmentStatus(
  deadline: string | null,
  isSubmitted: boolean,
  urgentThresholdHours: number,
  now: Date | number,
): AssignmentStatus {
  if (isSubmitted) return "submitted";
  const dueDate = parseDeadline(deadline);
  if (!dueDate) return "remaining";
  if (isBefore(dueDate, now)) return "overdue";
  return isAfter(dueDate, addHours(now, urgentThresholdHours)) ? "remaining" : "urgent";
}

export function formatDeadline(text: string): string {
  const date = NUMERIC.test(text) ? parseDeadline(text) : null;
  return date ? format(date, "yyyy-MM-dd HH:mm") : text;
}

export function timeRemaining(dueDate: Date, now: Date | number): string {
  const minutes = differenceInMinutes(dueDate, now);
  if (minutes <= 0) return "";
  // Days are not rolled up into months, so a deadline five weeks out reads "35일".
  return formatDuration(
    {
      days: Math.floor(minutes / minutesInDay),
      hours: Math.floor((minutes % minutesInDay) / minutesInHour),
      minutes: minutes % minutesInHour,
    },
    { locale: ko },
  );
}
