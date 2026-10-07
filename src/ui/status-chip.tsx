import type { ReactNode } from "react";
import type { AssignmentStatus } from "../shared/assignment/status.ts";
import { cn } from "./cn.ts";
import { Badge } from "./shadcn/badge.tsx";

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
  remaining: cn("bg-secondary text-secondary-foreground"),
};

export function StatusChip({
  status,
  className,
  children = STATUS_LABEL[status],
}: {
  status: AssignmentStatus;
  className?: string;
  children?: ReactNode;
}) {
  return <Badge className={cn("rounded-md font-sans", tone[status], className)}>{children}</Badge>;
}
