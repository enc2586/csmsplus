import { useState } from "react";
import { setExcluded } from "../shared/assignment/exclusions.ts";
import { Button } from "./shadcn/button.tsx";

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
    <Button
      variant="outline"
      size="xs"
      aria-label={`${title}: ${text}`}
      disabled={saving}
      onClick={() => void toggle()}
      className="font-sans"
    >
      {text}
    </Button>
  );
}
