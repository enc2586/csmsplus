import { formatDistance } from "date-fns";
import { ko } from "date-fns/locale";
import { RefreshCw, Settings, TriangleAlert } from "lucide-react";
import { useEffect, useState } from "react";
import { groupAssignments } from "../shared/assignment/groups.ts";
import { loadTracked, type TrackedSnapshot } from "../shared/assignment/tracked.ts";
import type { SyncRequest } from "../shared/messages.ts";
import { LMS } from "../shared/sync/pages.ts";
import { AssignmentList } from "../ui/assignment-list.tsx";
import { cn } from "../ui/cn.ts";
import { Alert, AlertDescription, AlertTitle } from "../ui/shadcn/alert.tsx";
import { Button } from "../ui/shadcn/button.tsx";

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
      <header className="flex items-center justify-between border-b px-4 py-3">
        <div className="flex items-baseline gap-2">
          <h1 className="text-base font-bold text-brand">CSMS+</h1>
          {lastSync && <span className="text-xs text-muted-foreground">{lastSync} 동기화</span>}
        </div>
        <Button variant="outline" size="sm" disabled={syncing} onClick={() => void refresh()}>
          <RefreshCw className={cn(syncing && "animate-spin")} />
          {syncing ? "불러오는 중..." : "새로고침"}
        </Button>
      </header>

      {syncStatus?.state === "signed-out" && (
        <div className="px-4 pt-3">
          <Alert variant="destructive">
            <TriangleAlert />
            <AlertTitle>LMS 로그인이 만료되었습니다.</AlertTitle>
            <AlertDescription>
              <span>
                <a href={`${LMS}/login/index.php`} target="_blank" className="underline">
                  로그인
                </a>
                한 뒤 새로고침해 주세요.
              </span>
            </AlertDescription>
          </Alert>
        </div>
      )}

      <main className="overflow-y-auto p-4">
        {assignments.length === 0 ? (
          <p className="py-2.5 text-sm text-muted-foreground">
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

      <footer className="flex justify-end border-t px-2 py-1.5">
        <Button variant="ghost" size="sm" onClick={() => void chrome.runtime.openOptionsPage()}>
          <Settings />
          설정 열기
        </Button>
      </footer>
    </div>
  );
}
