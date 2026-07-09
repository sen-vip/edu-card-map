# 교육청 법카맵

서울교육 업무추진비 공개자료를 자동으로 가져와 지도와 목록으로 확인하는 웹앱입니다.

## v3.7.0 Vercel 백엔드 준비판

이번 버전은 GitHub Pages 정적 배포에서 빠졌던 `/api` 백엔드를 Vercel 배포 구조로 보완했습니다.

### 반영 내용

- `/api/sen-browser` 추가: 프론트의 자동 수집 버튼과 연결
- `/api/sen-find` 추가: 게시글 후보 찾기 버튼과 연결
- `/api/sen-auto` 정리: 직접 URL 불러오기와 공통 자동 다운로드 담당
- `lib/sen-scraper.js` 재사용: 열린교육 게시판 검색, 상세글 확인, 첨부파일 다운로드
- `vercel.json` 추가: Vercel Functions 실행 시간과 API 캐시 방지 설정
- `server.js` 추가: 로컬에서도 Vercel API와 비슷한 방식으로 테스트 가능
- `README.md`를 Vercel 배포 기준으로 정리

## 폴더 구조

```txt
edu-card-map/
├─ index.html
├─ style.css
├─ app.js
├─ lib/
│  └─ sen-scraper.js
├─ api/
│  ├─ sen-browser.js
│  ├─ sen-find.js
│  └─ sen-auto.js
├─ package.json
├─ vercel.json
└─ server.js
```


## v3.7.4

- Vercel 서버리스에서 Playwright 기본 브라우저 캐시를 찾다가 실패하던 문제를 보완했습니다.
- `@sparticuz/chromium`을 명시적으로 사용하고, 준비 실패 원인을 진단 로그에 짧게 남기도록 수정했습니다.
- 긴 오류 원문이 토스트에 통째로 떠서 화면을 덮는 문제를 수정했습니다.
- `package.json`의 Chromium/Playwright 버전을 고정했습니다.

Vercel 설정 권장값:

```txt
Application Preset: Other
Install Command: npm install
Build Command: None
Output Directory: N/A
```

## v3.7.2

- 기준월 기본값을 지난달로 고정했습니다.
- 이번 달부터 미래 월은 선택하지 못하도록 `type=month`의 `max`를 지난달로 제한했습니다.
- 공개사이트 바로가기 버튼을 결과/후보 영역의 1개 흐름으로 정리했습니다.
- GitHub Pages 주소에서 자동 수집을 누르면 백엔드가 없다는 안내를 먼저 보여줍니다. 자동 수집은 Vercel 배포 주소에서 사용해야 합니다.

## v3.7.1

- Vercel 서버리스 함수에서 브라우저 자동화로 열린교육 게시글 제목 클릭과 첨부 다운로드를 시도합니다.
- 단순 HTML 파싱으로 상세 URL이 안 잡히는 게시판 구조를 보완했습니다.
- Vercel Install Command는 `npm install`을 사용합니다.

## Vercel 배포

1. GitHub 저장소에 이 파일들을 업로드합니다.
2. Vercel에서 `Add New Project`를 누릅니다.
3. `edu-card-map` 저장소를 선택합니다.
4. Framework Preset은 `Other`로 두고 배포합니다.
5. 배포 주소가 나오면 Kakao Developers의 JavaScript 키 허용 도메인에 추가합니다.

예시:

```txt
https://edu-card-map.vercel.app
```

## 로컬 테스트

Node.js 18 이상에서 실행합니다.

```bash
npm install
npm run dev
```

브라우저에서 접속합니다.

```txt
http://localhost:3000
```

## Kakao 지도 키

Kakao JavaScript 키는 브라우저 `localStorage`에 저장됩니다. Vercel 배포 주소를 Kakao Developers의 허용 도메인에 등록해야 지도 표시가 정상 작동합니다.

## 주의

- 열린교육 게시판 구조가 바뀌면 자동 수집이 실패할 수 있습니다.
- GitHub Pages 주소에서는 자동 수집 API가 실행되지 않습니다. Vercel 배포 주소를 사용하세요.
- 자동 수집이 막히면 엑셀을 직접 내려받아 업로드할 수 있습니다.
- 위치는 Kakao 장소 검색 결과를 바탕으로 추정하므로 확인필요 항목은 원자료와 대조하세요.


## 3.7.3 수정

- 게시글 후보를 찾았지만 상세 URL이 HTML에 직접 노출되지 않는 경우, 즉시 실패하지 않고 Vercel 브라우저 방식으로 실제 제목 클릭과 첨부 다운로드를 재시도합니다.
- 열린서울교육 게시판처럼 제목 링크가 일반 href로 노출되지 않는 CMS 구조를 보완했습니다.


## v3.7.6 업데이트

- 열린교육 게시글 제목 클릭 시 발생하는 네트워크 요청/응답을 기록합니다.
- URL이 `view0010v.do`까지만 보이고 게시글 번호가 숨겨지는 경우를 대비해, POST payload와 응답 HTML을 검사합니다.
- 실제 상세 HTML에 선택한 제목이 포함되어 있는지 검증한 뒤 첨부파일 탐지를 시작합니다.
- 실패 시 `목록 행 확인`, `클릭 대상 속성`, `네트워크 중요 기록`, `상세 HTML 후보` 로그를 남겨 원인 진단이 가능하도록 했습니다.
