# Cartographic QA 매트릭스 설계 — 2026-05-01

## 1. 메타

| 항목 | 값 |
|---|---|
| 대상 사이트 | https://cartographic.agency (production) |
| 보조 대상 | 비로그인 영역 read-only (랜딩/legal/pricing/shared) |
| 실행 도구 | Playwright MCP |
| 실행 컨텍스트 | 단일 브라우저 컨텍스트 재사용 (semi-manual OAuth 1회) |
| 결과 기록 | `docs/qa-runs/2026-05-01-cartographic-qa-run.md` |
| 스크린샷 위치 | `docs/qa-runs/2026-05-01/screenshots/` |
| 더미 계정 | 신규 Google 계정 1개 (가입 직후 → 30일 trial 자동 진입). 식별자는 결과 파일에서 마스킹 |
| QA 회차 | 첫 회차 (이전 회차 비교 없음) |

## 2. 목적 / 비목적

**목적**

- 출시 후 누적된 13개 fix(2a911f24..a0176894 + 보안/PIPA 패치)의 회귀 검증
- 모바일 viewport overflow / 입력 포커스 / 반응형 회귀 자동 검출
- PIPA 2026.9 개정 대비 가입 동의·처리방침·접속기록 표시 검증
- 보안 헤더(CSP) 및 Toss 결제 진입 흐름 안정성 확인
- viewport·테마·계정상태 폭증을 막은 채 핵심 회귀 영역 빠짐없이 커버

**비목적**

- Pro 플랜 실제 결제 / 회원 탈퇴 시나리오 (사용자 메모리 가드)
- 다른 사용자 데이터 접근
- 자동화로 통과 불가능한 영역(인앱브라우저 OAuth)
- 백엔드 스케줄러 직접 트리거 (`billingScheduler` 등 — Firebase Console 별도 작업)
- 시각적 미세 디자인 검토 (다음 디자인 라운드)

## 3. 결정 사항 요약

| 축 | 값 |
|---|---|
| 환경 우선순위 | B (prod + 더미 계정) 메인, A (prod 비로그인) 보조 |
| Hard guards | 타 계정 접근 금지 / `deleteAccount` 금지 / 쿠폰 ≤5회 |
| Viewport | 모바일 375 + 데스크톱 1280 (메인) + 태블릿 768 (특이 케이스 12+) |
| 인증 | Semi-manual 1회 OAuth → 컨텍스트 재사용 |
| 세션 분할 | 5묶음 + 태블릿 패스 (각 묶음 시작 시 토큰 헬스체크) |
| 판정 강도 | 자동 100% + 묶음당 viewport별 8장 캡처 |
| 캡처 총량 | ~88장 + Fail/의심 시 추가 |
| 결과 파일 | 회차별 마크다운 누적 |

## 4. 묶음 구성

### 묶음 1 — 비로그인 영역 (인증 불필요)

| 영역 | 항목 수 추정 |
|---|---|
| 랜딩 페이지 | 6 |
| `/legal` 처리방침 (PIPA 신규 조항 포함) | 8 |
| `/pricing` (비로그인 노출 + 30일 trial 배지) | 5 |
| `/shared/<projectId>` (외부 공유 페이지 read-only) | 8 |
| `/login` (PIPA 가입 동의 체크박스) | 5 |
| **합계** | **~32** |

회귀 위험 포커스:
- `cc386f28` PIPA 가입 동의 체크박스 + Legal 신규 조항
- 모바일 overflow 회귀 (페이지 자체 + 하단 sticky CTA)

### 묶음 2 — 인증 + 대시보드 + 프로젝트 CRUD

| 영역 | 항목 수 추정 |
|---|---|
| Google OAuth 통과 (1회) + ConsentModal + OnboardingModal | 4 |
| 대시보드 빈 상태 + 프로젝트 생성 | 8 |
| 프로젝트 카드 점3개 메뉴 (수정/삭제/외부 클릭) | 6 |
| `/project/:id` 진입 + 헤더 메뉴 | 6 |
| `/project/__invalid__` negative path (assertId 가드) | 4 |
| 공유 모드 양방향 토글 (incognito 컨텍스트로 검증) | 8 |
| 인라인 제목 편집 + ESC | 4 |
| 검색(통합) | 8 |
| **합계** | **~48** |

⚠ **공유 모드 검증은 끝나면 강제 `shareEnabled = false` 복구.** cleanup 실패 시 다음 묶음 진행 차단.

### 묶음 3 — 캐릭터·관계도 (회귀 핵심)

회귀 포커스: `e16acd36`(캐릭터 슬라이드/모바일 중앙/태블릿), `7e5d6b27`(#4 입력 포커스), `59cc4889`(#10 위치이동 후 순서 복귀), `a2d3c098`(모바일 ⇌ 받는사람)

| 영역 | 항목 수 추정 |
|---|---|
| 캐릭터 추가 모달 + slide-in | 6 |
| 캐릭터 카드 (호버/탭 동작/긴 텍스트 ellipsis) | 8 |
| 캐릭터 상세 — 5개 input(이름/역할/나이/소속/능력) 포커스 유지 회귀 검증 | 10 |
| 캐릭터 상세 — 사진 업로드/위치/삭제 | 8 |
| 캐릭터 검색 (통합 검색 별도) | 4 |
| 드래그 순서 변경 (#10 회귀: 종료 후 즉시 적용) | 6 |
| 관계도 — 캐릭터 위치 드래그 / 줌 | 6 |
| 관계도 — 관계 연결 (시작→대상→모달) | 6 |
| 관계도 — 라벨 한글 박스 / 색상 / 편집 / 삭제 | 6 |
| 관계도 — 모바일 ⇌ 받는 사람 클릭 회귀 | 4 |
| 캐릭터 삭제 → relations / foreshadows.charIds cascade | 4 |
| ShareModal 진입 (html2canvas PNG download trigger 포함) | 4 |
| **합계** | **~72 (×2 viewport ≈ 144 케이스)** |

### 묶음 4 — 복선·타임라인·세계관·링크

회귀 포커스: `b1922e10`(타임라인 화수 제한 + 양방향), `dc5f349a`(설정집 unsaved 모달 + 탭 가드), `b11a91c2`(복선 회차 숫자), `a0176894`/`f573aa26`(복선 모바일 overflow)

| 영역 | 항목 수 추정 |
|---|---|
| 복선 추가 / 회수 토글 / 자동 분류 | 8 |
| 복선 언급 회차 다중 추가 (숫자만 허용 회귀) | 4 |
| 복선 캐릭터 연결 / charIds 정리 | 4 |
| 복선 모바일 카드 가로 overflow 회귀 (b/f 패치 검증) | 6 |
| 타임라인 이벤트 추가 / 화수 제한 (1~999) | 6 |
| 타임라인 ↔ DetailPanel 등장화수 양방향 동기화 | 6 |
| 타임라인 펼치기/접기 / 정렬 / ellipsis | 4 |
| 세계관 문서 추가 / 미저장 표시 | 4 |
| 세계관 unsaved 상태 ← 목록 클릭 시 경고 모달 (dc5f349a) | 4 |
| 세계관 탭 이동 가드 (다른 탭으로 떠날 때 모달) | 4 |
| 링크 추가 / 외부 새탭 / 작가명 ellipsis | 4 |
| 드래그 순서 변경 (reorderMode 진입/종료 시 onSaveOrder) | 4 |
| 무료 한도 모달 (E2 addNew null guard / 복선·타임라인·세계관·링크 한도) | 6 |
| **합계** | **~64 (×2 viewport ≈ 128 케이스)** |

### 묶음 5 — 보안 헤더 + Toss 진입 + 쿠폰 rate limit

| 영역 | 항목 수 추정 |
|---|---|
| 보안 헤더 (CSP, X-Frame-Options, X-Content-Type-Options 등 응답 헤더 검증) | 8 |
| CSP frame-src `*.tosspayments.com` (`e5e953ca` 회귀) | 2 |
| Toss 결제 위젯 진입 — Pro 결제 모달 → 위젯 iframe 로드까지만 | 4 |
| Toss 위젯 도메인 외 요청 0건 (network log 검증) | 2 |
| 쿠폰 잘못된 코드 5회 입력 → "1시간 후 다시 시도" rate limit (`0651e50d`) | 5 |
| 쿠폰 정상 코드 진입 (테스트용 발급분만, 1회) | 2 |
| `_system/coupon_attempts_<uid>` 클라이언트 read 차단 (negative path) | 1 |
| Sentry 이벤트 0건 검증 (전체 묶음 실행 중 누적) | 1 |
| `/project/__invalid__` 외 추가 negative path (이미 묶음 2 보유) | (없음) |
| **합계** | **~25 (×2 viewport ≈ 50 케이스)** |

### 태블릿 패스 (768px 단독)

| 항목 | 회귀 포커스 |
|---|---|
| Navigation 중복 표시 검사 | `51a22200` |
| 사이드바 영역 만큼 메인 콘텐츠 좁아짐 | (사용자 추가) |
| 햄버거 토글 동작 (사이드바 항상 열림 분기) | `51a22200` |
| 캐릭터 카드 1탭으로 상세 열림 (hover 가로채기 X) | `e16acd36` (사용자 추가) |
| 캐릭터 슬라이드 패널 동작 | `e16acd36` |
| FAB 위치 / 바텀탭 vs 사이드바 분기점 | `e16acd36` |
| 관계도 캔버스 줌 (핀치/+−↺) | - |
| 관계연결 ⇌ 버튼 데스크톱 헤더 위치 (사용자 추가) | - |
| 모달 width 768px에서 깨지지 않음 (캐릭터/관계/복선/타임라인 추가 모달) | (사용자 추가) |
| 이용방법 / Settings 사이드바 | `2a911f24` |

**합계 ~12 항목 (태블릿 단독 케이스).**

## 5. 매트릭스 컬럼 정의

각 케이스는 다음 13개 컬럼으로 표현:

| 컬럼 | 설명 | 예시 |
|---|---|---|
| `bundle` | 1~5 묶음 ID | `3` |
| `caseId` | 묶음별 일련번호 | `B3-07` |
| `qaRefId` | QA_CHECKLIST 매핑 (없으면 `NEW-*`) | `C9` / `NEW-PIPA-01` |
| `feature` | 검증 대상 | "캐릭터 상세 이름 input 포커스 유지" |
| `viewport` | mobile / desktop / tablet | `mobile` |
| `precondition` | 사전 상태 | "로그인됨 + 캐릭터 1명 존재" |
| `action` | 사용자 동작 시퀀스 | "카드 클릭 → 이름 input 클릭 → 'A' 5회 입력" |
| `assertions` | 자동 판정 룰 코드 목록 | `[ASSERT_FOCUS_RETAINED, ASSERT_NO_CONSOLE_ERROR]` |
| `expected` | 기대 결과 | "입력 중 포커스 유지, 'AAAAA' 표시" |
| `riskRef` | 관련 커밋/이슈 | `7e5d6b27 #4 #4.5` |
| `priority` | 🔴/🟡/🟢 | 🔴 |
| `captureOnPass` | 묶음 8장 후보 여부 | true |
| `safetyGuard` | 강제 가드 | "shareEnabled OFF 복구" |

## 6. 자동 판정 룰 카탈로그

| 코드 | 검증 내용 | 구현 |
|---|---|---|
| `ASSERT_NO_OVERFLOW` | 페이지/모달 가로 overflow 없음 | `document.documentElement.scrollWidth <= clientWidth` + 모든 `[role=dialog]` 내부 동일 |
| `ASSERT_NO_CONSOLE_ERROR` | console.error 0건 | Playwright `page.on('console')` 누적 (whitelist 가능) |
| `ASSERT_NO_CSP_VIOLATION` | CSP 위반 메시지 0건 | console에 `Content Security Policy` 문자열 없음 |
| `ASSERT_NO_SENTRY_EVENT` | Sentry 이벤트 0건 | `*sentry.io*` network call 0건 |
| `ASSERT_NO_NETWORK_ERROR` | 4xx/5xx 0건 (의도된 401 제외) | `page.on('response')` |
| `ASSERT_FOCUS_RETAINED` | input 포커스 유지 | 타이핑 중 `document.activeElement === input` |
| `ASSERT_TEXT_PRESENT` | 특정 문자열 노출 | `getByText` / locator |
| `ASSERT_TEXT_ABSENT` | 특정 문자열 비노출 | locator count 0 |
| `ASSERT_URL_MATCH` | 라우트 일치 | `expect(page).toHaveURL` |
| `ASSERT_TOAST` | 토스트 표시 후 자동 사라짐 | `getByText` 표시 → 1.5초 후 not-visible |
| `ASSERT_DOWNLOAD` | 파일 다운로드 트리거 | `page.waitForEvent('download')` 후 suggested filename / mimetype 검증 |
| `ASSERT_FIRESTORE_DENIED` | Firestore SDK 호출이 permission-denied | try/catch에서 `code === 'permission-denied'` 확인 |
| `ASSERT_INCOGNITO_ACCESS` | 비로그인 incognito 컨텍스트로 URL 접근 가능 여부 | 별도 `browser.newContext()` (no auth) |
| `ASSERT_BILLING_INTACT` | 더미 계정 subscription/billingKey 무손상 | 묶음 시작/끝에 Settings 진입 → 표시값 비교 |
| `ASSERT_RESPONSE_HEADER` | 응답 헤더 존재/값 | `page.on('response')` → `headers()['content-security-policy']` |

## 7. 캡처 정책

- **묶음당 viewport별 8장** 핵심 화면 강제 캡처 (총 ~88장)
- 후보 선정 기준:
  1. 회귀 위험도 최상 (최근 fix 영역)
  2. 시각 검토만 가능한 항목 (ellipsis, 모달 width, 다크/라이트)
  3. 골든패스 마일스톤 (대시보드 빈상태, 캐릭터 카드, 관계도, 공유 모달, 결제 진입)
- Fail/의심 시 추가 캡처 (장수 무제한)
- 파일명: `<bundle>-<caseId>-<viewport>.png` (예: `B3-07-mobile.png`)
- 위치: `docs/qa-runs/2026-05-01/screenshots/`

## 8. 안전 가드 (강화)

매 케이스 실행 전후 다음 체크. 위반 시 즉시 abort + 사용자에게 보고:

```
[Pre-case]
0. 초기 단계: OAuth 통과 직후 한 번 uid 캡처 → `dummyUid` 변수에 보관. 묶음 시작 시마다 검증.
1. 현재 로그인 uid === `dummyUid` ? (mismatch면 즉시 abort)
2. 진입 URL projectId가 더미 계정 ownerId 프로젝트인가? (다른 프로젝트면 abort)
3. action 시퀀스에 다음 텍스트 포함 시 abort:
   - "회원 탈퇴", "deleteAccount", "정말 탈퇴", "탈퇴하기"
4. 쿠폰 시도 카운터 누적 ≥ 5 → 추가 시도 금지
5. Toss 위젯에서 "결제하기" / "확인" 클릭 시 abort (모달 진입까지만)

[Post-case cleanup 검증]
6. 공유 모드 토글 검증 후 → shareEnabled 강제 false 복구.
   복구 실패 시 다음 묶음 진행 차단.
7. 시드로 만든 캐릭터·복선·타임라인·세계관·링크 → 케이스 종료 시 삭제.
   삭제 실패 시 누적 카운터 +1, 5회 초과 시 사용자 보고.
8. 더미 계정 subscription / billingKey 변경 여부 검사.
   변경 발견 시 (의도된 toss 모달 진입 외) → 즉시 abort.

[Negative path 명시]
9. 다음은 의도된 실패 (assertion이 "실패해야 PASS"):
   - /project/__invalid__ → 정상 에러 화면 + console throw 0건
   - _system/coupon_attempts_<uid> read → permission-denied
   - 비공유 프로젝트 incognito 접근 → "공유되지 않은 프로젝트" 화면
   - 잘못된 쿠폰 5회 → rate limit 메시지
```

## 9. cleanup 정책

| 시점 | 동작 |
|---|---|
| 케이스 종료 시 | 시드 데이터 삭제 (생성한 캐릭터/복선 등). 단 다음 케이스가 사용 예정이면 유지 |
| 묶음 종료 시 | 누적 시드 데이터 전수 삭제 + `shareEnabled=false` 강제 복구 + 빌링 상태 검증 |
| 전체 종료 시 | 더미 계정에 남은 잔여물 0개 검증. 잔여물 발견 시 마지막 묶음의 cleanup 실패로 보고 |

cleanup은 사용자 데이터 삭제 절대 금지 룰을 위반하지 않습니다 — 더미 계정 본인이 자신의 시드 데이터를 정리하는 것이며, 다른 계정/실데이터는 건드리지 않음.

## 10. Playwright MCP 실행 흐름

```
[묶음 시작]
  → 토큰 헬스체크: /dashboard 진입 → 사용자 이메일 표시 확인
  → 만료 시: 사용자에게 재인증 요청 후 대기
  → 묶음 시작 시 ASSERT_BILLING_INTACT 베이스라인 캡처

[케이스 루프]
  for case in cases (mobile → desktop 순):
    → viewport set
    → pre-case safety gate
    → precondition 셋업 (필요 시 시드)
    → action 실행
    → assertions 평가
    → captureOnPass 대상이면 스크린샷
    → 결과 row 누적
    → post-case cleanup

[묶음 종료]
  → 콘솔/네트워크 요약 집계
  → 묶음 종료 cleanup (전수 시드 삭제 + shareEnabled OFF + 빌링 검증)
  → 결과 파일에 묶음 섹션 append
  → 사용자에게 "묶음 N 완료, 다음 묶음 진행할까요?" 확인 게이트
```

## 11. 결과 파일 포맷

파일: `docs/qa-runs/2026-05-01-cartographic-qa-run.md`

```markdown
# Cartographic QA Run — 2026-05-01

## 환경
- target: https://cartographic.agency
- 더미 계정: <마스킹>
- 시작/종료: KST
- 가드: 타 계정/탈퇴/쿠폰5회 — 적용

## 묶음 1: 비로그인 영역
| caseId | feature | viewport | result | evidence | notes |
|---|---|---|---|---|---|
| B1-01 | 랜딩 페이지 로드 | desktop | ✅ | screenshots/B1-01-desktop.png | - |
| B1-02 | /pricing 진입 | mobile | ❌ | screenshots/B1-02-mobile.png | scrollWidth 401>375 |

### 묶음 1 요약
- console.error: 0건
- CSP 위반: 0건
- 4xx/5xx: 0건 (예외: /api/me 401 — 비로그인 의도됨)

(묶음 2~5, 태블릿 패스 동일 구조)

## Fail / Regression 목록
1. B1-02 — pricing 페이지 모바일 가로 overflow 401px ...

## 회차 비교 (이전 회차와의 회귀)
- (첫 회차 — 비교 대상 없음)

## 수동 검증 항목 (자동화 불가)
- 인앱브라우저 (카톡/인스타) signInWithRedirect — 별도 폰으로 30초 확인. 결과: <PASS / FAIL>
```

## 12. 자동화 불가 — 사용자 수동 검증 (별도)

| 항목 | 방법 | 시간 |
|---|---|---|
| 인앱브라우저 (카톡/인스타) signInWithRedirect | 별도 폰으로 카톡 채팅 안 https://cartographic.agency 링크 클릭 → 로그인 흐름 확인 | 30초 |

## 13. 항목 총량 추정

| 묶음 | 항목 | viewport 곱 | 합계 |
|---|---|---|---|
| 1 | ~32 | ×2 | ~64 |
| 2 | ~48 | ×2 | ~96 |
| 3 | ~72 | ×2 | ~144 |
| 4 | ~64 | ×2 | ~128 |
| 5 | ~25 | ×2 | ~50 |
| T (태블릿) | ~12 | ×1 | ~12 |
| **합계** | | | **~494 케이스** |

(이전 추정 410 → 실제 항목 단위 viewport 곱 적용 시 ~494. 캡처는 묶음당 16장 + 태블릿 8장 = 88장 고정.)

## 14. 다음 단계

1. 사용자 spec 검토 게이트
2. (승인 후) writing-plans 스킬로 묶음별 실행 계획 수립
3. 묶음 1부터 Playwright MCP 실행. 각 묶음 종료 시 사용자 확인 후 다음 묶음 진행

---

## 15. 추가 항목 (사용자 요청 반영)

| # | 항목 | 묶음 | 회귀/근거 |
|---|---|---|---|
| NEW-PIPA-01 | Login.jsx 가입 동의 체크박스 — 미체크 시 버튼 disabled, 체크 후 enabled | 1 | `cc386f28` |
| NEW-PIPA-02 | Legal.jsx 신규 조항 표시 (제2조 접속기록 1년 / 제8조 안전성 4분류 / 제8조의2 유출 통지) | 1 | `cc386f28` |
| NEW-NEG-01 | `/project/__invalid__` URL 직접 입력 — 정상 에러 화면, console throw 0건 | 2 | `0651e50d` assertId 가드 |
| NEW-CAP-01 | ShareModal "현재 화면 이미지로 저장" 클릭 → PNG 다운로드 트리거 검증 | 3 | html2canvas + page.waitForEvent('download') |
| NEW-SHARE-01 | 공유 모드 양방향 — owner shareEnabled ON → incognito context로 /shared/<id> 접근 가능, OFF → 접근 불가. **검증 후 강제 OFF 복구** | 2 | firestore.rules `isShared` |
| NEW-NEG-02 | `_system/coupon_attempts_<uid>` 클라이언트 SDK read 시도 → permission-denied | 5 | `0651e50d` rules |

---

## 16. 회차 식별

| 항목 | 값 |
|---|---|
| 회차명 | 2026-05-01 R1 |
| 비교 기준 | 첫 회차 (없음) |
| 다음 회차 위치 | `docs/qa-runs/2026-MM-DD-cartographic-qa-run.md` |
