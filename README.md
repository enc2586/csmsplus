# CSMS+ Extension

GIST LMS(Coursemos)의 사용자 경험을 향상시키는 Chrome/Edge 확장 프로그램입니다.

현재 개발 버전은 **2.2.0**입니다. 업데이트 내역은 확장 프로그램 설정의 패치 노트 탭 또는 [업데이트 로그](src/options/patch-notes.json)에서 확인할 수 있습니다.

## 설치
- [Chrome Web Store](https://chromewebstore.google.com/detail/oekalaanipfieieiibilhfjcoebfaabc)에서 다운로드
- 혹은 우측 [Releases](https://github.com/enc2586/csmsplus/releases)에서 다운로드

## 주요 기능

### 1. 과제 통계 및 대시보드 (Assignment Tracker)
- **LMS 메인 페이지**: 각 강의의 과제를 완료, 마감 임박, 마감 지남, 남음으로 구분해 표시합니다.
- **강의 페이지**: 상단 대시보드에서 완료, 마감 임박, 마감 지남, 남음 과제를 구분하고 임박·마감 지남 목록을 따로 확인할 수 있습니다.
- **추적 제외**: 주차 목록에서는 과제명 오른쪽, 강의 개요에서는 과제명 아래의 버튼으로 집계와 요약 목록에서 제외하거나 다시 추적할 수 있습니다. 제외한 과제에는 회색 칩을 표시합니다. 상세 정보 표시를 꺼도 버튼과 제외 칩은 유지됩니다.
- **선택 유지**: 제외 선택은 해당 브라우저 프로필에 저장되며 새로고침, 브라우저 재시작, 캐시 삭제 후에도 유지됩니다. 다른 기기에 동기화되지 않으며, 제외한 과제의 정보 조회는 계속됩니다.
- **과제 상태 표시**: 개별 과제와 요약 화면 모두 설정한 마감 임박 기준을 사용합니다. 온라인 제출이 필요 없는 과제는 기한이 지나면 기존처럼 완료로 처리합니다.

- **전체 과제 목록**: LMS 메인 페이지 강좌 목록 아래에 모든 강좌의 과제를 마감 순서대로 모아 보여 줍니다. 완료한 과제와 추적 제외한 과제는 접어 둡니다.
- **새 활동 표시**: 강좌 페이지를 마지막으로 연 뒤 새로 올라온 활동에 NEW를 붙이고, 메인 페이지 카드에 개수를 표시합니다.

### 2. 툴바 팝업과 알림
- **백그라운드 동기화**: LMS 페이지를 열지 않아도 30분마다(설정에서 변경) 모든 강좌의 과제를 받아 옵니다. 로그인이 만료되면 알려 줍니다.
- **툴바 팝업**: 확장 프로그램 아이콘을 누르면 다가오는 마감 목록을 보여 주고, 바로 새로고침할 수 있습니다. 아이콘 배지에 마감 임박 과제 수를 표시합니다.
- **마감 알림**: 설정에서 켜면 마감 24시간 전과 3시간 전(변경 가능)에 데스크톱 알림을 보냅니다. 알림 권한은 켤 때만 요청합니다.
- **Todoist 연동**: 개인 API 토큰을 넣으면 제출하지 않은 과제를 Todoist 태스크로 만듭니다. LMS 마감 전날을 Todoist deadline으로 넣고, 원래 마감 시각은 설명에 적습니다. 제출하면 태스크를 완료 처리합니다.

### 3. 화면
- **LMS 다크 모드**: 설정에서 켬, 끔, 시스템 설정 따름을 고를 수 있습니다. [Dark Reader](https://github.com/darkreader/darkreader) 엔진을 사용합니다.

### 4. PDF 다운로드 (PDF Downloader)
- **자동 감지**: LMS 내 문서 뷰어 페이지를 자동으로 감지합니다.
- **PDF 변환**: 이미지 기반의 교재를 PDF 파일로 변환하여 다운로드할 수 있습니다.
- **원클릭 다운로드**: 우측 하단 플로팅 버튼을 통해 손쉽게 저장할 수 있습니다.
  ![PDF 다운로드](demo/03_pdf-download.png)

## 설치 및 개발 방법

### 개발 환경 설정
[Vite+](https://viteplus.dev)(`vp`)로 빌드하고 패키지는 [Bun](https://bun.sh)으로 설치합니다. Node.js와 Bun 버전은 [mise](https://mise.jdx.dev)가 `mise.toml`에 맞춰 관리하므로 따로 전역 설치할 필요가 없습니다. `vp`도 프로젝트 의존성에 들어 있습니다.

```bash
git clone https://github.com/enc2586/csmsplus
cd csmsplus
mise install
bun install
```

### 개발 버전 로드

1. `bun run build`로 `dist/`를 만듭니다. 코드를 고치는 동안에는 `bun run dev`를 띄워 두면 바뀔 때마다 `dist/`가 다시 만들어집니다.
2. Chrome에서 `chrome://extensions`를 엽니다. Edge에서는 `edge://extensions`를 사용합니다.
3. 기존 설치 버전이 있으면 비활성화하고 **개발자 모드**를 켭니다.
4. **압축해제된 확장 프로그램을 로드합니다**를 눌러 `dist/` 폴더를 선택합니다.
5. LMS 페이지를 새로고침합니다.

### 검사

```bash
bun run check   # 포맷, 린트, 타입 검사
bun run test    # 단위 테스트 (Vitest)
bun run e2e     # 빌드한 확장을 Chromium에 올려 가짜 LMS 페이지에서 기능을 검사
```

`bun run e2e`는 LMS 요청을 `tests/e2e/lms-fixtures.ts`의 가짜 페이지로 바꿔 응답하므로 로그인이 필요 없습니다. 처음 실행하기 전에 `bunx playwright install chromium`으로 브라우저를 받습니다.

화면 비교 기준 이미지는 `tests/e2e/snapshots/`에 있습니다. 화면을 의도적으로 바꿨다면 `bun run build && bunx playwright test --update-snapshots`로 기준 이미지를 다시 만들고, 바뀐 이미지를 직접 확인한 뒤 커밋합니다.

### 배포용 ZIP 생성

```bash
bun run release
```

`release/csmsplus-v<버전>.zip`이 생성됩니다.

### UI 컴포넌트

화면은 [shadcn/ui](https://ui.shadcn.com) 컴포넌트와 Tailwind CSS로 만듭니다. 새 컴포넌트는 `bunx shadcn@latest add <이름>`으로 추가하면 `src/ui/shadcn/`에 들어갑니다. LMS 페이지 안의 화면은 Shadow DOM에 그려지므로, 바깥으로 팝오버를 띄우는 컴포넌트(Select, Tooltip 등)는 설정 페이지와 팝업에서만 씁니다.

`className`에 바로 쓰지 않는 클래스 문자열은 항상 `cn(...)`으로 감쌉니다. 그래야 Tailwind IntelliSense와 클래스 정렬이 적용됩니다.

## 프로젝트 구조

```
/
├── assets/icons/                       # 확장 프로그램 아이콘
├── demo/                               # 기능 예시 이미지
├── src/
│   ├── background/                     # 서비스 워커: 동기화 알람, 배지, 알림, Todoist, 이미지 다운로드 중계
│   ├── offscreen/                      # 서비스 워커 대신 HTML을 파싱하는 offscreen 문서
│   ├── content/                        # LMS 페이지에 붙는 content script
│   │   ├── mount.tsx                   # Shadow DOM에 React 화면을 붙이는 공통 함수
│   │   ├── home/                       # LMS 메인: 강좌 카드별 집계, 전체 과제 목록
│   │   ├── course-page/                # 강좌 페이지: 과제별 상태, 추적 제외, 과제 개요, NEW 표시
│   │   ├── assignment-page/            # 과제 페이지: 방문 시 캐시 갱신
│   │   ├── lms-theme/                  # LMS 다크 모드
│   │   └── pdf-viewer/                 # 문서 뷰어: PDF 다운로드 버튼
│   ├── popup/                          # 툴바 팝업
│   ├── options/                        # 설정 페이지
│   │   └── patch-notes.json            # 업데이트 로그
│   ├── shared/                         # 화면과 무관한 공통 로직
│   │   ├── options.ts                  # 설정 기본값과 검증
│   │   ├── assignment/                 # 상태 판정, 과제 페이지 파싱, 캐시, 추적 제외, 알림 시점
│   │   ├── sync/                       # 강좌·과제 페이지 파싱과 동기화
│   │   └── todoist/                    # Todoist 클라이언트와 동기화 규칙
│   ├── ui/                             # 여러 화면이 함께 쓰는 컴포넌트와 cn()
│   │   └── shadcn/                     # shadcn/ui 컴포넌트
│   └── styles/tailwind.css             # Tailwind 테마 (기본 이름, 값은 px)
├── tests/e2e/                          # 빌드한 확장을 가짜 LMS 페이지에서 검사
├── scripts/zip-release.ts              # 배포용 ZIP 생성
├── components.json                     # shadcn/ui 설정
├── manifest.config.ts                  # 권한 및 페이지별 스크립트 등록
├── mise.toml                           # Node.js, Bun 버전
├── vite.config.ts                      # Vite+ 빌드·포맷·린트·테스트 설정
├── README.md
└── LICENSE
```

## 라이선스

[![License: CC BY-NC-SA 4.0](https://img.shields.io/badge/License-CC%20BY--NC--SA%204.0-lightgrey.svg)](https://creativecommons.org/licenses/by-nc-sa/4.0/)

이 프로젝트는 **Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International License**를 따릅니다.
비영리 목적으로만 사용 가능하며, 수정 배포 시 동일한 라이선스를 적용해야 합니다.
