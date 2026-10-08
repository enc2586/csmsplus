import { LoaderCircle } from "lucide-react";
import { useState } from "react";
import { useStore } from "zustand";
import {
  formatDeadline,
  getAssignmentStatus,
  parseDeadline,
  timeRemaining,
} from "../../shared/assignment/status.ts";
import { cn } from "../../ui/cn.ts";
import { StatusChip } from "../../ui/status-chip.tsx";
import { courseStore } from "./store.ts";

function Content({
  id,
  url,
  compact,
  card,
}: {
  id: string;
  url: string;
  compact: boolean;
  card: boolean;
}) {
  const assignment = useStore(courseStore, (state) => state.assignments[id]);
  const tracker = useStore(courseStore, (state) => state.options.tracker);
  // Read once on mount because render must stay pure; statuses are judged as of page load,
  // as they always were.
  const [now] = useState(() => Date.now());

  if (assignment.state === "failed") return null;
  if (assignment.state === "loading" || !assignment.record) {
    return (
      <span className="flex items-center gap-1 text-xs text-muted-foreground">
        <LoaderCircle className="size-3 animate-spin" />
        {!compact && "불러오는 중..."}
      </span>
    );
  }

  const { deadline, isSubmitted, content } = assignment.record;
  const status = getAssignmentStatus(deadline, isSubmitted, tracker.urgentThresholdHours, now);
  const dueDate = parseDeadline(deadline);
  const remaining =
    tracker.showRemainingTime && !isSubmitted && dueDate ? timeRemaining(dueDate, now) : "";

  if (compact) {
    return (
      <a
        href={url}
        className={cn(
          "mt-0.5 flex flex-col items-center gap-1 transition-opacity duration-200 hover:opacity-80",
          card && "mt-0",
        )}
      >
        <StatusChip status={status} />
        {remaining && (
          <div className="text-center text-[10px] text-muted-foreground">{remaining} 남음</div>
        )}
      </a>
    );
  }

  return (
    <a href={url} className="group flex flex-col gap-1">
      <div className="flex animate-fade-in flex-row items-center gap-2">
        <StatusChip status={status} />
        <div className="text-xs text-foreground group-hover:underline">
          {deadline ? `${formatDeadline(deadline)}까지` : "마감일 정보 없음"}
          {remaining && ` (${remaining} 남음)`}
        </div>
      </div>
      {tracker.showBody && content && (
        <div className="mt-0.5 animate-fade-in-down overflow-hidden text-xs text-ellipsis whitespace-nowrap text-muted-foreground">
          {content}
        </div>
      )}
    </a>
  );
}

export function AssignmentInfo({
  id,
  url,
  compact,
  card,
}: {
  id: string;
  url: string;
  compact: boolean;
  card: boolean;
}) {
  const excluded = useStore(courseStore, (state) => state.excluded.has(id));
  const showDetail = useStore(courseStore, (state) => state.options.tracker.enableAssignmentDetail);
  if (!excluded && !showDetail) return null;

  return (
    <div
      className={cn(
        "mt-0.5 ml-8.75 flex flex-col items-start gap-1 font-sans text-sm text-muted-foreground",
        card && "mt-1.5 ml-0 items-center",
      )}
    >
      {excluded ? (
        <StatusChip status="remaining">추적 제외됨</StatusChip>
      ) : (
        <Content id={id} url={url} compact={compact} card={card} />
      )}
    </div>
  );
}
