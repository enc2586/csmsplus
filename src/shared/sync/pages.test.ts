// @vitest-environment jsdom
import { describe, expect, it } from "vite-plus/test";
import { findAssignmentLinks, findCourses, isLoginPage, parsePage } from "./pages.ts";

const doc = (body: string) => new DOMParser().parseFromString(`<body>${body}</body>`, "text/html");

describe("findAssignmentLinks", () => {
  it("returns each assignment once with an absolute URL", () => {
    const page =
      doc(`<a href="/mod/assign/view.php?id=1">a</a><a href="https://lms.gist.ac.kr/mod/assign/view.php?id=1">b</a>
      <a href="/mod/assign/view.php?id=2">c</a><a href="/mod/quiz/view.php?id=3">d</a>`);
    expect(findAssignmentLinks(page)).toEqual([
      { id: "1", url: "https://lms.gist.ac.kr/mod/assign/view.php?id=1" },
      { id: "2", url: "https://lms.gist.ac.kr/mod/assign/view.php?id=2" },
    ]);
  });
});

describe("findCourses", () => {
  it("reads course ids and names from the home page cards", () => {
    const page = doc(`<div class="progress_courses"><div class="course_lists"><ul>
      <li><div><a class="course_link" href="/course/view.php?id=100"><div class="course-title"><h3> 자료구조 </h3></div><p>교수</p></a></div></li>
      <li><div><a class="course_link" href="/course/view.php?id=200">  운영체제  </a></div></li>
      <li><div><a class="course_link" href="/course/view.php">이상한 링크</a></div></li>
    </ul></div></div>`);
    expect(findCourses(page)).toEqual([
      { id: "100", name: "자료구조" },
      { id: "200", name: "운영체제" },
    ]);
  });
});

describe("isLoginPage", () => {
  it("detects the login redirect and the login form", () => {
    expect(isLoginPage(doc(""), "https://lms.gist.ac.kr/login/index.php")).toBe(true);
    expect(isLoginPage(doc('<input type="password">'), "https://lms.gist.ac.kr/")).toBe(true);
    expect(isLoginPage(doc("<p>안녕하세요</p>"), "https://lms.gist.ac.kr/")).toBe(false);
  });
});

describe("parsePage", () => {
  it("leaves the assignment empty when the page has no submission summary", () => {
    expect(
      parsePage(
        "assignment",
        doc("<p>준비 중</p>"),
        "https://lms.gist.ac.kr/mod/assign/view.php?id=1",
      ),
    ).toEqual({ kind: "assignment", signedIn: true, assignment: null });
  });
});
