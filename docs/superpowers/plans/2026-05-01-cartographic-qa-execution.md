# Cartographic QA Execution Plan — 2026-05-01

> **For agentic workers:** This plan is executed inline in the current session via `superpowers:executing-plans`. Tasks are bundles of QA cases run with Playwright MCP against production. Steps use checkbox (`- [ ]`) syntax.

**Goal:** 5묶음 + 태블릿 패스를 Playwright MCP로 실행하여 cartographic.agency의 회귀를 자동 검출하고, 결과를 회차별 마크다운에 누적한다.

**Architecture:** Playwright MCP 단일 브라우저 컨텍스트로 묶음별 순차 실행. 각 묶음 시작 시 토큰 헬스체크 + 안전 가드 적용. 자동 판정 15종 + viewport별 8장 캡처. 결과는 `docs/qa-runs/2026-05-01-cartographic-qa-run.md`에 묶음별 append.

**Tech Stack:** Playwright MCP (`mcp__playwright__*`), Firebase JS SDK (브라우저 console에서 firestore deny 검증), html2canvas download trigger, Toss 결제 위젯 iframe.

**Spec 출처:** `docs/superpowers/specs/2026-05-01-cartographic-qa-design.md` — 묶음별 항목 / assertion 카탈로그 / 안전 가드는 spec 참조.

**진행 흐름 (사용자 지시):**
- 묶음 1: 즉시 실행 (비로그인)
- 묶음 2 시작 시점에 사용자에게 OAuth 요청 → `dummyUid` 캡처
- 묶음 종료마다 1줄 보고 + "다음 묶음 진행 OK?" 짧은 게이트
- Fail 발견 시 즉시 보고 + 캡처 + 묶음 계속 진행 (중단 X)

---

## File Structure

| 파일 | 역할 |
|---|---|
| `docs/qa-runs/2026-05-01-cartographic-qa-run.md` | 결과 누적 (묶음별 append) |
| `docs/qa-runs/2026-05-01/screenshots/<bundle>-<caseId>-<viewport>.png` | 핵심 + Fail 캡처 |

---

## Task 0: Setup (결과 파일 초기화 + 브라우저 컨텍스트)

**Files:**
- Create: `docs/qa-runs/2026-05-01-cartographic-qa-run.md`

- [ ] **Step 0.1: 결과 파일 헤더 작성**

내용:
```markdown
# Cartographic QA Run — 2026-05-01

## 환경
- target: https://cartographic.agency
- 더미 계정: <마스킹> (묶음 2에서 캡처)
- 시작: 2026-05-01 HH:MM KST
- 실행 도구: Playwright MCP
- 가드: 타 계정 / deleteAccount / 쿠폰 ≤5회 / 공유 토글 강제 OFF / Toss 결제 진입까지만

## 누적 카운터
- console.error: 0
- CSP 위반: 0
- network 4xx/5xx (의도 401 제외): 0
- Sentry 이벤트 (sentry.io 호출): 0
- 시드 cleanup 실패: 0회
- 쿠폰 시도: 0/5
```

- [ ] **Step 0.2: Playwright 브라우저 초기화 + console/network 리스너 등록**

도구: `mcp__playwright__browser_navigate` (about:blank으로 컨텍스트 시작), 이후 `mcp__playwright__browser_console_messages`로 누적 console 추적. `mcp__playwright__browser_network_requests`로 4xx/5xx 추적.

- [ ] **Step 0.3: 묶음 1 실행 진입 보고**

콘솔 1줄: "묶음 1 시작 — 비로그인 영역 (인증 불필요)"

---

## Task 1: 묶음 1 — 비로그인 영역

**대상:** 랜딩 / `/legal` / `/pricing` / `/shared/<공개 sample id>` / `/login` (PIPA 동의 체크박스)

**Viewport 순서:** mobile(375×812) → desktop(1280×800)

- [ ] **Step 1.1: 랜딩 페이지 로드 (mobile)**

도구: `browser_resize` 375×812 → `browser_navigate` https://cartographic.agency/

검증:
- ASSERT_NO_OVERFLOW: `browser_evaluate` `() => document.documentElement.scrollWidth - document.documentElement.clientWidth`
- ASSERT_NO_CONSOLE_ERROR: `browser_console_messages` 결과에서 type=error 0건
- ASSERT_NO_NETWORK_ERROR: `browser_network_requests` 4xx/5xx 0건
- ASSERT_TEXT_PRESENT: 랜딩 헤드라인 노출

캡처: `B1-01-mobile.png` (핵심 캡처)

- [ ] **Step 1.2: 랜딩 페이지 로드 (desktop)**

도구: `browser_resize` 1280×800 → `browser_navigate` /

검증: 동일. 캡처: `B1-01-desktop.png`

- [ ] **Step 1.3: /legal 처리방침 PIPA 신규 조항 (mobile + desktop)**

도구: `browser_navigate` /legal

검증:
- ASSERT_TEXT_PRESENT: "접속기록", "1년" (제2조)
- ASSERT_TEXT_PRESENT: "안전성 확보", "관리적", "기술적", "물리적" (제8조 4분류)
- ASSERT_TEXT_PRESENT: "유출", "통지", "72시간" 또는 "지체 없이" (제8조의2)
- ASSERT_NO_OVERFLOW

캡처: `B1-03-mobile.png`, `B1-03-desktop.png` (PIPA 신규 조항 시각 증거)

- [ ] **Step 1.4: /pricing 비로그인 진입 (mobile + desktop)**

도구: `browser_navigate` /pricing

검증:
- ASSERT_TEXT_PRESENT: "30일 무료" 배지 (`hasUsedTrial` 미보유 신규로 인식되면)
- ASSERT_NO_OVERFLOW (모바일 가격 카드)
- ASSERT_NO_CONSOLE_ERROR

캡처: `B1-04-mobile.png`, `B1-04-desktop.png`

- [ ] **Step 1.5: /login PIPA 가입 동의 체크박스 (mobile + desktop)**

도구: `browser_navigate` /login

검증:
- 미체크 상태에서 "Google로 시작하기" 버튼 disabled (`disabled` attr 또는 aria-disabled)
- 체크 후 enabled
- ASSERT_NO_OVERFLOW

캡처: `B1-05-mobile.png` (체크박스 UI 증거)

⚠ Google 로그인 버튼은 클릭하지 않음. 묶음 2 시작 시점에 사용자가 직접 OAuth 통과.

- [ ] **Step 1.6: /shared/<공개 sample id> read-only 진입**

⚠ 공개 sample id는 사용자에게 묻거나 skip. 사용자가 제공한 경우만 진행. 제공 없으면 결과에 "skipped — no sample share id" 기록.

검증:
- ASSERT_TEXT_PRESENT: 프로젝트 데이터 노출 (캐릭터 카드 등) 또는 "공유되지 않은 프로젝트"
- ASSERT_NO_OVERFLOW

- [ ] **Step 1.7: 묶음 1 cleanup + 1줄 보고**

cleanup: 비로그인이라 시드 데이터 없음. shareEnabled 토글 안 함.

결과 파일에 묶음 1 섹션 append:
```markdown
## 묶음 1: 비로그인 영역
| caseId | feature | viewport | result | evidence | notes |
| ... |

### 묶음 1 요약
- console.error: N건
- CSP 위반: N건
- 4xx/5xx: N건 (의도 401 제외)
```

사용자 보고: "묶음 1 완료. console.error N건, CSP 위반 N건. 다음 묶음(인증)으로 진행 OK?"

---

## Task 2: 묶음 2 — 인증 + 대시보드 + 프로젝트 CRUD

⚠ **사용자 OAuth 게이트:** 묶음 시작 시 사용자에게 더미 Google 계정으로 직접 로그인 요청. 통과 후 `dummyUid` 캡처.

- [ ] **Step 2.1: 사용자에게 OAuth 요청 + 통과 대기**

사용자 메시지: "더미 Google 계정 만드시고 https://cartographic.agency/login 에서 직접 로그인해 주세요. ConsentModal/OnboardingModal까지 통과 후 'OK' 답해주세요."

대기. 사용자 OK 응답 시 다음 단계.

- [ ] **Step 2.2: dummyUid 캡처 + 베이스라인 빌링 상태 기록**

도구: `browser_evaluate` 다음 코드 실행:
```javascript
() => {
  const auth = window.firebase?.auth?.() || (typeof firebase !== 'undefined' ? firebase.auth() : null);
  // Firebase 9 modular SDK이라면 다른 방식 필요. 우선 indexedDB의 firebaseLocalStorageDb에서 조회
  return new Promise((resolve) => {
    const req = indexedDB.open('firebaseLocalStorageDb');
    req.onsuccess = () => {
      const db = req.result;
      const tx = db.transaction('firebaseLocalStorage', 'readonly');
      const store = tx.objectStore('firebaseLocalStorage');
      const all = store.getAll();
      all.onsuccess = () => {
        const user = all.result.find(x => x.fbase_key.includes('authUser'));
        resolve(user?.value?.uid || null);
      };
    };
    req.onerror = () => resolve(null);
  });
}
```

`dummyUid`를 메모. 결과 파일에 마스킹된 형태로 기록 (앞 4자 + "..."  + 뒤 2자).

베이스라인 빌링: Settings 진입해서 "무료 체험 중 (X일 남음)" 텍스트 캡처.

- [ ] **Step 2.3: ConsentModal 회귀 검증 (이미 통과했으면 재로그인 안 함, 화면에 안 뜨는 것 확인)**

검증: `browser_evaluate` `() => !!document.querySelector('[data-consent-modal]') || document.body.textContent.includes('이용약관')` 결과가 false (이미 동의했으므로)

- [ ] **Step 2.4: 대시보드 빈상태 / "첫 작품 시작" 화면 (mobile + desktop)**

⚠ 더미 계정이 신규라 프로젝트 0개 가정. 이미 프로젝트가 있으면 빈상태 검증 skip + 노트 기록.

캡처: `B2-04-mobile.png`, `B2-04-desktop.png`

- [ ] **Step 2.5: 프로젝트 생성 (mobile + desktop)**

도구: `browser_click` "+ 새 작품" → 이름 입력 (예: "QA-시드-2026-05-01-001") → 만들기

검증:
- ASSERT_URL_MATCH `/project/<id>`
- 생성된 projectId 메모 → 시드 카운터에 추가

cleanup 대상: 묶음 종료 시 이 프로젝트 삭제.

- [ ] **Step 2.6: 프로젝트 카드 점3개 메뉴 (수정/삭제/외부 클릭으로 닫힘)**

도구: 대시보드 복귀 → 점3개 클릭 → 외부 영역 클릭 → 메뉴 닫힘 검증

캡처: `B2-06-desktop.png`

- [ ] **Step 2.7: `/project/__invalid__` negative path (NEW-NEG-01)**

도구: `browser_navigate` /project/__invalid__

검증:
- ASSERT_NO_CONSOLE_ERROR (특히 throw 0건)
- ASSERT_TEXT_PRESENT: "프로젝트를 찾을 수 없음" 또는 "Not Found" 또는 정상 에러 메시지
- 화면이 깨지지 않음 (`document.body.children.length > 0`)

캡처: `B2-07-desktop.png` (negative path 시각 증거)

- [ ] **Step 2.8: 공유 모드 양방향 검증 (NEW-SHARE-01)**

⚠ **강제 cleanup**: 끝나면 shareEnabled OFF.

순서:
1. 시드 프로젝트로 진입 → 헤더 "공유" 버튼
2. shareEnabled 토글 ON
3. 공유 URL 복사 (`navigator.clipboard.readText` 또는 input value)
4. **새 incognito 컨텍스트로 URL 접근:**
   - 도구: `browser_tabs` 새 탭 → `browser_navigate` 공유 URL
   - 또는 별도 컨텍스트가 어려우면 같은 컨텍스트에서 logged-out 시뮬레이션 어려우므로, **shareEnabled ON 상태에서 익스큐트 컨텍스트 분리는 spec 참조** — 본 실행에서는 owner의 다른 탭에서 공유 URL 열기로 갈음 + shareEnabled OFF 후 동일 URL 접근 시 "공유되지 않은 프로젝트" 노출 검증

5. **shareEnabled 강제 OFF** — 누락 시 abort

검증:
- ON 상태: ASSERT_TEXT_PRESENT 프로젝트 데이터
- OFF 상태: ASSERT_TEXT_PRESENT "공유되지 않은 프로젝트"
- post-cleanup: shareEnabled === false

캡처: `B2-08-on-desktop.png`, `B2-08-off-desktop.png`

- [ ] **Step 2.9: 통합 검색**

도구: 헤더 돋보기 클릭 → 검색어 입력 → 결과 확인 → ESC

검증: ASSERT_TEXT_PRESENT 결과, ESC로 닫힘

- [ ] **Step 2.10: 묶음 2 cleanup**

- 시드 프로젝트는 묶음 3·4가 사용할 예정 → **유지**
- shareEnabled 강제 false 재확인
- 빌링 상태 변경 없음 확인 (ASSERT_BILLING_INTACT)
- 결과 파일 묶음 2 섹션 append + 누적 카운터 갱신
- 사용자 보고: "묶음 2 완료. console.error N건. 시드 프로젝트 1개 유지(묶음 3·4 사용). shareEnabled 복구 OK. 다음 묶음(캐릭터·관계도) 진행 OK?"

---

## Task 3: 묶음 3 — 캐릭터·관계도

**핵심 회귀:** 캐릭터 상세 5개 input 포커스 유지(7e5d6b27), 캐릭터 카드 1탭(e16acd36), 위치이동 후 순서 복귀(59cc4889), 모바일 ⇌ 받는사람(a2d3c098), html2canvas PNG 다운로드.

- [ ] **Step 3.1: 토큰 헬스체크**

`/dashboard` 진입 → 사용자 이메일 표시 확인. 토큰 만료 시 사용자에게 재인증 요청.

- [ ] **Step 3.2: 캐릭터 추가 모달 (mobile + desktop)**

도구: 시드 프로젝트 진입 → "+ 캐릭터" → 모달 표시 → 이름 "QA-Char-A" → 추가

검증: ASSERT_NO_OVERFLOW(모달), ASSERT_NO_CONSOLE_ERROR

캡처: `B3-02-mobile.png` (모달 width)

- [ ] **Step 3.3: 캐릭터 상세 5개 input 포커스 유지 (회귀 핵심, 7e5d6b27)**

⚠ 가장 중요한 회귀 검증.

각 input(이름/역할/나이/소속/능력)에 대해:
1. 카드 클릭 → 상세 슬라이드 인
2. input 클릭
3. 'A' 1글자 입력 (`browser_type` 1회)
4. ASSERT_FOCUS_RETAINED: `browser_evaluate` `() => document.activeElement.tagName === 'INPUT' && document.activeElement.value.endsWith('A')`
5. 추가 4글자 'BCDE' 입력
6. 다시 ASSERT_FOCUS_RETAINED
7. 저장 후 토스트 "✓ 저장됨"

5개 input × 2 viewport = 10 케이스. mobile 먼저, desktop 다음.

캡처: `B3-03-mobile.png` (포커스 유지 시각 증거 — 입력 중 input 외곽선)

- [ ] **Step 3.4: 캐릭터 사진 업로드/위치/삭제**

⚠ Storage rules 5MB 제한 검증은 4MB 더미 이미지 + 6MB 더미 이미지로. 파일 업로드 시 `mcp__playwright__browser_file_upload` 사용.

검증: 업로드 후 photoURL 갱신, 위치 3개 버튼 동작, 삭제 시 photoURL ''

cleanup: 업로드한 사진은 캐릭터 삭제 시 함께 삭제 (Step 3.13).

- [ ] **Step 3.5: 캐릭터 카드 호버/탭 동작 (mobile은 1탭으로 상세 열림 회귀)**

mobile: 카드 1탭 → 상세 즉시 열림 (e16acd36 회귀)
desktop: 호버 → 빨간 삭제 버튼 표시

- [ ] **Step 3.6: 긴 텍스트 ellipsis ("Captain Steel of the Northern Galaxy Kingdom")**

캐릭터 이름·역할에 매우 긴 텍스트 입력 → 카드에서 `...` 처리 시각 캡처.

캡처: `B3-06-mobile.png`, `B3-06-desktop.png`

- [ ] **Step 3.7: 위치이동 (드래그 순서 변경) — 59cc4889 회귀**

순서:
1. 캐릭터 3명 이상 보장 (없으면 추가)
2. "⠿ 위치 수정" 진입
3. 첫 번째 카드를 마지막 위치로 드래그
4. "위치 수정" 종료
5. 새로고침
6. ASSERT: 새 순서 유지 (원래 순서로 복귀하지 않음)

- [ ] **Step 3.8: 관계도 — 캐릭터 위치 드래그 / 줌**

캔버스에서 드래그 → position 갱신. +/-/↺ 버튼 동작.

- [ ] **Step 3.9: 관계 연결 (시작→대상→모달)**

도구: "관계 연결" → 시작 캐릭터 → 대상 캐릭터 → 모달 → 라벨 + 색상 → 저장

검증: ASSERT_NO_OVERFLOW (모달), 라벨 한글 박스 텍스트 안 잘림

- [ ] **Step 3.10: 모바일 ⇌ 받는 사람 클릭 (a2d3c098 회귀)**

mobile viewport에서 "관계 연결" → 시작 캐릭터 → ⇌ 버튼 → 받는 사람 변경 가능 검증.

캡처: `B3-10-mobile.png`

- [ ] **Step 3.11: 관계 라벨 한글 박스 ("절친한 친구")**

검증: ASSERT_NO_OVERFLOW (라벨 박스 width >= 텍스트 width)

- [ ] **Step 3.12: ShareModal html2canvas PNG 다운로드 (NEW-CAP-01)**

도구:
1. 헤더 "공유" → 모달 열림
2. "현재 화면 이미지로 저장" 클릭
3. `browser_network_requests` 또는 download event 검증
   - Playwright MCP에 `browser_handle_dialog` / 별도 download 캡처 도구 사용. 없으면 click 후 콘솔에 다운로드 트리거 흔적 확인 (`a` 태그 download attr 또는 blob: URL 생성)

검증: ASSERT_DOWNLOAD (PNG mime 또는 .png suffix)

⚠ ShareModal 열렸으면 닫고 shareEnabled 상태 변경 안 됐는지 확인 (이미지 저장은 shareEnabled 토글 안 함).

캡처: `B3-12-desktop.png`

- [ ] **Step 3.13: 캐릭터 삭제 → cascade**

순서:
1. 시드 캐릭터 1명 선택 (관계 1개 이상, 복선 charIds 1개 이상 연결된 상태)
2. 상세 → "삭제" → "정말 삭제"
3. 검증: 카드 사라짐, 관련 relations 사라짐, foreshadows.charIds에서 제거됨 (Firestore 직접 read)

cleanup: 묶음 종료 시 나머지 시드 캐릭터·관계 일괄 삭제.

- [ ] **Step 3.14: 묶음 3 cleanup + 1줄 보고**

- 묶음 3에서 만든 캐릭터·관계·사진 일괄 삭제 (cascade로 어느 정도 자동 + 잔여 수동)
- 시드 프로젝트는 묶음 4가 사용 → 유지
- 빌링 상태 검증
- 결과 파일 append
- 사용자 보고: "묶음 3 완료. console.error N건. 시드 캐릭터 N명 정리됨. 다음 묶음(복선·타임라인·세계관·링크) 진행 OK?"

---

## Task 4: 묶음 4 — 복선·타임라인·세계관·링크

**핵심 회귀:** 타임라인 화수 제한+양방향(b1922e10), 설정집 unsaved 모달+탭 가드(dc5f349a), 복선 회차 숫자(b11a91c2), 복선 모바일 overflow(a0176894/f573aa26).

- [ ] **Step 4.1: 토큰 헬스체크 + 시드 프로젝트 진입**

- [ ] **Step 4.2: 복선 추가 / 회수 토글 (mobile + desktop)**

도구: 복선 탭 → "+ 복선 추가" → 제목 + 회수 토글 + 캐릭터 연결 → 추가 → 회수 토글 → 자동 분류

검증: 회수 후 "회수 완료" 섹션으로 이동

캡처: `B4-02-mobile.png` (모바일 카드 — overflow 회귀 핵심)

- [ ] **Step 4.3: 복선 언급 회차 숫자만 허용 (b11a91c2 회귀)**

도구: 복선 추가 모달에서 회차 input에 "abc" 입력 → 거절. "1" 입력 → 허용. 0 또는 음수 → 거절(또는 1로 보정).

검증: ASSERT_TEXT_ABSENT 알파벳, ASSERT input.value match `/^\d+$/`

- [ ] **Step 4.4: 복선 모바일 카드 overflow (a0176894 / f573aa26 회귀)**

⚠ 회귀 의심도 최상.

mobile viewport에서:
- 복선 카드의 `scrollWidth - clientWidth` ≤ 0
- 복선 언급 회차 입력 row의 `scrollWidth - clientWidth` ≤ 0

캡처: `B4-04-mobile.png`

- [ ] **Step 4.5: 타임라인 이벤트 추가 (화수 1~999 제한, b1922e10)**

도구: 타임라인 탭 → "+ 타임라인 추가" → 화수 input에 1000 입력 → 거절 또는 999로 보정. 999 입력 → 통과.

- [ ] **Step 4.6: 타임라인 ↔ DetailPanel 등장화수 양방향 (b1922e10)**

순서:
1. 타임라인 이벤트에 캐릭터 A 추가
2. 캐릭터 A의 DetailPanel '등장 화수'에 해당 화수 자동 표시 검증
3. DetailPanel에서 화수 직접 추가
4. 타임라인 이벤트의 등장인물 칩에 캐릭터 자동 반영 검증

- [ ] **Step 4.7: 타임라인 펼치기/접기/정렬/ellipsis**

긴 제목 입력 → ellipsis 시각 검증.

- [ ] **Step 4.8: 세계관 문서 추가 + 미저장 표시**

도구: 세계관 탭 → "+ 새 문서" → 제목/내용 입력 → "저장되지 않은 변경사항" 표시 검증

- [ ] **Step 4.9: 세계관 unsaved 상태 ← 목록 클릭 시 경고 모달 (dc5f349a)**

도구: unsaved 상태에서 "← 목록" 클릭 → 경고 모달 표시 → "취소" 시 그대로, "나가기" 시 변경사항 손실 + 목록으로

- [ ] **Step 4.10: 세계관 탭 이동 가드 (dc5f349a)**

도구: unsaved 상태에서 다른 탭(캐릭터/타임라인 등) 클릭 → 모달 표시

- [ ] **Step 4.11: 링크 추가 / 외부 새탭 / 작가명 ellipsis**

긴 작가명 입력 → maxWidth 120px ellipsis 시각 검증

- [ ] **Step 4.12: 무료 한도 모달 (E2 addNew null guard)**

신규 trial이라 한도 안 걸릴 수 있음 → trial은 Pro 권한이라 한도 무시. **검증 skip + 노트 기록**: "더미 계정 trial 상태에서는 무료 한도 모달 검증 불가. 다음 라운드 Free 계정으로 분리 검증 필요."

- [ ] **Step 4.13: 묶음 4 cleanup + 1줄 보고**

- 만든 복선·타임라인·세계관·링크 일괄 삭제
- 시드 프로젝트는 묶음 5가 사용할 수도 있으니 유지 (묶음 5는 결제 + 보안이라 별도 사용 안 함 → 묶음 5 종료 시 함께 삭제)
- 결과 파일 append
- 사용자 보고: "묶음 4 완료. console.error N건. 다음 묶음(보안+결제+쿠폰) 진행 OK?"

---

## Task 5: 묶음 5 — 보안 헤더 + Toss 진입 + 쿠폰 rate limit

- [ ] **Step 5.1: 토큰 헬스체크**

- [ ] **Step 5.2: 보안 응답 헤더 검증 (mobile + desktop)**

도구: `browser_navigate` / → `browser_network_requests` → 메인 응답 headers:
- `content-security-policy`: 존재 + `frame-src` 에 `*.tosspayments.com` 포함 (e5e953ca)
- `x-frame-options`: 존재
- `x-content-type-options`: `nosniff`
- `strict-transport-security`: 존재

ASSERT_RESPONSE_HEADER 풀.

- [ ] **Step 5.3: Toss 결제 위젯 진입**

⚠ 더미 계정이 trial 중이라 직접 결제 흐름 진입 어려움. /pricing 진입 → "Pro 결제" 또는 다른 경로로 위젯 iframe 로드까지만.

검증:
- iframe src `*.tosspayments.com`
- ASSERT_NO_CSP_VIOLATION
- ASSERT_NO_NETWORK_ERROR (Toss 도메인 외 4xx/5xx 없음)

⚠ "결제하기" 버튼 클릭 금지. 모달/위젯 로드 후 닫기.

캡처: `B5-03-desktop.png` (Toss 위젯 진입 시각 증거)

- [ ] **Step 5.4: 쿠폰 잘못된 코드 5회 → rate limit (0651e50d)**

⚠ 카운터 ≥5 시 추가 시도 금지.

순서: Settings → 쿠폰 입력란
1회: "INVALID-001" → 에러
2회: "INVALID-002" → 에러
3회: "INVALID-003" → 에러
4회: "INVALID-004" → 에러
5회: "INVALID-005" → "1시간 후 다시 시도" rate limit 메시지

검증: ASSERT_TEXT_PRESENT "1시간" 또는 "rate limit" 또는 "잠시 후"

캡처: `B5-04-desktop.png` (rate limit 메시지)

- [ ] **Step 5.5: `_system/coupon_attempts_<dummyUid>` 클라이언트 read 차단 (NEW-NEG-02)**

도구: `browser_evaluate` 다음 코드:
```javascript
async () => {
  try {
    const { getFirestore, doc, getDoc } = await import('firebase/firestore');
    const db = getFirestore();
    await getDoc(doc(db, '_system', `coupon_attempts_${'<dummyUid>'}`));
    return 'NO_DENY';  // FAIL
  } catch (e) {
    return e.code;  // 기대: 'permission-denied' → PASS
  }
}
```

⚠ Firebase modular SDK 동적 import가 production 번들에서 막혀있을 수 있음. 그 경우 `window.firebase` 또는 React 내부 `useFirestore`를 통한 우회. 우회 못 하면 노트: "_system 차단 검증은 firebase SDK 직접 호출 어려움 — Firestore 콘솔에서 보안 룰 코드 리뷰로 갈음"

- [ ] **Step 5.6: Sentry 이벤트 누적 0건 검증**

도구: `browser_network_requests` → `*sentry.io*` 또는 sentry 트랜잭션 호출 0건. 1건 이상이면 페이로드 일부 캡처해 결과에 기록.

- [ ] **Step 5.7: 묶음 5 cleanup + 1줄 보고**

- 시드 프로젝트(묶음 2~4 공용) 삭제 (cascade로 캐릭터/관계/복선/타임라인/세계관/링크 정리됨)
- 빌링 상태 변경 없음 검증 (ASSERT_BILLING_INTACT)
- 결과 파일 append
- 사용자 보고: "묶음 5 완료. console.error N건. 시드 프로젝트 정리됨. 다음 패스(태블릿) 진행 OK?"

---

## Task 6: 태블릿 패스 (768×1024 단독)

⚠ 시드 프로젝트가 묶음 5에서 삭제되었음. 태블릿 검증을 위해 새 시드 프로젝트 1개 생성.

- [ ] **Step 6.1: 태블릿 viewport + 새 시드 프로젝트**

도구: `browser_resize` 768×1024 → 대시보드에서 "+ 새 작품" → "QA-시드-태블릿"

- [ ] **Step 6.2: Navigation 중복 표시 검사 (51a22200)**

도구: 사이드바 영역에 동일 메뉴가 2번 렌더링되지 않는지 검증
```javascript
() => document.querySelectorAll('[data-nav-item]').length // 또는 텍스트 매칭
```

캡처: `T-02-tablet.png`

- [ ] **Step 6.3: 사이드바 영역만큼 메인 콘텐츠 좁아짐**

검증: 메인 콘텐츠 영역 width < 768 - sidebar.width

- [ ] **Step 6.4: 햄버거 토글 동작**

검증: 햄버거 클릭 → 사이드바 토글. 토글이 무용지물 안 됨.

- [ ] **Step 6.5: 캐릭터 카드 1탭 (e16acd36)**

순서: 캐릭터 1명 추가 → 카드 1탭 → 상세 슬라이드 인 (hover 가로채기 X)

캡처: `T-05-tablet.png`

- [ ] **Step 6.6: 캐릭터 슬라이드 패널 동작**

검증: 슬라이드 인/아웃, 닫기 버튼

- [ ] **Step 6.7: FAB 위치 / 바텀탭 vs 사이드바 분기점**

태블릿에서 FAB 표시 여부 + 위치 적절성 시각 검증.

- [ ] **Step 6.8: 관계도 캔버스 줌 (+/-/↺)**

- [ ] **Step 6.9: 관계연결 ⇌ 버튼 데스크톱 헤더 위치**

태블릿에서 ⇌ 버튼이 헤더에 정상 노출.

캡처: `T-09-tablet.png`

- [ ] **Step 6.10: 모달 width 768px에서 깨지지 않음**

검증 대상 모달: 캐릭터 추가 / 관계 연결 / 복선 추가 / 타임라인 추가
- 각 모달 열기 → ASSERT_NO_OVERFLOW (모달 내부)

캡처: `T-10-tablet.png` (모달 시각 증거)

- [ ] **Step 6.11: 이용방법 / Settings 사이드바 (2a911f24)**

도구: /settings → 이용방법 섹션 → 카드 통일 (`feature-card`) 적용 시각 검증

- [ ] **Step 6.12: 태블릿 시드 프로젝트 삭제**

cleanup. 빌링 무손상 검증.

- [ ] **Step 6.13: 태블릿 패스 1줄 보고**

"태블릿 패스 완료. console.error N건. 모든 시드 정리됨."

---

## Task 7: 최종 리포트

- [ ] **Step 7.1: 결과 파일 마무리**

추가:
```markdown
## Fail / Regression 목록
1. [caseId] — [원인 요약]
...

## 누적 카운터 (최종)
- console.error: N
- CSP 위반: N
- 4xx/5xx (의도 401 제외): N
- Sentry 이벤트: N
- 시드 cleanup 실패: N
- 쿠폰 시도: 5/5

## 회차 비교 (이전 회차와의 회귀)
- 첫 회차 — 비교 대상 없음

## 수동 검증 항목 (별도)
- 인앱브라우저 (카톡/인스타) signInWithRedirect — 별도 폰 30초 확인 필요. 결과: <PENDING>
```

- [ ] **Step 7.2: 결과 파일 commit**

```bash
git add docs/qa-runs/
git commit -m "docs(qa): 2026-05-01 R1 QA run 결과"
```

- [ ] **Step 7.3: 사용자 최종 보고**

요약 1단락:
- 총 케이스 수 / Pass / Fail
- Critical Fail 항목 (3개 이내)
- 88장 캡처 검토 가이드 (시각 회귀 의심 영역 표시)
- 인앱브라우저 수동 검증 리마인더

---

## 안전 가드 (모든 Task 공통)

**Pre-case (매 케이스 실행 전):**
1. `dummyUid` 비교 (mismatch면 abort)
2. URL projectId가 더미 시드인지 검증
3. action 시퀀스에 "회원 탈퇴" / "deleteAccount" / "정말 탈퇴" 포함 시 abort
4. 쿠폰 시도 카운터 ≥ 5 시 abort
5. Toss "결제하기" / "확인" 클릭 시 abort

**Post-case cleanup:**
6. 공유 모드 검증 후 → shareEnabled 강제 false
7. 시드 cleanup 실패 5회 초과 시 사용자 보고
8. 빌링 상태 변경 시 (의도된 모달 진입 외) 즉시 abort

**Negative path (실패해야 PASS):**
- /project/__invalid__ → 정상 에러 화면 + console throw 0건
- _system/coupon_attempts_<dummyUid> read → permission-denied
- 비공유 프로젝트 incognito 접근 → "공유되지 않은 프로젝트"
- 잘못된 쿠폰 5회 → rate limit 메시지

---

## Self-Review (작성 후)

1. **Spec coverage:** 5묶음 + 태블릿 패스 + 추가 6개 항목(NEW-PIPA-01/02, NEW-NEG-01/02, NEW-CAP-01, NEW-SHARE-01) 모두 task로 매핑됨 ✓
2. **Placeholder scan:** "TBD" 0건. "implement later" 0건. ✓
3. **Type consistency:** assertion 코드 명칭 spec과 일치 (`ASSERT_*`) ✓
4. **빠진 영역:** 더미 계정이 trial이라 Free 한도 검증(E2/F2/G2 등) 자동 검증 불가 — Step 4.12에 노트로 명시 ✓
