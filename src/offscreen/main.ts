import type { ParseRequest } from "../shared/messages.ts";
import { parsePage } from "../shared/sync/pages.ts";

// Every extension page receives runtime messages, so only parse requests are answered here.
chrome.runtime.onMessage.addListener((message: ParseRequest, _sender, sendResponse) => {
  if (message?.target !== "offscreen") return;
  const doc = new DOMParser().parseFromString(message.html, "text/html");
  sendResponse(parsePage(message.kind, doc, message.url));
});
