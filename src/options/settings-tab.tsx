import { type ReactNode, useEffect, useRef, useState } from "react";
import { isExclusionKey } from "../shared/assignment/exclusions.ts";
import { loadOptions, type Options, parseOptions, saveOptions } from "../shared/options.ts";
import { cn } from "../ui/cn.ts";
import { msToNaturalLanguage } from "./duration.ts";
import { TrashIcon, WarningIcon } from "./icons.tsx";
import { SaveBar } from "./save-bar.tsx";
import { ToggleSwitch } from "./toggle-switch.tsx";

type NumberField =
  | "urgentThresholdHours"
  | "fetchInterval"
  | "syncIntervalMinutes"
  | "cacheTtl"
  | "cacheTtlSubmitted";

// Number inputs stay as raw text while editing so a half-typed value is not coerced.
type Draft = { options: Options; numbers: Record<NumberField, string> };

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
  };
}

function fromDraft({ options, numbers }: Draft): Options {
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
  });
}

async function clearCache() {
  if (!confirm("정말 모든 캐시 데이터를 삭제하시겠습니까?\n이 작업은 되돌릴 수 없습니다.")) return;
  const items = await chrome.storage.local.get(null);
  const keys = Object.keys(items).filter((key) => key !== "options" && !isExclusionKey(key));
  if (keys.length === 0) {
    alert("삭제할 캐시 데이터가 없습니다.");
    return;
  }
  await chrome.storage.local.remove(keys);
  alert("캐시 데이터가 성공적으로 삭제되었습니다.");
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mb-40">
      <h2 className="mb-20 border-b border-gray-333 pb-10 text-18 font-semibold">{title}</h2>
      {children}
    </section>
  );
}

function OptionItem({
  label,
  description,
  sub,
  children,
}: {
  label: string;
  description: string;
  sub?: boolean;
  children: ReactNode;
}) {
  return (
    <div
      className={cn(
        "mb-12 flex items-center justify-between rounded-8 border border-transparent bg-dark-card p-16 transition-colors duration-200 hover:border-gray-444",
        sub && "ml-20 border-l-3 border-l-gray-333 bg-dark-card/50 hover:border-l-gray-333",
      )}
    >
      <div className="flex-1 pr-20">
        <span className="mb-4 block text-15 font-medium">{label}</span>
        <span className="block text-13 leading-[1.4] text-gray-aaa">{description}</span>
      </div>
      {children}
    </div>
  );
}

// The legacy page never set a font on form controls, so they used Chrome's default (Arial).
const controlFont = cn("font-[Arial]");
const numberInput = cn(
  "w-120 rounded-4 border border-gray-333 bg-dark-input px-12 py-8 text-right text-14 text-gray-e0e0e0 focus:border-accent focus:outline-none [&::-webkit-inner-spin-button]:m-0 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:m-0 [&::-webkit-outer-spin-button]:appearance-none",
  controlFont,
);
const unit = cn("text-13 text-gray-aaa");

export function SettingsTab() {
  const [draft, setDraft] = useState<Draft | null>(null);
  const [dirty, setDirty] = useState(false);
  const [instantHide, setInstantHide] = useState(false);
  const thresholdRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    void loadOptions().then((options) => setDraft(toDraft(options)));
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
  const toggle = <S extends "pdfdl" | "tracker">(section: S, key: keyof Options[S]) => ({
    checked: draft.options[section][key] as boolean,
    onChange: (checked: boolean) =>
      edit({
        ...draft,
        options: { ...draft.options, [section]: { ...draft.options[section], [key]: checked } },
      }),
  });
  const number = (field: NumberField) => ({
    value: draft.numbers[field],
    onChange: (event: React.ChangeEvent<HTMLInputElement>) =>
      edit({ ...draft, numbers: { ...draft.numbers, [field]: event.target.value } }),
  });
  const preview = (field: NumberField) =>
    `≈ ${msToNaturalLanguage(Number.parseInt(draft.numbers[field], 10) || 0)}`;

  const save = async () => {
    if (!thresholdRef.current?.reportValidity()) return;
    await saveOptions(fromDraft(draft));
    setInstantHide(true);
    setDirty(false);
  };

  return (
    <>
      <Section title="PDF 다운로드">
        <OptionItem
          label="PDF 다운로드 기능 사용"
          description="강의 자료 페이지에 PDF 다운로드 버튼을 표시합니다."
        >
          <ToggleSwitch id="pdfdl-enable" {...toggle("pdfdl", "enable")} />
        </OptionItem>
      </Section>

      <Section title="과제 트래커">
        <OptionItem
          label="메인 페이지 과제 요약"
          description="LMS 메인 페이지의 강좌 카드에 과제 현황(완료/마감 임박/마감 지남/남음)을 표시합니다."
        >
          <ToggleSwitch
            id="tracker-enableSummaryAtDashboard"
            {...toggle("tracker", "enableSummaryAtDashboard")}
          />
        </OptionItem>
        <OptionItem
          label="메인 페이지 전체 과제 목록"
          description="LMS 메인 페이지 강좌 목록 아래에 모든 강좌의 과제를 마감 순서대로 모아 보여줍니다."
        >
          <ToggleSwitch
            id="tracker-enableAllAssignmentsAtDashboard"
            {...toggle("tracker", "enableAllAssignmentsAtDashboard")}
          />
        </OptionItem>
        <OptionItem
          label="강좌 페이지 과제 대시보드"
          description="강좌 페이지 상단에 전체 과제 현황 대시보드를 표시합니다."
        >
          <ToggleSwitch
            id="tracker-enableSummaryAtLecture"
            {...toggle("tracker", "enableSummaryAtLecture")}
          />
        </OptionItem>
        <OptionItem
          label="강좌 페이지 과제별 정보"
          description="각 과제 링크 아래에 상태 칩과 마감 정보를 표시합니다."
        >
          <ToggleSwitch
            id="tracker-enableAssignmentDetail"
            {...toggle("tracker", "enableAssignmentDetail")}
          />
        </OptionItem>
        <OptionItem
          sub
          label="과제 본문 미리보기 표시"
          description="과제 정보에 본문 내용을 짧게 미리 보여줍니다."
        >
          <ToggleSwitch id="tracker-showBody" {...toggle("tracker", "showBody")} />
        </OptionItem>
        <OptionItem
          sub
          label="마감까지 남은 시간 표시"
          description="마감일 옆에 남은 시간을 텍스트로 표시합니다."
        >
          <ToggleSwitch
            id="tracker-showRemainingTime"
            {...toggle("tracker", "showRemainingTime")}
          />
        </OptionItem>
        <OptionItem
          label="마감 임박 기준 (시간)"
          description="'임박'으로 표시할 마감 전 시간을 설정합니다. (기본값: 72시간)"
        >
          <div className="flex items-center gap-8">
            <input
              ref={thresholdRef}
              id="tracker-urgentThresholdHours"
              type="number"
              min={1}
              max={168}
              required
              className={numberInput}
              {...number("urgentThresholdHours")}
            />
            <span className={unit}>시간</span>
          </div>
        </OptionItem>
      </Section>

      <Section title="고급 설정">
        <div className="mb-24 flex flex-col items-start rounded-8 border border-[rgba(255,165,0,0.3)] bg-[rgba(255,165,0,0.1)] p-20 text-left text-warning">
          <div className="mb-8 flex items-center gap-8">
            <span className="flex items-center justify-center text-warning">
              <WarningIcon />
            </span>
            <strong className="text-15 font-bold text-warning">주의</strong>
          </div>
          <p className="m-0 text-14 leading-normal text-gray-aaa">
            이 설정들은 확장 프로그램의 성능에 큰 영향을 미칠 수 있습니다.
            <br />
            무엇을 하는지 정확히 알고 있는 경우에만 변경하세요.
          </p>
        </div>

        <OptionItem
          label="데이터 요청 간격 (Fetch Interval)"
          description="서버 부하 방지를 위한 요청 사이의 대기 시간입니다. (최소 10ms)"
        >
          <div className="flex items-center gap-8">
            <input
              id="advanced-fetchInterval"
              type="number"
              min={10}
              step={10}
              className={numberInput}
              {...number("fetchInterval")}
            />
            <span className={unit}>ms</span>
          </div>
        </OptionItem>

        <OptionItem
          label="백그라운드 동기화 간격"
          description="LMS 페이지를 열지 않아도 이 간격마다 과제 정보를 새로 받아옵니다. (최소 5분)"
        >
          <div className="flex items-center gap-8">
            <input
              id="advanced-syncIntervalMinutes"
              type="number"
              min={5}
              step={5}
              className={numberInput}
              {...number("syncIntervalMinutes")}
            />
            <span className={unit}>분</span>
          </div>
        </OptionItem>

        {(
          [
            [
              "cacheTtl",
              "기본 캐시 유효 시간 (TTL)",
              "완료되지 않은 과제 데이터의 캐시 유효 기간입니다.",
            ],
            [
              "cacheTtlSubmitted",
              "제출된 과제 캐시 유효 시간 (Submitted TTL)",
              "이미 제출한 과제 데이터의 캐시 유효 기간입니다.",
            ],
          ] as const
        ).map(([field, label, description]) => (
          <OptionItem key={field} label={label} description={description}>
            <div className="flex flex-col items-end gap-4">
              <div className="flex items-center gap-8">
                <input
                  id={`advanced-${field}`}
                  type="number"
                  min={1000}
                  step={1000}
                  className={numberInput}
                  {...number(field)}
                />
                <span className={unit}>ms</span>
              </div>
              <span className="ml-0 text-11 font-normal text-gray-aaa opacity-80">
                {preview(field)}
              </span>
            </div>
          </OptionItem>
        ))}

        <h3 className="mt-32 mb-16 border-l-3 border-accent pl-8 text-16 leading-[1.2] font-semibold text-gray-e0e0e0">
          데이터 관리
        </h3>
        <OptionItem
          label="캐시 데이터 삭제"
          description="저장된 모든 과제 데이터 및 임시 파일을 삭제합니다. 설정은 유지됩니다."
        >
          <button
            id="clear-cache-btn"
            type="button"
            className={cn(
              controlFont,
              "inline-flex cursor-pointer items-center gap-8 rounded-4 border border-[rgba(211,47,47,0.3)] bg-[rgba(211,47,47,0.1)] px-16 py-8 text-13 font-semibold text-danger transition-all duration-200 hover:border-danger hover:bg-[rgba(211,47,47,0.2)]",
            )}
            onClick={() => void clearCache()}
          >
            <span>
              <TrashIcon />
            </span>
            캐시 삭제
          </button>
        </OptionItem>
      </Section>

      <SaveBar visible={dirty} instant={instantHide} onSave={() => void save()} />
    </>
  );
}
