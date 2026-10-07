// @vitest-environment jsdom
import { describe, expect, it } from "vite-plus/test";
import { hasSubmissionSummary, parseAssignmentDocument } from "./scrape.ts";

const doc = (body: string) => new DOMParser().parseFromString(`<body>${body}</body>`, "text/html");
const page = (rows: string, intro = "<p>설명</p>") =>
  doc(`<div id="region-main"><div><h2> 과제 1 </h2><div id="intro">${intro}</div>
  <table class="submissionsummarytable">${rows}</table></div></div>`);
const row = (header: string, value: string) =>
  `<tr><td class="cell c0">${header}</td><td class="cell c1">${value}</td></tr>`;
const now = new Date(2026, 8, 30, 12, 0);

describe("parseAssignmentDocument", () => {
  it("reads title, deadline and submission from c0/c1 rows", () => {
    const result = parseAssignmentDocument(
      page(row("제출 여부", "제출 완료") + row("종료 일시", "2026-10-01 23:59")),
      now,
    );
    expect(result).toEqual({
      title: "과제 1",
      content: "설명",
      deadline: "2026-10-01 23:59",
      isSubmitted: true,
    });
  });

  it("reads th/td rows", () => {
    const result = parseAssignmentDocument(
      doc(
        "<table><tr><th>제출 여부</th><td>제출함</td></tr><tr><th>종료 일시</th><td>2026-10-01 23:59</td></tr></table>",
      ),
      now,
    );
    expect(result).toMatchObject({ deadline: "2026-10-01 23:59", isSubmitted: true });
  });

  it("marks assignments without online submission done after the deadline", () => {
    const rows = (deadline: string) =>
      row("제출 여부", "온라인 제출물을 요구하지 않습니다") + row("종료 일시", deadline);
    expect(parseAssignmentDocument(page(rows("2026-09-30 11:00")), now).isSubmitted).toBe(true);
    expect(parseAssignmentDocument(page(rows("2026-09-30 13:00")), now).isSubmitted).toBe(false);
  });

  it("joins paragraphs and truncates long content", () => {
    expect(
      parseAssignmentDocument(page("", "<p>첫 줄</p><p> </p><p>둘째\n줄</p>"), now).content,
    ).toBe("첫 줄 · 둘째 · 줄");
    const long = parseAssignmentDocument(page("", `<p>${"가".repeat(250)}</p>`), now).content;
    expect(long).toBe(`${"가".repeat(200)}...`);
  });

  it("reports pages without a submission summary", () => {
    expect(hasSubmissionSummary(doc("<form id='login'></form>"))).toBe(false);
    expect(hasSubmissionSummary(page(row("종료 일시", "2026-10-01 23:59")))).toBe(true);
    expect(parseAssignmentDocument(doc(""), now)).toEqual({
      title: "",
      content: "",
      deadline: null,
      isSubmitted: false,
    });
  });
});
