import { useState } from "react";
import { useStore } from "zustand";
import { setExcluded } from "../../shared/assignment/exclusions.ts";
import { cn } from "../../ui/cn.ts";
import { courseStore } from "./store.ts";

export function AssignmentControls({
  id,
  title,
  card,
}: {
  id: string;
  title: string;
  card: boolean;
}) {
  const excluded = useStore(courseStore, (state) => state.excluded.has(id));
  const [saving, setSaving] = useState(false);
  const text = excluded ? "다시 추적" : "추적 제외";

  // The label flips through the storage change event, not here, so every link to the
  // same assignment updates together.
  const toggle = async () => {
    setSaving(true);
    try {
      await setExcluded(id, !excluded);
    } catch {
      alert("추적 설정을 저장하지 못했습니다. 다시 시도해 주세요.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <span
      className={cn(
        "ml-8 inline-flex items-center gap-4 align-middle text-11 text-gray-666",
        card && "m-0 mt-4 flex flex-col",
      )}
    >
      <button
        type="button"
        aria-label={`${title}: ${text}`}
        disabled={saving}
        onClick={() => void toggle()}
        className="inline-flex min-h-22 shrink-0 cursor-pointer items-center justify-center rounded-4 border border-gray-ccc bg-white px-6 py-2 leading-[1.2] whitespace-nowrap text-gray-444 disabled:cursor-wait disabled:opacity-50"
      >
        {text}
      </button>
    </span>
  );
}
