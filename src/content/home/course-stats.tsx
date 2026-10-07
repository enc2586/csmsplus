import { useState } from "react";
import { useStore } from "zustand";
import { countStatuses } from "../../shared/assignment/stats.ts";
import { cn } from "../../ui/cn.ts";
import { ProgressRing } from "../../ui/progress-ring.tsx";
import { homeStore } from "./store.ts";

const label = cn("text-[12px] font-medium whitespace-nowrap text-gray-666");
const badge = cn("rounded-[3px] px-1.5 py-0.5 font-bold text-white");
const value = cn("min-w-4 text-right text-[12px] leading-none font-bold");

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
    <div className="flex animate-slide-in flex-row items-center justify-end gap-1.5">
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
      className="absolute top-1/2 right-2.5 z-10 flex -translate-y-1/2 animate-slide-in-centered flex-col items-end gap-1 transition-opacity duration-200"
    >
      {course.records ? (
        (() => {
          const counts = countStatuses(course.records, excluded, threshold, now);
          return (
            <>
              {course.newCount ? (
                <Stat name="새 항목" count={course.newCount} valueClassName={cn("text-new")} />
              ) : null}
              <Stat name="완료" count={counts.submitted} valueClassName={cn("text-stat-done")} />
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
                valueClassName={cn("text-status-overdue")}
              />
              <Stat name="남음" count={counts.remaining} valueClassName={cn("text-gray-9e9e9e")} />
            </>
          );
        })()
      ) : (
        <div className="relative flex h-8 w-8 items-center justify-center">
          <ProgressRing
            progress={course.progress}
            size={32}
            radius={12}
            strokeWidth={4}
            barClassName={cn("stroke-brand [stroke-linecap:round]")}
            trackClassName={cn("stroke-black/10")}
          />
          <div className="absolute text-center text-[8px] font-bold text-gray-666">
            {Math.round(course.progress * 100)}%
          </div>
        </div>
      )}
    </a>
  );
}
