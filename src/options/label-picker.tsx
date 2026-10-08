import { Check, ChevronsUpDown, Plus } from "lucide-react";
import { useState } from "react";
import type { TodoistLabelsRequest, TodoistLabelsResponse } from "../shared/messages.ts";
import { TASK_LABEL } from "../shared/todoist/sync.ts";
import { cn } from "../ui/cn.ts";
import { Badge } from "../ui/shadcn/badge.tsx";
import { Button } from "../ui/shadcn/button.tsx";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "../ui/shadcn/command.tsx";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/shadcn/popover.tsx";

export function LabelPicker({
  id,
  token,
  disabled,
  value,
  onChange,
}: {
  id: string;
  token: string;
  disabled: boolean;
  value: string[];
  onChange: (labels: string[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [result, setResult] = useState<TodoistLabelsResponse | null>(null);
  const [loadedFor, setLoadedFor] = useState<string | null>(null);

  // Loaded on open rather than as the token is typed, so a half-pasted token never hits the API.
  const onOpenChange = (next: boolean) => {
    setOpen(next);
    if (!next) return setQuery("");
    if (loadedFor === token) return;
    setLoadedFor(token);
    setResult(null);
    const request: TodoistLabelsRequest = { action: "todoistLabels", token };
    void chrome.runtime
      .sendMessage<TodoistLabelsRequest, TodoistLabelsResponse>(request)
      .then(setResult);
  };

  const existing = result && "labels" in result ? result.labels : [];
  // Labels picked by name but not in Todoist yet stay listed so they can be unpicked.
  const choices = [...new Set([...existing, ...value])].filter((name) => name !== TASK_LABEL);
  const typed = query.trim();
  const canCreate = typed && typed !== TASK_LABEL && !choices.includes(typed);
  const toggle = (name: string) =>
    onChange(value.includes(name) ? value.filter((v) => v !== name) : [...value, name]);

  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className="h-auto min-h-9 w-60 justify-between py-1.5 font-normal"
        >
          {value.length ? (
            <span className="flex flex-wrap gap-1">
              {value.map((name) => (
                <Badge key={name} variant="secondary">
                  {name}
                </Badge>
              ))}
            </span>
          ) : (
            <span className="text-muted-foreground">라벨 선택</span>
          )}
          <ChevronsUpDown className="opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-60 p-0">
        <Command>
          <CommandInput placeholder="라벨 검색 또는 입력" value={query} onValueChange={setQuery} />
          <CommandList>
            {result === null && (
              <p className="py-6 text-center text-sm text-muted-foreground">불러오는 중...</p>
            )}
            {result && "error" in result && (
              <p className="px-3 py-2 text-sm text-destructive">{result.error}</p>
            )}
            {result && <CommandEmpty>라벨이 없습니다.</CommandEmpty>}
            <CommandGroup>
              {choices.map((name) => (
                <CommandItem key={name} value={name} onSelect={() => toggle(name)}>
                  <Check className={cn(!value.includes(name) && "opacity-0")} />
                  {name}
                </CommandItem>
              ))}
              {canCreate && (
                <CommandItem
                  value={`new ${typed}`}
                  onSelect={() => {
                    toggle(typed);
                    setQuery("");
                  }}
                >
                  <Plus />
                  &quot;{typed}&quot; 새 라벨로 추가
                </CommandItem>
              )}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
