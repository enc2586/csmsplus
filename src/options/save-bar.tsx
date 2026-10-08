import { cn } from "../ui/cn.ts";
import { Button } from "../ui/shadcn/button.tsx";

export function SaveBar({
  visible,
  instant,
  onSave,
}: {
  visible: boolean;
  instant: boolean;
  onSave: () => void;
}) {
  return (
    <div
      className={cn(
        "pointer-events-none sticky bottom-4 flex translate-y-4 items-center justify-between rounded-lg border bg-card/90 px-6 py-4 opacity-0 shadow-lg backdrop-blur-md transition-all duration-300",
        visible && "pointer-events-auto translate-y-0 opacity-100",
        instant && "transition-none",
      )}
    >
      <span className="text-sm font-medium">변경사항이 있어요!</span>
      <Button id="save-btn" onClick={onSave}>
        저장하기
      </Button>
    </div>
  );
}
