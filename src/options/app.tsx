import { type ReactNode, useState } from "react";
import { cn } from "../ui/cn.ts";
import { AboutTab } from "./about-tab.tsx";
import { FileIcon, InfoIcon, SettingsIcon } from "./icons.tsx";
import { PatchNotesTab } from "./patch-notes-tab.tsx";
import { SettingsTab } from "./settings-tab.tsx";

const tabs = [
  { id: "settings", label: "Options", icon: <SettingsIcon />, content: <SettingsTab /> },
  { id: "patch-notes", label: "Patch Notes", icon: <FileIcon />, content: <PatchNotesTab /> },
  { id: "about", label: "About", icon: <InfoIcon />, content: <AboutTab /> },
] satisfies { id: string; label: string; icon: ReactNode; content: ReactNode }[];

export function App() {
  const [active, setActive] = useState<string>("settings");
  const current = tabs.find((tab) => tab.id === active)!;

  return (
    <div className="flex h-full">
      <nav className="flex w-250 flex-col border-r border-gray-333 bg-dark-sidebar py-20">
        <div className="mb-10 border-b border-gray-333 px-24 pb-20 text-24 font-bold text-accent">
          CSMS+
        </div>
        <ul>
          {tabs.map((tab) => (
            <li key={tab.id}>
              <button
                type="button"
                className={cn(
                  "flex w-full cursor-pointer items-center px-24 py-12 text-left font-medium text-gray-aaa transition-[background-color,color] duration-200",
                  tab.id === active
                    ? "border-l-3 border-accent bg-accent/10 text-accent"
                    : "hover:bg-white/5 hover:text-gray-e0e0e0",
                )}
                onClick={() => setActive(tab.id)}
              >
                <span className="mr-12 text-16 [&_svg]:inline [&_svg]:align-baseline">
                  {tab.icon}
                </span>{" "}
                {tab.label}
              </button>
            </li>
          ))}
        </ul>
      </nav>
      <main className="flex-1 overflow-y-auto p-40">
        <div key={current.id} className="mx-auto block max-w-800 animate-fade-up">
          <h1 className="mb-30 text-28 font-semibold">{current.label}</h1>
          {current.content}
        </div>
      </main>
    </div>
  );
}
