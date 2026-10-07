import type { ReactNode } from "react";
import type { AssignmentStatus } from "../shared/assignment/status.ts";
import { cn } from "./cn.ts";

export const STATUS_LABEL: Record<AssignmentStatus, string> = {
  submitted: "제출완료",
  overdue: "마감 지남",
  urgent: "마감 임박",
  remaining: "미제출",
};

const tone: Record<AssignmentStatus, string> = {
  submitted: cn("bg-status-submitted text-white"),
  overdue: cn("bg-status-overdue text-white"),
  urgent: cn("bg-status-urgent text-white"),
  remaining: cn("bg-status-default text-gray-333"),
};

const size = {
  normal: cn("px-2 py-0.5 text-[11px]"),
  compact: cn("px-2 py-0.75 text-[11px]"),
  dense: cn("min-w-12.5 px-1.25 py-0.25 text-[10px]"),
};

export function StatusChip({
  status,
  size: variant = "normal",
  children = STATUS_LABEL[status],
}: {
  status: AssignmentStatus;
  size?: keyof typeof size;
  children?: ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex min-h-5.5 shrink-0 items-center justify-center rounded-[4px] leading-[1.2] font-medium whitespace-nowrap",
        size[variant],
        tone[status],
      )}
    >
      {children}
    </span>
  );
}
