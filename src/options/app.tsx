import { FileText, Info, Settings } from "lucide-react";
import { type ReactNode, useState } from "react";
import { cn } from "../ui/cn.ts";
import { Button } from "../ui/shadcn/button.tsx";
import { Toaster } from "../ui/shadcn/sonner.tsx";
import { AboutTab } from "./about-tab.tsx";
import { PatchNotesTab } from "./patch-notes-tab.tsx";
import { SettingsTab } from "./settings-tab.tsx";

const tabs = [
  { id: "settings", label: "Options", icon: <Settings />, content: <SettingsTab /> },
  { id: "patch-notes", label: "Patch Notes", icon: <FileText />, content: <PatchNotesTab /> },
  { id: "about", label: "About", icon: <Info />, content: <AboutTab /> },
] satisfies { id: string; label: string; icon: ReactNode; content: ReactNode }[];

export function App() {
  const [active, setActive] = useState<string>("settings");
  const current = tabs.find((tab) => tab.id === active)!;

  return (
    <div className="flex h-full">
      <nav className="flex w-60 shrink-0 flex-col gap-1 border-r bg-muted/40 p-4">
        <div className="mb-4 px-2 text-xl font-bold text-brand">CSMS+</div>
        {tabs.map((tab) => (
          <Button
            key={tab.id}
            variant={tab.id === active ? "secondary" : "ghost"}
            className={cn("justify-start", tab.id !== active && "text-muted-foreground")}
            onClick={() => setActive(tab.id)}
          >
            {tab.icon}
            {tab.label}
          </Button>
        ))}
      </nav>
      <main className="flex-1 overflow-y-auto p-10">
        <div key={current.id} className="mx-auto max-w-3xl animate-fade-up">
          <h1 className="mb-6 text-2xl font-semibold">{current.label}</h1>
          {current.content}
        </div>
      </main>
      <Toaster position="top-center" />
    </div>
  );
}
