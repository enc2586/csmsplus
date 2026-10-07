import { tz } from "@date-fns/tz";
import { format, isValid, parse, subDays } from "date-fns";
import { deadlineFields } from "../assignment/status.ts";

const seoul = tz("Asia/Seoul");

// Todoist deadlines are dates without a time, so the task is due the day before the LMS
// deadline: work finished by then is always in time. The LMS writes Korean time, and
// reading it in Seoul keeps the date right on a computer set to another time zone.
export function toTodoistDeadline(deadline: string | null): string | null {
  const fields = deadlineFields(deadline);
  if (!fields) return null;
  const date = parse(fields, "yyyy-M-d H:m", 0, { in: seoul });
  return isValid(date) ? format(subDays(date, 1), "yyyy-MM-dd", { in: seoul }) : null;
}
