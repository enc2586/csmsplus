import { differenceInMilliseconds } from "date-fns";
import { useEffect, useState } from "react";
import { useStore } from "zustand";
import {
  formatDeadline,
  getAssignmentStatus,
  parseDeadline,
  timeRemaining,
} from "../../shared/assignment/status.ts";
import { cn } from "../../ui/cn.ts";
import { StatusChip } from "../../ui/status-chip.tsx";
import { type Assignment, courseStore } from "./store.ts";

const heading = cn("mb-2.5 text-[13px] font-semibold tracking-[0.5px] text-gray-666 uppercase");

type DueItem = Assignment & { record: NonNullable<Assignment["record"]>; diff: number };

function ProgressBar({ loaded, total }: { loaded: number; total: number }) {
  const done = total > 0 && loaded >= total;
  const [phase, setPhase] = useState<"loading" | "collapsing" | "gone">("loading");

  // Holds the full bar briefly, then lets the collapse transition finish before removal.
  useEffect(() => {
    if (phase === "loading" && done) {
      const timer = setTimeout(() => setPhase("collapsing"), 800);
      return () => clearTimeout(timer);
    }
    if (phase === "collapsing") {
      const timer = setTimeout(() => setPhase("gone"), 500);
      return () => clearTimeout(timer);
    }
  }, [phase, done]);

  if (phase === "gone") return null;
  const percent = total ? Math.min(100, Math.round((loaded / total) * 100)) : 0;
  return (
    <div
      role="progressbar"
      aria-label="과제 정보 불러오는 중"
      aria-valuenow={percent}
      className={cn(
        "absolute top-0 left-0 z-10 h-1.25 w-full bg-black/5 transition-[height,opacity] duration-500 ease-in-out",
        phase === "collapsing" && "m-0 h-0 opacity-0",
      )}
    >
      <div
        className="h-full rounded-r-[2px] bg-progress transition-[width] duration-300 ease-out"
        style={{ width: `${percent}%` }}
      />
    </div>
  );
}

function Stat({
  value,
  label,
  className,
}: {
  value: number | string;
  label: string;
  className?: string | false;
}) {
  return (
    <div className="flex flex-col">
      <div className={cn("text-[20px] leading-[1.2] font-bold text-gray-333", className)}>
        {value}
      </div>
      <div className="mt-0.5 text-[12px] text-gray-777">{label}</div>
    </div>
  );
}

function TaskList({
  title,
  items,
  showContent,
  now,
}: {
  title: string;
  items: DueItem[];
  showContent: boolean;
  now: number;
}) {
  if (items.length === 0) return null;
  return (
    <>
      <div className={heading}>{title}</div>
      <div className="mb-4 flex flex-col gap-2">
        {items.map((item) => {
          const { deadline, content } = item.record;
          const dueDate = parseDeadline(deadline);
          const remaining = dueDate && item.diff > 0 ? timeRemaining(dueDate, now) : "";
          const title = item.record.title || item.linkTitle;
          return (
            <a
              key={item.id}
              href={item.url}
              className="flex items-center justify-between rounded-[4px] border border-gray-eee bg-gray-fcfcfc px-3.5 py-2.5 transition-all duration-200 hover:border-gray-ccc hover:bg-white hover:shadow-[0_2px_5px_rgba(0,0,0,0.05)]"
            >
              <div className="flex items-center gap-2.5">
                <StatusChip status={item.diff < 0 ? "overdue" : "urgent"} className="min-w-12.5" />
                <div className="flex flex-col gap-1">
                  <span
                    className="max-w-100 overflow-hidden text-[13px] font-normal text-ellipsis whitespace-nowrap text-gray-333"
                    title={title}
                  >
                    {title}
                  </span>
                  {showContent && content && (
                    <div className="animate-fade-in-down text-[11px] leading-[1.3] text-gray-999">
                      {content}
                    </div>
                  )}
                </div>
              </div>
              <span className="text-[11px] text-gray-999">
                {deadline ? `${formatDeadline(deadline)}까지` : ""}
                {remaining && ` (${remaining} 남음)`}
              </span>
            </a>
          );
        })}
      </div>
    </>
  );
}

export function Dashboard() {
  const assignments = useStore(courseStore, (state) => state.assignments);
  const excluded = useStore(courseStore, (state) => state.excluded);
  const tracker = useStore(courseStore, (state) => state.options.tracker);
  // Read once on mount because render must stay pure; statuses are judged as of page load,
  // as they always were.
  const [now] = useState(() => Date.now());

  const all = Object.values(assignments);
  const loaded = all.filter((a) => a.state !== "loading").length;
  const tracked = all.filter((a) => !excluded.has(a.id));

  let completed = 0;
  const urgent: DueItem[] = [];
  const overdue: DueItem[] = [];
  for (const a of tracked) {
    if (!a.record) continue;
    const status = getAssignmentStatus(
      a.record.deadline,
      a.record.isSubmitted,
      tracker.urgentThresholdHours,
      now,
    );
    const dueDate = parseDeadline(a.record.deadline);
    const diff = dueDate ? differenceInMilliseconds(dueDate, now) : 0;
    if (status === "submitted") completed++;
    else if (status === "urgent") urgent.push({ ...a, record: a.record, diff });
    else if (status === "overdue") overdue.push({ ...a, record: a.record, diff });
  }
  urgent.sort((a, b) => a.diff - b.diff);
  overdue.sort((a, b) => b.diff - a.diff);
  const remaining = tracked.length - completed - urgent.length - overdue.length;
  const skeleton = loaded === 0;

  return (
    <div className="font-sans">
      <ProgressBar loaded={loaded} total={all.length} />
      <div>
        <div className="mb-3.75 h-0.25 bg-gray-e1e1e1" />
        <div className={cn(heading, "flex items-center justify-between")}>
          <span>과제 개요</span>
        </div>
        <div
          className={cn(
            "mb-5 flex animate-fade-in flex-wrap gap-7.5 border-b border-gray-eee pb-5",
            skeleton && "opacity-50",
          )}
        >
          <Stat
            value={skeleton ? "-" : completed}
            label="완료"
            className={!skeleton && "text-stat-done"}
          />
          <Stat
            value={skeleton ? "-" : urgent.length}
            label="마감 임박"
            className={!skeleton && "text-status-urgent"}
          />
          <Stat
            value={skeleton ? "-" : overdue.length}
            label="마감 지남"
            className={!skeleton && "text-stat-overdue"}
          />
          <Stat
            value={skeleton ? "-" : remaining}
            label="남음"
            className={!skeleton && "text-gray-757575"}
          />
        </div>
        {!skeleton &&
          (urgent.length + overdue.length === 0 ? (
            <div className="py-2.5 text-left text-[13px] text-gray-888">
              지금은 마감이 임박하거나 지난 과제가 없습니다.
            </div>
          ) : (
            <>
              <TaskList
                title="마감 임박 과제"
                items={urgent}
                showContent={tracker.showBody}
                now={now}
              />
              <TaskList
                title="마감 지남 과제"
                items={overdue}
                showContent={tracker.showBody}
                now={now}
              />
            </>
          ))}
      </div>
    </div>
  );
}
