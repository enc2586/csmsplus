import { formatDuration } from "date-fns";
import {
  millisecondsInDay,
  millisecondsInHour,
  millisecondsInMinute,
  millisecondsInSecond,
  millisecondsInWeek,
} from "date-fns/constants";
import { ko } from "date-fns/locale";

const units = [
  ["days", millisecondsInDay],
  ["hours", millisecondsInHour],
  ["minutes", millisecondsInMinute],
  ["seconds", millisecondsInSecond],
] as const;

// Shows only the largest unit ("3시간"), plus days next to weeks ("2주 (14일)").
export function msToNaturalLanguage(ms: number): string {
  const days = Math.floor(ms / millisecondsInDay);
  const weeks = Math.floor(ms / millisecondsInWeek);
  if (weeks > 0) {
    return `${formatDuration({ weeks }, { locale: ko })} (${formatDuration({ days }, { locale: ko })})`;
  }
  const unit = units.find(([, size]) => ms >= size);
  if (!unit) return `${ms}ms`;
  const [name, size] = unit;
  return formatDuration({ [name]: Math.floor(ms / size) }, { locale: ko });
}
