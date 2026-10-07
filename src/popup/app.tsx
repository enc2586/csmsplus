import { formatDistance } from "date-fns";
import { ko } from "date-fns/locale";
import { useEffect, useState } from "react";
import { groupAssignments } from "../shared/assignment/groups.ts";
import { loadTracked, type TrackedSnapshot } from "../shared/assignment/tracked.ts";
import type { SyncRequest } from "../shared/messages.ts";
import { LMS } from "../shared/sync/pages.ts";
import { AssignmentList } from "../ui/assignment-list.tsx";
import { cn } from "../ui/cn.ts";

const button = cn(
  "cursor-pointer rounded-[4px] border border-gray-ccc bg-white px-2.5 py-1 text-[12px] text-gray-444 hover:bg-gray-eee disabled:cursor-wait disabled:opacity-50",
);

export function App() {
  const [snapshot, setSnapshot] = useState<TrackedSnapshot | null>(null);
  const [syncing, setSyncing] = useState(false);
  // Read once on open because render must stay pure; a popup lives for seconds.
  const [now] = useState(() => Date.now());

  useEffect(() => {
    const load = () => void loadTracked().then(setSnapshot);
    const onChanged = (_changes: unknown, area: string) => area === "local" && load();
    load();
    chrome.storage.onChanged.addListener(onChanged);
    return () => chrome.storage.onChanged.removeListener(onChanged);
  }, []);

  const refresh = async () => {
    setSyncing(true);
    try {
      const request: SyncRequest = { action: "syncNow" };
      await chrome.runtime.sendMessage(request);
    } finally {
      setSyncing(false);
    }
  };

  if (!snapshot) return null;
  const { assignments, excluded, options, syncStatus } = snapshot;
  // A sync can finish after the popup opened; it reads as "just now" rather than in the future.
  const lastSync =
    syncStatus &&
    formatDistance(syncStatus.at, Math.max(now, syncStatus.at), { addSuffix: true, locale: ko });

  return (
    <div className="flex max-h-140 flex-col">
      <header className="flex items-center justify-between border-b border-gray-e1e1e1 bg-white px-4 py-3">
        <div className="flex items-baseline gap-2">
          <h1 className="text-[16px] font-bold text-brand">CSMS+</h1>
          {lastSync && <span className="text-[11px] text-gray-999">{lastSync} 동기화</span>}
        </div>
        <button type="button" className={button} disabled={syncing} onClick={() => void refresh()}>
          {syncing ? "불러오는 중..." : "새로고침"}
        </button>
      </header>

      {syncStatus?.state === "signed-out" && (
        <p className="border-b border-[rgba(211,47,47,0.3)] bg-[rgba(211,47,47,0.08)] px-4 py-2.5 text-[12px] text-status-overdue">
          LMS 로그인이 만료되었습니다.{" "}
          <a href={`${LMS}/login/index.php`} target="_blank" className="font-semibold underline">
            로그인
          </a>
          한 뒤 새로고침해 주세요.
        </p>
      )}

      <main className="overflow-y-auto p-4">
        {assignments.length === 0 ? (
          <p className="py-2.5 text-[13px] text-gray-888">
            아직 불러온 과제가 없습니다. 새로고침을 눌러 주세요.
          </p>
        ) : (
          <AssignmentList
            groups={groupAssignments(
              assignments,
              excluded,
              options.tracker.urgentThresholdHours,
              now,
            )}
            now={now}
          />
        )}
      </main>

      <footer className="border-t border-gray-e1e1e1 bg-white px-4 py-2 text-right">
        <button
          type="button"
          className="cursor-pointer text-[12px] text-gray-666 hover:underline"
          onClick={() => void chrome.runtime.openOptionsPage()}
        >
          설정 열기
        </button>
      </footer>
    </div>
  );
}
