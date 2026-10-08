import { isAfter } from "date-fns";
import { parseDeadline } from "./status.ts";

export type ScrapedAssignment = {
  title: string;
  content: string;
  deadline: string | null;
  isSubmitted: boolean;
};

const CONTENT_LIMIT = 200;

// Moodle renders the summary as either <th>/<td> rows or <td class="c0">/<td class="c1">
// pairs depending on the theme, so both layouts are searched.
function valueByHeader(doc: Document, header: string): string | null {
  const table = doc.querySelector(".submissionsummarytable");
  if (table) {
    const cell = [...table.querySelectorAll("th, td.cell.c0, td.c0")].find((el) =>
      el.textContent?.includes(header),
    );
    const row = cell?.closest("tr");
    if (cell && row) {
      const value = row.querySelector("td.cell.c1, td.c1, td:not(.c0):not(.cell)");
      if (value) return value.textContent?.trim() ?? null;
      const next = cell.nextElementSibling;
      if (next?.tagName === "TD") return next.textContent?.trim() ?? null;
    }
  }
  const th = [...doc.querySelectorAll("th")].find((el) => el.textContent?.includes(header));
  return th?.closest("tr")?.querySelector("td")?.textContent?.trim() ?? null;
}

function introText(doc: Document): string {
  const intro = doc.querySelector('#intro, .box.generalbox.boxaligncenter, [id*="intro"]');
  if (!intro) return "";
  const paragraphs = [...intro.querySelectorAll("p")];
  const raw =
    paragraphs.length > 1
      ? paragraphs
          .map((p) => p.textContent?.trim() ?? "")
          .filter(Boolean)
          .join(" · ")
      : (intro.textContent?.trim() ?? "");
  const text = raw.replace(/\n+/g, " · ").replace(/\s+/g, " ").trim();
  return text.length > CONTENT_LIMIT ? `${text.slice(0, CONTENT_LIMIT)}...` : text;
}

export function hasSubmissionSummary(doc: Document): boolean {
  return valueByHeader(doc, "제출 여부") !== null || valueByHeader(doc, "종료 일시") !== null;
}

export function parseAssignmentDocument(
  doc: Document,
  now: Date | number = Date.now(),
): ScrapedAssignment {
  const status = valueByHeader(doc, "제출 여부") ?? "";
  const deadline = valueByHeader(doc, "종료 일시");
  // Assignments without online submission never show "제출함"; the LMS treats them as
  // done once the deadline passes, so the tracker does too.
  const dueDate = parseDeadline(deadline);
  const isSubmitted = status.includes("온라인 제출물을 요구하지 않습니다")
    ? dueDate !== null && isAfter(now, dueDate)
    : status.includes("제출함") || status.includes("제출 완료");
  return {
    title: doc.querySelector("#region-main > div > h2")?.textContent?.trim() ?? "",
    content: introText(doc),
    deadline,
    isSubmitted,
  };
}
