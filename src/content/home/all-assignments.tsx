import { useState } from "react";
import { useStore } from "zustand";
import { groupAssignments, type ListedAssignment } from "../../shared/assignment/groups.ts";
import { LMS } from "../../shared/sync/pages.ts";
import { AssignmentList } from "../../ui/assignment-list.tsx";
import { homeStore } from "./store.ts";

export function AllAssignments() {
  const courses = useStore(homeStore, (state) => state.courses);
  const courseNames = useStore(homeStore, (state) => state.courseNames);
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
      courseName: courseNames[courseId] ?? "",
      deadline: record.deadline,
      isSubmitted: record.isSubmitted,
    })),
  );

  return (
    <section className="mt-4 rounded-[4px] border border-gray-e1e1e1 bg-white p-5 font-sans">
      <div className="mb-3.5 flex items-baseline justify-between">
        <h2 className="text-[14px] font-semibold text-gray-333">전체 과제</h2>
        {loading > 0 && (
          <span className="text-[11px] text-gray-999">
            강좌 {entries.length - loading}/{entries.length} 불러옴
          </span>
        )}
      </div>
      <AssignmentList groups={groupAssignments(assignments, excluded, threshold, now)} now={now} />
    </section>
  );
}
