import { toast } from "sonner";
import type { TodoistSyncRequest, TodoistSyncResponse } from "../shared/messages.ts";
import type { TodoistStatus } from "../shared/todoist/sync.ts";

export function todoistChanges({ added = 0, closed = 0, updated = 0 }: TodoistStatus): string[] {
  return [
    added && `과제 ${added}개 추가`,
    closed && `${closed}개 완료 처리`,
    updated && `${updated}개 수정`,
  ].filter((part): part is string => Boolean(part));
}

export function toastTodoist(status: TodoistStatus, id?: string | number) {
  if (status.state === "error") {
    toast.error("Todoist 동기화에 실패했습니다.", { id, description: status.message });
    return;
  }
  const changes = todoistChanges(status);
  toast.success("Todoist와 동기화했습니다.", {
    id,
    description: changes.length ? changes.join(" · ") : "새로 추가할 과제가 없습니다.",
  });
}

export async function syncTodoistWithToast() {
  const id = toast.loading("Todoist와 동기화하는 중...");
  const request: TodoistSyncRequest = { action: "syncTodoist" };
  const status: TodoistSyncResponse = await chrome.runtime.sendMessage(request);
  if (status) toastTodoist(status, id);
  else toast.dismiss(id);
}
