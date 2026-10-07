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
import { Card, CardContent, CardHeader, CardTitle } from "../../ui/shadcn/card.tsx";
import { Progress } from "../../ui/shadcn/progress.tsx";
import { Separator } from "../../ui/shadcn/separator.tsx";
import { StatusChip } from "../../ui/status-chip.tsx";
import { type Assignment, courseStore } from "./store.ts";

const heading = cn("mb-2 text-xs font-medium text-muted-foreground");

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
    <Progress
      aria-label="과제 정보 불러오는 중"
      value={percent}
      className={cn(
        "absolute top-0 left-0 h-1 rounded-none transition-[height,opacity] duration-500 ease-in-out [&>[data-slot=progress-indicator]]:bg-brand",
        phase === "collapsing" && "h-0 opacity-0",
      )}
    />
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
    <div className="flex flex-col gap-0.5">
      <div className={cn("text-xl font-semibold text-foreground", className)}>{value}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
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
      <div className="mb-4 flex flex-col gap-1.5 last:mb-0">
        {items.map((item) => {
          const { deadline, content } = item.record;
          const dueDate = parseDeadline(deadline);
          const remaining = dueDate && item.diff > 0 ? timeRemaining(dueDate, now) : "";
          const title = item.record.title || item.linkTitle;
          return (
            <a
              key={item.id}
              href={item.url}
              className="flex items-center justify-between gap-3 rounded-md border bg-card px-3.5 py-2.5 transition-colors hover:bg-accent"
            >
              <div className="flex items-center gap-2.5">
                <StatusChip status={item.diff < 0 ? "overdue" : "urgent"} className="w-16" />
                <div className="flex min-w-0 flex-col gap-0.5">
                  <span className="max-w-100 truncate text-sm text-card-foreground" title={title}>
                    {title}
                  </span>
                  {showContent && content && (
                    <div className="animate-fade-in-down truncate text-xs text-muted-foreground">
                      {content}
                    </div>
                  )}
                </div>
              </div>
              <span className="shrink-0 text-xs text-muted-foreground">
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
    <Card className="relative gap-4 overflow-hidden font-sans">
      <ProgressBar loaded={loaded} total={all.length} />
      <CardHeader>
        <CardTitle>과제 개요</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className={cn("flex animate-fade-in flex-wrap gap-8", skeleton && "opacity-50")}>
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
            className={!skeleton && "text-muted-foreground"}
          />
        </div>
        {!skeleton && (
          <>
            <Separator />
            {urgent.length + overdue.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                지금은 마감이 임박하거나 지난 과제가 없습니다.
              </p>
            ) : (
              <div>
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
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
