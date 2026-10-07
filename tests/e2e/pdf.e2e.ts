import { inflateSync } from "node:zlib";
import { expect, test } from "./extension.ts";

// Page objects may sit inside FlateDecode object streams, so every stream is inflated
// before searching for page sizes.
function pageSizes(pdf: Buffer): number[][] {
  const text = [pdf.toString("latin1")];
  for (const match of pdf.toString("latin1").matchAll(/stream\r?\n([\s\S]*?)\r?\nendstream/g)) {
    try {
      text.push(inflateSync(Buffer.from(match[1], "latin1")).toString("latin1"));
    } catch {
      // Not every stream is deflated (image data may be stored raw).
    }
  }
  return [...text.join("\n").matchAll(/\/MediaBox\s*\[\s*0 0 ([\d.]+) ([\d.]+)\s*\]/g)].map((m) => [
    Number(m[1]),
    Number(m[2]),
  ]);
}

test("document viewer downloads all pages as one PDF", async ({ context }) => {
  const page = await context.newPage();
  await page.goto("https://lms.gist.ac.kr/local/ubdoc/view.php?id=1");
  const button = page.locator("#coursemos-download-btn, [aria-label='PDF로 다운로드']").first();
  await expect(button).toBeVisible();
  await expect(button).toHaveScreenshot("pdf-download-button.png");

  const [download] = await Promise.all([page.waitForEvent("download"), button.click()]);
  expect(download.suggestedFilename()).toBe("강의자료.pdf");
  const pdf = Buffer.concat(await (await download.createReadStream()).toArray());
  expect(pageSizes(pdf)).toEqual([
    [16, 16],
    [48, 48],
    [128, 128],
  ]);
});
