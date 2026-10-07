import { useEffect, useState } from "react";

// Remaining times are shown to the minute, so a minute tick keeps them and the
// urgent/overdue split current without re-rendering more often.
export function useNow(intervalMs = 60_000): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(timer);
  }, [intervalMs]);
  return now;
}
