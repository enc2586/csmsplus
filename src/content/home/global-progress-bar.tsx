import { useEffect, useState } from "react";
import { useStore } from "zustand";
import { cn } from "../../ui/cn.ts";
import { Progress } from "../../ui/shadcn/progress.tsx";
import { homeStore } from "./store.ts";

export function GlobalProgressBar() {
  const progress = useStore(homeStore, (state) => {
    const courses = Object.values(state.courses);
    return courses.length ? courses.reduce((sum, c) => sum + c.progress, 0) / courses.length : 0;
  });
  const [phase, setPhase] = useState<"loading" | "collapsing" | "gone">("loading");

  // Holds the full bar briefly, then lets the height/opacity transition finish before removal.
  useEffect(() => {
    if (phase === "loading" && progress >= 0.999) {
      const timer = setTimeout(() => setPhase("collapsing"), 800);
      return () => clearTimeout(timer);
    }
    if (phase === "collapsing") {
      const timer = setTimeout(() => setPhase("gone"), 500);
      return () => clearTimeout(timer);
    }
  }, [phase, progress]);

  if (phase === "gone") return null;
  return (
    <Progress
      aria-label="강좌별 과제 불러오는 중"
      value={Math.min(100, progress * 100)}
      className={cn(
        "mb-2 h-1 rounded-full transition-[height,opacity,margin] duration-500 ease-in-out [&>[data-slot=progress-indicator]]:bg-brand",
        phase === "collapsing" && "m-0 h-0 opacity-0",
      )}
    />
  );
}
