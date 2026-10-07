# CSMS+ Extension

GIST LMS(Coursemos)의 사용자 경험을 향상시키는 Chrome/Edge 확장 프로그램입니다.

현재 개발 버전은 **2.1.3**입니다. 업데이트 내역은 확장 프로그램 설정의 패치 노트 탭 또는 [업데이트 로그](src/options/patch_notes.json)에서 확인할 수 있습니다.

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

### 2. PDF 다운로드 (PDF Downloader)
- **자동 감지**: LMS 내 문서 뷰어 페이지를 자동으로 감지합니다.
- **PDF 변환**: 이미지 기반의 교재를 PDF 파일로 변환하여 다운로드할 수 있습니다.
- **원클릭 다운로드**: 우측 하단 플로팅 버튼을 통해 손쉽게 저장할 수 있습니다.
  ![PDF 다운로드](demo/03_pdf-download.png)

## 설치 및 개발 방법

### 개발 환경 설정
[Vite+](https://viteplus.dev)(`vp`)와 pnpm으로 빌드합니다. Node.js 24 이상이 필요합니다.

```bash
git clone https://github.com/enc2586/csmsplus
cd csmsplus
pnpm install
```

### 개발 버전 로드

1. `pnpm build`로 `dist/`를 만듭니다. 코드를 고치는 동안에는 `pnpm dev`를 띄워 두면 바뀔 때마다 `dist/`가 다시 만들어집니다.
2. Chrome에서 `chrome://extensions`를 엽니다. Edge에서는 `edge://extensions`를 사용합니다.
3. 기존 설치 버전이 있으면 비활성화하고 **개발자 모드**를 켭니다.
4. **압축해제된 확장 프로그램을 로드합니다**를 눌러 `dist/` 폴더를 선택합니다.
5. LMS 페이지를 새로고침합니다.

### 검사

```bash
pnpm check   # 포맷, 린트, 타입 검사
pnpm test    # 단위 테스트 (Vitest)
pnpm e2e     # 빌드한 확장을 Chromium에 올려 가짜 LMS 페이지에서 기능을 검사
```

`pnpm e2e`는 LMS 요청을 `tests/e2e/lms-fixtures.ts`의 가짜 페이지로 바꿔 응답하므로 로그인이 필요 없습니다. 처음 실행하기 전에 `pnpm exec playwright install chromium`으로 브라우저를 받습니다.

화면 비교 기준 이미지는 `tests/e2e/snapshots/`에 있습니다. 화면을 의도적으로 바꿨다면 `pnpm build && pnpm exec playwright test --update-snapshots`로 기준 이미지를 다시 만들고, 바뀐 이미지를 직접 확인한 뒤 커밋합니다.

### 배포용 ZIP 생성

```bash
pnpm release
```

`release/csmsplus-v<버전>.zip`이 생성됩니다.

## 프로젝트 구조

```
/
├── assets/icons/                       # 확장 프로그램 아이콘
├── demo/                               # 기능 예시 이미지
├── src/
│   ├── background/index.ts             # 문서 이미지 다운로드 중계, 아이콘 클릭 시 설정 열기
│   ├── content/                        # LMS 페이지에 붙는 content script
│   │   ├── mount.tsx                   # Shadow DOM에 React 화면을 붙이는 공통 함수
│   │   ├── home/                       # LMS 메인: 강좌 카드별 과제 집계
│   │   ├── course-page/                # 강좌 페이지: 과제별 상태, 추적 제외, 과제 개요
│   │   ├── assignment-page/            # 과제 페이지: 방문 시 캐시 갱신
│   │   └── pdf-viewer/                 # 문서 뷰어: PDF 다운로드 버튼
│   ├── options/                        # 설정 페이지 (React)
│   │   └── patch-notes.json            # 업데이트 로그
│   ├── shared/                         # 화면과 무관한 공통 로직
│   │   ├── options.ts                  # 설정 기본값과 검증
│   │   └── assignment/                 # 상태 판정, 과제 페이지 파싱, 캐시, 추적 제외, 조회 큐
│   ├── ui/                             # 여러 화면이 함께 쓰는 컴포넌트와 cn()
│   └── styles/tailwind.css             # Tailwind 테마 (크기는 모두 px 기준)
├── tests/e2e/                          # 빌드한 확장을 가짜 LMS 페이지에서 검사
├── scripts/zip-release.ts              # 배포용 ZIP 생성
├── manifest.config.ts                  # 권한 및 페이지별 스크립트 등록
├── vite.config.ts                      # Vite+ 빌드·포맷·린트·테스트 설정
├── README.md
└── LICENSE
```

## 라이선스

[![License: CC BY-NC-SA 4.0](https://img.shields.io/badge/License-CC%20BY--NC--SA%204.0-lightgrey.svg)](https://creativecommons.org/licenses/by-nc-sa/4.0/)

이 프로젝트는 **Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International License**를 따릅니다.
비영리 목적으로만 사용 가능하며, 수정 배포 시 동일한 라이선스를 적용해야 합니다.
