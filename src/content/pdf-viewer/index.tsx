import { loadOptions } from "../../shared/options.ts";
import { mount } from "../mount.tsx";
import { DownloadButton } from "./download-button.tsx";
import { readDocumentParams } from "./make-pdf.ts";

const VIEWER = "doc.coursemos.co.kr/view/v1/viewer/doc.html";

// The viewer iframe is added by the page's own script after load.
function waitForViewer(timeout = 5000): Promise<HTMLIFrameElement | null> {
  const started = Date.now();
  return new Promise((resolve) => {
    const check = () => {
      const iframe = document.querySelector("iframe");
      if (iframe?.src.includes(VIEWER)) resolve(iframe);
      else if (Date.now() - started > timeout) resolve(null);
      else setTimeout(check, 100);
    };
    check();
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
