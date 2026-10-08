import { formatDistance } from "date-fns";
import { ko } from "date-fns/locale";
import { Trash2, TriangleAlert } from "lucide-react";
import { type ReactNode, useEffect, useRef, useState } from "react";
import { isUserState } from "../shared/user-state.ts";
import { loadOptions, type Options, parseOptions, saveOptions } from "../shared/options.ts";
import { cn } from "../ui/cn.ts";
import type { TodoistStatus } from "../shared/todoist/sync.ts";
import { Alert, AlertDescription, AlertTitle } from "../ui/shadcn/alert.tsx";
import { Button } from "../ui/shadcn/button.tsx";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/shadcn/card.tsx";
import { Input } from "../ui/shadcn/input.tsx";
import { Label } from "../ui/shadcn/label.tsx";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/shadcn/select.tsx";
import { Switch } from "../ui/shadcn/switch.tsx";
import { msToNaturalLanguage } from "./duration.ts";
import { LabelPicker } from "./label-picker.tsx";
import { SaveBar } from "./save-bar.tsx";
import { syncTodoistWithToast } from "../ui/todoist-toast.ts";

type NumberField =
  | "urgentThresholdHours"
  | "fetchInterval"
  | "syncIntervalMinutes"
  | "cacheTtl"
  | "cacheTtlSubmitted";

// Number inputs stay as raw text while editing so a half-typed value is not coerced.
type Draft = { options: Options; numbers: Record<NumberField, string>; reminderHours: string };

function toDraft(options: Options): Draft {
  return {
    options,
    numbers: {
      urgentThresholdHours: String(options.tracker.urgentThresholdHours),
      fetchInterval: String(options.advanced.fetchInterval),
      syncIntervalMinutes: String(options.advanced.syncIntervalMinutes),
      cacheTtl: String(options.advanced.cacheTtl),
      cacheTtlSubmitted: String(options.advanced.cacheTtlSubmitted),
    },
    reminderHours: options.notifications.hoursBefore.join(", "),
  };
}

// "24, 3" -> [24, 3]; duplicates and non-positive entries are dropped.
function parseHours(text: string): number[] {
  const hours = text
    .split(/[,\s]+/)
    .map(Number)
    .filter((h) => Number.isFinite(h) && h > 0);
  return [...new Set(hours)].sort((a, b) => b - a);
}

function fromDraft({ options, numbers, reminderHours }: Draft): Options {
  const int = (value: string) => Number.parseInt(value, 10);
  return parseOptions({
    ...options,
    tracker: { ...options.tracker, urgentThresholdHours: int(numbers.urgentThresholdHours) },
    advanced: {
      fetchInterval: Math.max(10, int(numbers.fetchInterval) || 100),
      syncIntervalMinutes: int(numbers.syncIntervalMinutes),
      cacheTtl: int(numbers.cacheTtl),
      cacheTtlSubmitted: int(numbers.cacheTtlSubmitted),
    },
    notifications: { ...options.notifications, hoursBefore: parseHours(reminderHours) },
  });
}

async function clearCache() {
  if (!confirm("정말 모든 캐시 데이터를 삭제하시겠습니까?\n이 작업은 되돌릴 수 없습니다.")) return;
  const items = await chrome.storage.local.get(null);
  const keys = Object.keys(items).filter((key) => !isUserState(key));
  if (keys.length === 0) {
    alert("삭제할 캐시 데이터가 없습니다.");
    return;
  }
  await chrome.storage.local.remove(keys);
  alert("캐시 데이터가 성공적으로 삭제되었습니다.");
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col divide-y">{children}</CardContent>
    </Card>
  );
}

function OptionItem({
  id,
  label,
  description,
  sub,
  children,
}: {
  id?: string;
  label: string;
  description: string;
  sub?: boolean;
  children: ReactNode;
}) {
  return (
    <div
      className={cn(
        "flex items-center justify-between gap-6 py-4 first:pt-0 last:pb-0",
        sub && "pl-6",
      )}
    >
      <div className="flex flex-col gap-1">
        <Label htmlFor={id}>{label}</Label>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      {children}
    </div>
  );
}

function WithUnit({ unit, children }: { unit: string; children: ReactNode }) {
  return (
    <div className="flex shrink-0 items-center gap-2">
      {children}
      <span className="text-sm text-muted-foreground">{unit}</span>
    </div>
  );
}

const numberInput = cn("w-28 text-right");

function TodoistStatusLine() {
  const [status, setStatus] = useState<TodoistStatus | null>(null);
  // Read once on mount because render must stay pure.
  const [now] = useState(() => Date.now());
  useEffect(() => {
    const load = () =>
      void chrome.storage.local
        .get("todoistStatus")
        .then(({ todoistStatus }) => setStatus((todoistStatus as TodoistStatus) ?? null));
    const onChanged = (changes: Record<string, unknown>) => "todoistStatus" in changes && load();
    load();
    chrome.storage.onChanged.addListener(onChanged);
    return () => chrome.storage.onChanged.removeListener(onChanged);
  }, []);
  if (!status) return null;
  const when = formatDistance(status.at, Math.max(now, status.at), { addSuffix: true, locale: ko });
  return (
    <p
      className={cn(
        "py-3 pl-6 text-sm",
        status.state === "ok" ? "text-muted-foreground" : "text-destructive",
      )}
    >
      {status.state === "ok"
        ? `${when} Todoist와 동기화했습니다.`
        : `${when} 동기화 실패: ${status.message}`}
    </p>
  );
}

export function SettingsTab() {
  const [draft, setDraft] = useState<Draft | null>(null);
  const [dirty, setDirty] = useState(false);
  const [instantHide, setInstantHide] = useState(false);
  const thresholdRef = useRef<HTMLInputElement>(null);
  const savedRef = useRef<Options | null>(null);

  useEffect(() => {
    void loadOptions().then((options) => {
      savedRef.current = options;
      setDraft(toDraft(options));
    });
  }, []);

  useEffect(() => {
    if (!instantHide) return;
    const timer = setTimeout(() => setInstantHide(false), 50);
    return () => clearTimeout(timer);
  }, [instantHide]);

  if (!draft) return null;

  const edit = (next: Draft) => {
    setDraft(next);
    setDirty(true);
  };
  const toggle = <S extends "pdfdl" | "tracker" | "notifications">(
    section: S,
    key: keyof Options[S],
  ) => ({
    checked: draft.options[section][key] as boolean,
    onCheckedChange: (checked: boolean) =>
      edit({
        ...draft,
        options: { ...draft.options, [section]: { ...draft.options[section], [key]: checked } },
      }),
  });
  const editTodoist = (patch: Partial<Options["todoist"]>) =>
    edit({
      ...draft,
      options: { ...draft.options, todoist: { ...draft.options.todoist, ...patch } },
    });
  const number = (field: NumberField) => ({
    id: field === "urgentThresholdHours" ? `tracker-${field}` : `advanced-${field}`,
    type: "number",
    className: numberInput,
    value: draft.numbers[field],
    onChange: (event: React.ChangeEvent<HTMLInputElement>) =>
      edit({ ...draft, numbers: { ...draft.numbers, [field]: event.target.value } }),
  });
  const preview = (field: NumberField) =>
    `≈ ${msToNaturalLanguage(Number.parseInt(draft.numbers[field], 10) || 0)}`;
  // Optional permissions prompt only from a click, so they are requested before anything awaits.
  const withPermission =
    (permissions: chrome.permissions.Permissions, set: (enabled: boolean) => void) =>
    (checked: boolean) => {
      if (!checked) return set(false);
      void chrome.permissions.request(permissions).then((granted) => granted && set(true));
    };

  const save = async () => {
    if (!thresholdRef.current?.reportValidity()) return;
    const next = fromDraft(draft);
    await saveOptions(next);
    setInstantHide(true);
    setDirty(false);
    const before = savedRef.current?.todoist;
    savedRef.current = next;
    // Turning Todoist on or pointing it elsewhere syncs right away, so the user sees it work
    // instead of waiting for the next background sync.
    const { enable, token, projectName } = next.todoist;
    if (
      enable &&
      token &&
      (!before?.enable || before.token !== token || before.projectName !== projectName)
    ) {
      void syncTodoistWithToast();
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <Section title="PDF 다운로드">
        <OptionItem
          id="pdfdl-enable"
          label="PDF 다운로드 기능 사용"
          description="강의 자료 페이지에 PDF 다운로드 버튼을 표시합니다."
        >
          <Switch id="pdfdl-enable" {...toggle("pdfdl", "enable")} />
        </OptionItem>
      </Section>

      <Section title="과제 트래커">
        {(
          [
            [
              "enableSummaryAtDashboard",
              "메인 페이지 과제 요약",
              "LMS 메인 페이지의 강좌 카드에 과제 현황(완료/마감 임박/마감 지남/남음)을 표시합니다.",
            ],
            [
              "enableAllAssignmentsAtDashboard",
              "메인 페이지 전체 과제 목록",
              "LMS 메인 페이지 강좌 목록 아래에 모든 강좌의 과제를 마감 순서대로 모아 보여줍니다.",
            ],
            [
              "showBadge",
              "툴바 아이콘 배지",
              "확장 프로그램 아이콘에 마감 임박 과제 수를 표시하고, 로그인이 만료되면 !를 표시합니다.",
            ],
            [
              "markNewActivities",
              "새 활동 표시",
              "강좌 페이지에서 마지막 방문 이후 새로 올라온 활동에 NEW를 붙이고, 메인 페이지 카드에 개수를 표시합니다.",
            ],
            [
              "enableSummaryAtLecture",
              "강좌 페이지 과제 대시보드",
              "강좌 페이지 상단에 전체 과제 현황 대시보드를 표시합니다.",
            ],
            [
              "enableAssignmentDetail",
              "강좌 페이지 과제별 정보",
              "각 과제 링크 아래에 상태 칩과 마감 정보를 표시합니다.",
            ],
          ] as const
        ).map(([key, label, description]) => (
          <OptionItem key={key} id={`tracker-${key}`} label={label} description={description}>
            <Switch id={`tracker-${key}`} {...toggle("tracker", key)} />
          </OptionItem>
        ))}
        <OptionItem
          sub
          id="tracker-showBody"
          label="과제 본문 미리보기 표시"
          description="과제 정보에 본문 내용을 짧게 미리 보여줍니다."
        >
          <Switch id="tracker-showBody" {...toggle("tracker", "showBody")} />
        </OptionItem>
        <OptionItem
          sub
          id="tracker-showRemainingTime"
          label="마감까지 남은 시간 표시"
          description="마감일 옆에 남은 시간을 텍스트로 표시합니다."
        >
          <Switch id="tracker-showRemainingTime" {...toggle("tracker", "showRemainingTime")} />
        </OptionItem>
        <OptionItem
          id="tracker-urgentThresholdHours"
          label="마감 임박 기준"
          description="'임박'으로 표시할 마감 전 시간을 설정합니다. (기본값: 72시간)"
        >
          <WithUnit unit="시간">
            <Input
              ref={thresholdRef}
              min={1}
              max={168}
              required
              {...number("urgentThresholdHours")}
            />
          </WithUnit>
        </OptionItem>
      </Section>

      <Section title="화면">
        <OptionItem
          id="appearance-darkMode"
          label="LMS 다크 모드"
          description="LMS 페이지를 어둡게 표시합니다. Dark Reader 확장 프로그램을 이미 쓰고 있다면 둘 중 하나만 켜세요."
        >
          <Select
            value={draft.options.appearance.darkMode}
            onValueChange={(darkMode) =>
              edit({
                ...draft,
                options: {
                  ...draft.options,
                  appearance: { darkMode: darkMode as Options["appearance"]["darkMode"] },
                },
              })
            }
          >
            <SelectTrigger id="appearance-darkMode" className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="off">끔</SelectItem>
              <SelectItem value="on">켬</SelectItem>
              <SelectItem value="system">시스템 설정 따름</SelectItem>
            </SelectContent>
          </Select>
        </OptionItem>
      </Section>

      <Section title="마감 알림">
        <OptionItem
          id="notifications-enable"
          label="마감 알림 받기"
          description="제출하지 않은 과제의 마감이 다가오면 데스크톱 알림을 보냅니다. 켤 때 알림 권한을 요청합니다."
        >
          <Switch
            id="notifications-enable"
            checked={draft.options.notifications.enable}
            onCheckedChange={withPermission({ permissions: ["notifications"] }, (enable) =>
              edit({
                ...draft,
                options: {
                  ...draft.options,
                  notifications: { ...draft.options.notifications, enable },
                },
              }),
            )}
          />
        </OptionItem>
        <OptionItem
          sub
          id="notifications-hoursBefore"
          label="알림 시점"
          description="마감 몇 시간 전에 알릴지 쉼표로 구분해 적습니다. (기본값: 24, 3)"
        >
          <WithUnit unit="시간 전">
            <Input
              id="notifications-hoursBefore"
              className={numberInput}
              value={draft.reminderHours}
              onChange={(event) => edit({ ...draft, reminderHours: event.target.value })}
            />
          </WithUnit>
        </OptionItem>
      </Section>

      <Section title="Todoist 연동">
        <OptionItem
          id="todoist-enable"
          label="Todoist에 과제 추가"
          description="제출하지 않은 과제를 과목별 섹션에 Todoist 태스크로 만들고 CSMS+ 라벨을 붙입니다. LMS 마감 전날을 deadline으로 넣고, 제출하면 완료 처리하고, 추적 제외하면 삭제합니다. 켤 때 Todoist 접근 권한을 요청합니다."
        >
          <Switch
            id="todoist-enable"
            checked={draft.options.todoist.enable}
            onCheckedChange={withPermission({ origins: ["https://api.todoist.com/*"] }, (enable) =>
              editTodoist({ enable }),
            )}
          />
        </OptionItem>
        <OptionItem
          sub
          id="todoist-token"
          label="API 토큰"
          description="Todoist 설정 → 연동 → 개발자에서 복사합니다. 이 브라우저에만 저장됩니다."
        >
          <Input
            id="todoist-token"
            type="password"
            autoComplete="off"
            className="w-60"
            value={draft.options.todoist.token}
            onChange={(event) => editTodoist({ token: event.target.value.trim() })}
          />
        </OptionItem>
        <OptionItem
          sub
          id="todoist-projectName"
          label="프로젝트"
          description="태스크를 넣을 프로젝트 이름입니다. 없으면 새로 만듭니다."
        >
          <Input
            id="todoist-projectName"
            className="w-60"
            value={draft.options.todoist.projectName}
            onChange={(event) => editTodoist({ projectName: event.target.value })}
          />
        </OptionItem>
        <OptionItem
          sub
          id="todoist-labels"
          label="라벨"
          description="새로 만드는 태스크에 CSMS+ 라벨과 함께 붙일 라벨입니다. Todoist에 없는 라벨은 동기화할 때 만듭니다."
        >
          <LabelPicker
            id="todoist-labels"
            token={draft.options.todoist.token}
            disabled={!draft.options.todoist.enable || !draft.options.todoist.token}
            value={draft.options.todoist.labels}
            onChange={(labels) => editTodoist({ labels })}
          />
        </OptionItem>
        <TodoistStatusLine />
      </Section>

      <Section title="고급 설정">
        <div className="pb-4">
          <Alert>
            <TriangleAlert />
            <AlertTitle>주의</AlertTitle>
            <AlertDescription>
              이 설정들은 확장 프로그램의 성능에 큰 영향을 미칠 수 있습니다. 무엇을 하는지 정확히
              알고 있는 경우에만 변경하세요.
            </AlertDescription>
          </Alert>
        </div>
        <OptionItem
          id="advanced-fetchInterval"
          label="데이터 요청 간격"
          description="서버 부하 방지를 위한 요청 사이의 대기 시간입니다. (최소 10ms)"
        >
          <WithUnit unit="ms">
            <Input min={10} step={10} {...number("fetchInterval")} />
          </WithUnit>
        </OptionItem>
        <OptionItem
          id="advanced-syncIntervalMinutes"
          label="백그라운드 동기화 간격"
          description="LMS 페이지를 열지 않아도 이 간격마다 과제 정보를 새로 받아옵니다. (최소 5분)"
        >
          <WithUnit unit="분">
            <Input min={5} step={5} {...number("syncIntervalMinutes")} />
          </WithUnit>
        </OptionItem>
        {(
          [
            [
              "cacheTtl",
              "기본 캐시 유효 시간",
              "완료되지 않은 과제 데이터의 캐시 유효 기간입니다.",
            ],
            [
              "cacheTtlSubmitted",
              "제출된 과제 캐시 유효 시간",
              "이미 제출한 과제 데이터의 캐시 유효 기간입니다.",
            ],
          ] as const
        ).map(([field, label, description]) => (
          <OptionItem key={field} id={`advanced-${field}`} label={label} description={description}>
            <div className="flex flex-col items-end gap-1">
              <WithUnit unit="ms">
                <Input min={1000} step={1000} {...number(field)} />
              </WithUnit>
              <span className="text-xs text-muted-foreground">{preview(field)}</span>
            </div>
          </OptionItem>
        ))}
        <OptionItem
          id="clear-cache-btn"
          label="캐시 데이터 삭제"
          description="저장된 모든 과제 데이터 및 임시 파일을 삭제합니다. 설정은 유지됩니다."
        >
          <Button id="clear-cache-btn" variant="destructive" onClick={() => void clearCache()}>
            <Trash2 />
            캐시 삭제
          </Button>
        </OptionItem>
      </Section>

      <SaveBar visible={dirty} instant={instantHide} onSave={() => void save()} />
    </div>
  );
}
