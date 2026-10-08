import { useState } from "react";
import { useStore } from "zustand";
import { groupAssignments, type ListedAssignment } from "../../shared/assignment/groups.ts";
import { LMS } from "../../shared/sync/pages.ts";
import { AssignmentList } from "../../ui/assignment-list.tsx";
import { Card, CardContent, CardHeader, CardTitle } from "../../ui/shadcn/card.tsx";
import { homeStore } from "./store.ts";

export function AllAssignments() {
  const courses = useStore(homeStore, (state) => state.courses);
  const courseInfo = useStore(homeStore, (state) => state.courseInfo);
  const excluded = useStore(homeStore, (state) => state.excluded);
  const threshold = useStore(homeStore, (state) => state.urgentThresholdHours);
  // Read once on mount because render must stay pure; deadlines are judged as of page load.
  const [now] = useState(() => Date.now());

  const entries = Object.entries(courses);
  const loading = entries.filter(([, course]) => course.records === null).length;
  const assignments: ListedAssignment[] = entries.flatMap(([courseId, course]) =>
    (course.records ?? []).map((record) => ({
      id: record.id,
      url: `${LMS}/mod/assign/view.php?id=${record.id}`,
      title: record.title || `과제 ${record.id}`,
      courseName: courseInfo[courseId]?.name ?? "",
      professor: courseInfo[courseId]?.professor ?? "",
      deadline: record.deadline,
      isSubmitted: record.isSubmitted,
    })),
  );

  return (
    <Card role="region" aria-label="전체 과제" className="mt-4 gap-4 font-sans">
      <CardHeader className="flex items-baseline justify-between">
        <CardTitle>
          <h2>전체 과제</h2>
        </CardTitle>
        {loading > 0 && (
          <span className="text-xs text-muted-foreground">
            강좌 {entries.length - loading}/{entries.length} 불러옴
          </span>
        )}
      </CardHeader>
      <CardContent>
        <AssignmentList
          groups={groupAssignments(assignments, excluded, threshold, now)}
          now={now}
        />
      </CardContent>
    </Card>
  );
}
