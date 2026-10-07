// Synthetic LMS pages shaped after the selectors the extension reads. Deadlines are
// relative to the current time because the extension's isolated world keeps the real
// clock even when the page clock is mocked.

export type FixtureAssignment = {
  id: string;
  title: string;
  hoursFromNow: number | null;
  submitted: boolean;
  intro: string;
};

export const COURSE_ID = "100";

export const assignments: FixtureAssignment[] = [
  { id: "1", title: "과제 1", hoursFromNow: 10, submitted: false, intro: "첫 번째 과제 설명" },
  { id: "2", title: "과제 2", hoursFromNow: -24, submitted: false, intro: "두 번째 과제 설명" },
  { id: "3", title: "과제 3", hoursFromNow: -24, submitted: true, intro: "세 번째 과제 설명" },
  { id: "4", title: "과제 4", hoursFromNow: 24 * 5, submitted: false, intro: "네 번째 과제 설명" },
  { id: "5", title: "과제 5", hoursFromNow: null, submitted: false, intro: "다섯 번째 과제 설명" },
  { id: "6", title: "과제 6", hoursFromNow: 1, submitted: false, intro: "여섯 번째 과제 설명" },
];

// Deadlines have minute precision. Rounding up and adding a minute keeps the shown
// remaining time ("10시간 1분 남음") stable for the minute after a page is served.
export function deadlineText(hoursFromNow: number): string {
  const baseTime = Math.ceil(Date.now() / 60_000) * 60_000 + 60_000;
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date(baseTime + hoursFromNow * 3_600_000));
  const get = (type: string) => parts.find((part) => part.type === type)!.value;
  return `${get("year")}-${get("month")}-${get("day")} ${get("hour")}:${get("minute")}`;
}

const page = (body: string) =>
  `<!doctype html><html lang="ko"><head><meta charset="utf-8"><title>GIST LMS</title>
<style>body{font:14px Arial,sans-serif;color:#333;margin:0;padding:24px;background:#f7f7f7}
.course_lists ul{list-style:none;padding:0;display:grid;gap:12px;max-width:720px}
.course_lists li>div{background:#fff;border:1px solid #ddd;padding:16px;min-height:72px}
ul.topics{list-style:none;padding:0;max-width:900px}
li.section{background:#fff;border:1px solid #ddd;margin-bottom:16px;padding:16px;list-style:none}
.cards{display:flex;gap:20px;list-style:none;padding:0}
.course_box0{width:100px;text-align:center}
.course_box0 .icon{display:block;width:48px;height:48px;margin:0 auto 6px;border-radius:50%;background:#e86a61}
.activityinstance{padding:6px 0}
</style></head><body>${body}</body></html>`;

const link = (a: FixtureAssignment) =>
  `<a href="https://lms.gist.ac.kr/mod/assign/view.php?id=${a.id}"><span class="instancename">${a.title}<span class="accesshide"> 과제</span></span></a>`;

export function homePage(): string {
  return page(`<div class="progress_courses"><div class="course_lists"><ul>
<li><div><a class="course_link" href="https://lms.gist.ac.kr/course/view.php?id=${COURSE_ID}"><span class="course-title">자료구조</span></a></div></li>
</ul></div></div>`);
}

export function coursePage(): string {
  const [first] = assignments;
  const week = assignments
    .map(
      (a) =>
        `<li class="activity assign modtype_assign"><div class="activityinstance">${link(a)}</div></li>`,
    )
    .join("");
  return page(`<div class="course-content"><ul class="topics">
<li id="section-0" class="section main"><div class="content"><ul class="cards">
<li class="activity assign modtype_assign"><div class="course_box0"><div class="activityinstance">
<a href="https://lms.gist.ac.kr/mod/assign/view.php?id=${first.id}"><span class="icon"></span><span class="instancename">${first.title}<span class="accesshide"> 과제</span></span></a>
</div></div></li></ul></div></li>
<li id="section-1" class="section main"><div class="content"><h3>1주차</h3><ul class="section">${week}</ul></div></li>
</ul></div>`);
}

export function assignmentPage(id: string): string {
  const a = assignments.find((item) => item.id === id)!;
  const rows = [
    `<tr><td class="cell c0">제출 여부</td><td class="cell c1">${a.submitted ? "제출 완료" : "제출 안 함"}</td></tr>`,
    a.hoursFromNow === null
      ? ""
      : `<tr><td class="cell c0">종료 일시</td><td class="cell c1">${deadlineText(a.hoursFromNow)}</td></tr>`,
  ].join("");
  return page(`<div id="region-main"><div><h2>${a.title}</h2>
<div id="intro" class="box generalbox boxaligncenter"><p>${a.intro}</p></div>
<h3>제출 상황</h3><table class="submissionsummarytable"><tbody>${rows}</tbody></table></div></div>`);
}

export const PDF_DOC = { fn: "lecture01", rs: "/files/abc", rmn: "강의자료.pdf" };

export function documentPage(): string {
  const src = `https://doc.coursemos.co.kr/view/v1/viewer/doc.html?fn=${PDF_DOC.fn}&rs=${encodeURIComponent(PDF_DOC.rs)}&rmn=${encodeURIComponent(PDF_DOC.rmn)}`;
  return page(`<h2>강의자료</h2><iframe src="${src}" width="640" height="360"></iframe>`);
}
