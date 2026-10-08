import { loadOptions } from "../../shared/options.ts";
import { mount } from "../mount.tsx";
import { DownloadButton } from "./download-button.tsx";
import { readDocumentParams } from "./make-pdf.ts";

const VIEWER = "doc.coursemos.co.kr/view/v1/viewer/doc.html";

// The viewer iframe is added by the page's own script after load; this checks every 100ms
// for up to 5 seconds.
function waitForViewer(attempts = 50): Promise<HTMLIFrameElement | null> {
  return new Promise((resolve) => {
    const check = (left: number) => {
      const iframe = document.querySelector("iframe");
      if (iframe?.src.includes(VIEWER)) resolve(iframe);
      else if (left <= 0) resolve(null);
      else setTimeout(() => check(left - 1), 100);
    };
    check(attempts);
  });
}

async function main() {
  if (!(await loadOptions()).pdfdl.enable) return;
  const iframe = await waitForViewer();
  const params = iframe && readDocumentParams(iframe.src);
  if (!params) return;

  const host = document.createElement("div");
  document.body.append(host);
  mount(host, <DownloadButton params={params} />);
}

void main();
