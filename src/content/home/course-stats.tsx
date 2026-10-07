import { useState } from "react";
import { useStore } from "zustand";
import { countStatuses } from "../../shared/assignment/stats.ts";
import { cn } from "../../ui/cn.ts";
import { ProgressRing } from "../../ui/progress-ring.tsx";
import { homeStore } from "./store.ts";

const label = "text-12 font-medium whitespace-nowrap text-gray-666";
const badge = "rounded-3 px-6 py-2 font-bold text-white";
const value = "min-w-16 text-right text-12 leading-none font-bold";

function Stat({
  name,
  count,
  labelClassName,
  valueClassName,
}: {
  name: string;
  count: number;
  labelClassName?: string | false;
  valueClassName: string;
}) {
  return (
    <div className="flex animate-slide-in flex-row items-center justify-end gap-6">
      <div className={cn(label, labelClassName)}>{name}</div>
      <div className={cn(value, valueClassName)}>{count}</div>
    </div>
  );
}

export function CourseStats({ courseId }: { courseId: string }) {
  const course = useStore(homeStore, (state) => state.courses[courseId]);
  const excluded = useStore(homeStore, (state) => state.excluded);
  const threshold = useStore(homeStore, (state) => state.urgentThresholdHours);
  // Read once on mount because render must stay pure; statuses are judged as of page load,
  // as they always were.
  const [now] = useState(() => Date.now());
  if (!course) return null;

  return (
    <a
      href={`https://lms.gist.ac.kr/course/view.php?id=${courseId}`}
      className="absolute top-1/2 right-10 z-10 flex -translate-y-1/2 animate-slide-in-centered flex-col items-end gap-4 transition-opacity duration-200"
    >
      {course.records ? (
        (() => {
          const counts = countStatuses(course.records, excluded, threshold, now);
          return (
            <>
              <Stat name="완료" count={counts.submitted} valueClassName="text-stat-done" />
              <Stat
                name="마감 임박"
                count={counts.urgent}
                labelClassName={counts.urgent > 0 && cn(badge, "animate-blink bg-status-urgent")}
                valueClassName={cn("text-status-urgent", counts.urgent > 0 && "animate-blink")}
              />
              <Stat
                name="마감 지남"
                count={counts.overdue}
                labelClassName={counts.overdue > 0 && cn(badge, "bg-status-overdue")}
                valueClassName="text-status-overdue"
              />
              <Stat name="남음" count={counts.remaining} valueClassName="text-gray-9e9e9e" />
            </>
          );
        })()
      ) : (
        <div className="relative flex h-32 w-32 items-center justify-center">
          <ProgressRing
            progress={course.progress}
            size={32}
            radius={12}
            strokeWidth={4}
            barClassName="stroke-accent [stroke-linecap:round]"
            trackClassName="stroke-black/10"
          />
          <div className="absolute text-center text-8 font-bold text-gray-666">
            {Math.round(course.progress * 100)}%
          </div>
        </div>
      )}
    </a>
  );
}
