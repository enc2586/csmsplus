import { jsPDF } from "jspdf";

export type DocumentParams = { fn: string; rs: string; name: string };

type ImageResponse =
  | { success: true; data: string }
  | { success: false; status?: number; error?: string };

export function readDocumentParams(viewerUrl: string): DocumentParams | null {
  const url = new URL(viewerUrl);
  const fn = url.searchParams.get("fn");
  const rs = url.searchParams.get("rs");
  if (!fn || !rs) return null;
  return { fn, rs, name: url.searchParams.get("rmn") || "document" };
}

function decodeBase64(data: string): Uint8Array {
  return Uint8Array.from(atob(data), (char) => char.charCodeAt(0));
}

// The viewer serves each page as <n>.png with no page count, so pages are requested in
// order until one is missing. The images are on another origin, which the content script
// cannot fetch directly, so the service worker downloads them.
export async function downloadPages(
  { fn, rs }: DocumentParams,
  onPage: (page: number) => void,
): Promise<Uint8Array[]> {
  const pages: Uint8Array[] = [];
  for (let page = 1; ; page++) {
    onPage(page);
    try {
      const response: ImageResponse = await chrome.runtime.sendMessage({
        action: "downloadImage",
        url: `https://doc.coursemos.co.kr${rs}/${fn}.files/${page}.png`,
      });
      if (!response.success) {
        if (response.status !== 404)
          console.error(`Failed to download page ${page}:`, response.error);
        break;
      }
      pages.push(decodeBase64(response.data));
    } catch (error) {
      console.error(`Failed to download page ${page}:`, error);
      break;
    }
  }
  return pages;
}

// One PDF point per image pixel, matching the page sizes earlier versions produced.
export function makePdf(pages: Uint8Array[], onPage: (page: number) => void): Blob {
  let pdf: jsPDF | undefined;
  pages.forEach((image, index) => {
    onPage(index + 1);
    const probe = pdf ?? new jsPDF({ unit: "pt", compress: true });
    const { width, height } = probe.getImageProperties(image);
    const orientation = width > height ? "landscape" : "portrait";
    if (pdf) pdf.addPage([width, height], orientation);
    else pdf = new jsPDF({ unit: "pt", format: [width, height], orientation, compress: true });
    pdf.addImage(image, "PNG", 0, 0, width, height);
  });
  return pdf!.output("blob");
}
