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
  normal: cn("px-8 py-2 text-11"),
  compact: cn("px-8 py-3 text-11"),
  dense: cn("min-w-50 px-5 py-1 text-10"),
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
        "inline-flex min-h-22 shrink-0 items-center justify-center rounded-4 leading-[1.2] font-medium whitespace-nowrap",
        size[variant],
        tone[status],
      )}
    >
      {children}
    </span>
  );
}
