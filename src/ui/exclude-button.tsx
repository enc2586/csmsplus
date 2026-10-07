import { useState } from "react";
import { setExcluded } from "../shared/assignment/exclusions.ts";

export function ExcludeButton({
  id,
  title,
  excluded,
}: {
  id: string;
  title: string;
  excluded: boolean;
}) {
  const [saving, setSaving] = useState(false);
  const text = excluded ? "다시 추적" : "추적 제외";

  // The label flips through the storage change event, not here, so every place showing
  // the same assignment updates together.
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
    <button
      type="button"
      aria-label={`${title}: ${text}`}
      disabled={saving}
      onClick={() => void toggle()}
      className="inline-flex min-h-5.5 shrink-0 cursor-pointer items-center justify-center rounded-[4px] border border-gray-ccc bg-white px-1.5 py-0.5 text-[11px] leading-[1.2] whitespace-nowrap text-gray-444 disabled:cursor-wait disabled:opacity-50"
    >
      {text}
    </button>
  );
}
