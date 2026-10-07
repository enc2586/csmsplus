import { useEffect, useState } from "react";
import { useStore } from "zustand";
import { cn } from "../../ui/cn.ts";
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
    <div
      className={cn(
        "relative -mt-5 mb-0 h-3 w-full overflow-hidden bg-black/5 transition-[height,opacity,margin] duration-500 ease-in-out",
        phase === "collapsing" && "m-0 h-0 opacity-0",
      )}
    >
      <div
        className="absolute top-0 left-0 h-full bg-accent transition-[width] duration-300 ease-out"
        style={{ width: `${Math.min(100, progress * 100)}%` }}
      />
    </div>
  );
}
