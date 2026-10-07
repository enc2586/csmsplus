import { cn } from "../ui/cn.ts";

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
        "pointer-events-none sticky bottom-20 mt-40 flex translate-y-20 items-center justify-between overflow-visible rounded-8 border border-white/10 bg-dark-card/80 px-24 py-16 opacity-0 shadow-[0_4px_20px_rgba(0,0,0,0.4)] backdrop-blur-[12px] transition-all duration-300",
        "before:pointer-events-none before:absolute before:-inset-x-40 before:-inset-y-60 before:-z-1 before:rounded-24 before:bg-linear-to-b before:from-[rgba(30,30,30,0)] before:to-[rgba(30,30,30,0.5)] before:[mask-image:linear-gradient(to_bottom,rgba(0,0,0,0.2),black_70%)] before:backdrop-blur-[20px] before:content-['']",
        visible && "pointer-events-auto translate-y-0 opacity-100",
        instant && "transition-none",
      )}
    >
      <div className="flex items-center gap-12">
        <span className="block font-semibold text-accent">변경사항이 있어요!</span>
      </div>
      <button
        id="save-btn"
        type="button"
        className="cursor-pointer rounded-4 bg-accent px-20 py-10 font-[Arial] text-14 font-semibold text-white transition-colors duration-200 hover:bg-accent-hover disabled:cursor-not-allowed disabled:bg-gray-555 disabled:text-gray-aaa"
        onClick={onSave}
      >
        저장하기
      </button>
    </div>
  );
}
