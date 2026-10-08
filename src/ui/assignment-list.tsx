import { ChevronRight } from "lucide-react";
import { createContext, type ReactNode, useContext } from "react";
import type { AssignmentGroups, ListedAssignment } from "../shared/assignment/groups.ts";
import {
  type AssignmentStatus,
  formatDeadline,
  parseDeadline,
  timeRemaining,
} from "../shared/assignment/status.ts";
import { cn } from "./cn.ts";
import { ExcludeButton } from "./exclude-button.tsx";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "./shadcn/collapsible.tsx";
import { StatusChip } from "./status-chip.tsx";

// A link inside the toolbar popup would navigate the popup itself, so there each assignment
// opens in a new tab instead.
const LinkTarget = createContext<"_blank" | undefined>(undefined);

const heading = cn("mb-2 text-xs font-medium text-muted-foreground");

function dueText(a: ListedAssignment, now: number): string {
  if (!a.deadline) return "마감일 정보 없음";
  const dueDate = parseDeadline(a.deadline);
  const remaining = !a.isSubmitted && dueDate ? timeRemaining(dueDate, now) : "";
  return `${formatDeadline(a.deadline)}까지${remaining ? ` (${remaining} 남음)` : ""}`;
}

function Row({
  assignment,
  status,
  excluded,
  now,
}: {
  assignment: ListedAssignment;
  status: AssignmentStatus;
  excluded: boolean;
  now: number;
}) {
  const target = useContext(LinkTarget);
  return (
    <li className="flex items-center gap-3 rounded-md border bg-card px-3.5 py-2.5">
      <StatusChip status={status} className="w-16">
        {excluded ? "제외됨" : undefined}
      </StatusChip>
      <a href={assignment.url} target={target} className="group flex min-w-0 flex-1 flex-col">
        <span className="truncate text-xs text-muted-foreground">{assignment.courseName}</span>
        <span className="truncate text-sm text-card-foreground group-hover:underline">
          {assignment.title}
        </span>
        <span className="truncate text-xs text-muted-foreground">{dueText(assignment, now)}</span>
      </a>
      <ExcludeButton id={assignment.id} title={assignment.title} excluded={excluded} />
    </li>
  );
}

function Rows({
  items,
  status,
  excluded = false,
  now,
}: {
  items: ListedAssignment[];
  status: AssignmentStatus;
  excluded?: boolean;
  now: number;
}) {
  return (
    <ul className="flex flex-col gap-1.5">
      {items.map((a) => (
        <Row key={a.id} assignment={a} status={status} excluded={excluded} now={now} />
      ))}
    </ul>
  );
}

function Section({
  title,
  count,
  children,
}: {
  title: string;
  count: number;
  children: ReactNode;
}) {
  if (count === 0) return null;
  return (
    <section>
      <div className={heading}>
        {title} {count}
      </div>
      {children}
    </section>
  );
}

function Folded({ title, count, children }: { title: string; count: number; children: ReactNode }) {
  if (count === 0) return null;
  return (
    <Collapsible>
      <CollapsibleTrigger
        className={cn(
          heading,
          "group mb-0 flex cursor-pointer items-center gap-1 data-[state=open]:mb-2",
        )}
      >
        <ChevronRight className="size-3.5 transition-transform group-data-[state=open]:rotate-90" />
        {title} {count}
      </CollapsibleTrigger>
      <CollapsibleContent>{children}</CollapsibleContent>
    </Collapsible>
  );
}

export function AssignmentList({
  groups,
  now,
  openInNewTab = false,
}: {
  groups: AssignmentGroups;
  now: number;
  openInNewTab?: boolean;
}) {
  const total = Object.values(groups).reduce((sum, list) => sum + list.length, 0);
  if (total === 0)
    return <p className="py-2.5 text-sm text-muted-foreground">표시할 과제가 없습니다.</p>;
  return (
    <LinkTarget value={openInNewTab ? "_blank" : undefined}>
      <div className="flex flex-col gap-4 font-sans">
        <Section title="마감 임박" count={groups.urgent.length}>
          <Rows items={groups.urgent} status="urgent" now={now} />
        </Section>
        <Section title="마감 지남" count={groups.overdue.length}>
          <Rows items={groups.overdue} status="overdue" now={now} />
        </Section>
        <Section title="남음" count={groups.remaining.length}>
          <Rows items={groups.remaining} status="remaining" now={now} />
        </Section>
        <Folded title="완료" count={groups.submitted.length}>
          <Rows items={groups.submitted} status="submitted" now={now} />
        </Folded>
        <Folded title="추적 제외" count={groups.excluded.length}>
          <Rows items={groups.excluded} status="remaining" excluded now={now} />
        </Folded>
      </div>
    </LinkTarget>
  );
}
