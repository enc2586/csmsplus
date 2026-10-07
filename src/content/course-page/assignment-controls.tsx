import { useStore } from "zustand";
import { cn } from "../../ui/cn.ts";
import { ExcludeButton } from "../../ui/exclude-button.tsx";
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
  return (
    <span
      className={cn(
        "ml-2 inline-flex items-center gap-1 align-middle text-[11px] text-gray-666",
        card && "m-0 mt-1 flex flex-col",
      )}
    >
      <ExcludeButton id={id} title={title} excluded={excluded} />
    </span>
  );
}
