import type { ReactNode } from "react";
import type { AssignmentGroups, ListedAssignment } from "../shared/assignment/groups.ts";
import {
  type AssignmentStatus,
  formatDeadline,
  parseDeadline,
  timeRemaining,
} from "../shared/assignment/status.ts";
import { cn } from "./cn.ts";
import { ExcludeButton } from "./exclude-button.tsx";
import { StatusChip } from "./status-chip.tsx";

const heading = cn("mb-2 text-[12px] font-semibold tracking-[0.5px] text-gray-666");

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
  return (
    <li className="flex items-center justify-between gap-3 rounded-[4px] border border-gray-eee bg-gray-fcfcfc px-3.5 py-2.5">
      <a href={assignment.url} className="group flex min-w-0 items-center gap-2.5">
        <StatusChip status={status} size="dense">
          {excluded ? "제외됨" : undefined}
        </StatusChip>
        <span className="flex min-w-0 flex-col gap-0.5">
          <span className="truncate text-[11px] text-gray-888">{assignment.courseName}</span>
          <span className="truncate text-[13px] text-gray-333 group-hover:underline">
            {assignment.title}
          </span>
        </span>
      </a>
      <span className="flex shrink-0 items-center gap-2.5">
        <span className="text-[11px] text-gray-999">{dueText(assignment, now)}</span>
        <ExcludeButton id={assignment.id} title={assignment.title} excluded={excluded} />
      </span>
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
    <details>
      <summary className={cn(heading, "cursor-pointer")}>
        {title} {count}
      </summary>
      {children}
    </details>
  );
}

export function AssignmentList({ groups, now }: { groups: AssignmentGroups; now: number }) {
  const total = Object.values(groups).reduce((sum, list) => sum + list.length, 0);
  if (total === 0)
    return <p className="py-2.5 text-[13px] text-gray-888">표시할 과제가 없습니다.</p>;
  return (
    <div className="flex flex-col gap-4">
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
  );
}
