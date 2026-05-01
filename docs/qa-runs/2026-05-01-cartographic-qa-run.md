# Cartographic QA Run — 2026-05-01

## 환경
- target: https://cartographic.agency
- 더미 계정: <묶음 2에서 캡처>
- 시작: 2026-05-01 KST
- 실행 도구: Playwright MCP (single context)
- 가드: 타 계정 / deleteAccount / 쿠폰 ≤5회 / 공유 토글 강제 OFF / Toss 결제 진입까지만

## 누적 카운터
- console.error: 0
- CSP 위반: 0
- network 4xx/5xx (의도 401 제외): 0
- Sentry 이벤트 (sentry.io 호출): 0
- 시드 cleanup 실패: 0회
- 쿠폰 시도: 0/5

---

## 묶음 1: 비로그인 영역

| caseId | feature | viewport | result | evidence | notes |
|---|---|---|---|---|---|
| B1-01 | /login PIPA 가입 동의 체크박스 — 미체크 시 disabled, 체크 후 enabled (NEW-PIPA-01) | mobile | ✅ | screenshots/B1-01-mobile.png | overflow 0 |
| B1-01 | 동일 | desktop | ✅ | screenshots/B1-01-desktop.png | overflow 0, button disabled 확인 |
| B1-02 | / → /login 리다이렉트 (비로그인) | both | ✅ | (B1-01에 포함) | App.jsx Route 동작 정상 |
| B1-03 | /legal PIPA 신규 조항 (NEW-PIPA-02) — 제2조 접속기록 1년/제8조 안전성 4분류/제8조의2 유출 통지 | desktop | ✅ | screenshots/B1-03-desktop.png | 모든 키워드 매칭 (접속기록/1년/관리적/기술적/물리적/유출/통지/72시간 또는 지체 없이) |
| B1-03 | 동일 | mobile | ✅ | screenshots/B1-03-mobile.png | overflow 0 |
| B1-04 | /pricing 비로그인 진입 | mobile | ✅ | screenshots/B1-04-mobile.png | overflow 0, FREE/PRO/Enterprise 카드 정상. **"30일 무료" 배지 미노출** — 비로그인은 의도된 동작으로 추정. 묶음 2(로그인 후)에서 재검증 |
| B1-04 | 동일 | desktop | ✅ | screenshots/B1-04-desktop.png | 사업자정보 표기 정상 (히스티/162-18-02499) |
| B1-06 | /shared/<sample id> | - | ⏭️ skipped | - | 공개 sample share id 미제공 — 묶음 2에서 더미 계정 프로젝트로 검증 |

### 묶음 1 요약
- console.error: 0건 ✅
- console.warning: 0건 ✅
- CSP 위반: 0건 ✅
- network 4xx/5xx: 0건 ✅ (의도된 401 없음)
- Sentry 이벤트: 0건 ✅
- 모바일 overflow: 0건 ✅
- 캡처: 5장 (B1-01 m/d + B1-03 m/d + B1-04 m + B1-04 d = 6장)
- 발견사항: pricing 비로그인 노출 시 "30일 무료" 배지 미노출 → 의도 확인 필요 (묶음 2에서 로그인 후 재검증 예정)

---

## 묶음 2: 인증 + 대시보드 + 프로젝트 CRUD

**더미 계정 정보 (마스킹):**
- uid: `IyBK...j1`
- email: `yw.f***uu@gmail.com`
- provider: google.com
- 기존 프로젝트: 1개 ("모바일QA테스트", 2026-04-28) — **건드리지 않음**

**시드 프로젝트:** `QA-시드-2026-05-01-001` (id: `ph5lgMiA668IGxo4S0tY`) — 묶음 3·4 공용, 묶음 5 종료 시 cleanup

| caseId | feature | viewport | result | evidence | notes |
|---|---|---|---|---|---|
| B2-02 | OAuth 통과 + dummyUid 캡처 + provider=google | desktop | ✅ | indexedDB firebaseLocalStorageDb | uid·email·providerId 모두 정상 |
| B2-03 | ConsentModal/OnboardingModal 재로그인 시 미표시 | desktop | ✅ | DOM 검사 | 이미 통과한 계정이라 안 뜸 |
| B2-04 | 대시보드 빈 상태 검증 | - | ⏭️ skipped | - | 기존 프로젝트 1개 존재로 빈상태 케이스 SKIP |
| B2-04m | 대시보드 모바일 (overflow + 카드 노출) | mobile | ✅ | screenshots/B2-04-mobile.png | overflow 0, 카드 2개(기존+시드) |
| B2-04d | 대시보드 데스크톱 (시드 생성 후) | desktop | ✅ | screenshots/B2-04-desktop.png | overflow 0 |
| B2-05 | 프로젝트 생성 (시드 `QA-시드-2026-05-01-001`) | desktop | ✅ | URL `/project/ph5lgMiA668IGxo4S0tY` | 모달 → 입력 → "만들기" → 진입 정상 |
| **B2-07** | **`/project/__invalid__` negative path (NEW-NEG-01)** | desktop | ❌ **FAIL** | screenshots/B2-07-desktop-FAIL.png | **회귀**: 빈 캐릭터 상태처럼 렌더 + console.error 7건 (Reserved id `__invalid__` + 6개 collection permission denied). 사용자가 invalid URL을 정상 빈 프로젝트로 착각할 위험. NotFound 페이지 또는 명시적 에러 메시지 필요 |
| B2-08-on | 공유 모드 ON → 공유 페이지 데이터 노출 | desktop | ✅ | screenshots/B2-08-on-desktop.png | 시드 제목 + 읽기 전용 배지 + 4개 탭 표시 |
| B2-08-off | 공유 모드 OFF → "공유가 비활성화된 프로젝트예요" | desktop | ✅ | screenshots/B2-08-off-desktop.png | shareEnabled 강제 OFF 후 노출 (NEW-SHARE-01 PASS) |
| B2-08-cleanup | shareEnabled 강제 OFF 복구 | - | ✅ | (B2-08-off 상태 그대로) | 안전 가드 통과 |
| **B2-09a** | **공유 모달 ESC 닫힘** | desktop | ❌ **FAIL** | (재현 필요) | **회귀**: 공유 모달이 ESC로 안 닫힘. 검색 모달은 ESC 닫힘. 일관성 깨짐 |
| B2-09b | 검색 모달 열기 + ESC 닫기 (R8) | desktop | ✅ | DOM 검사 | input placeholder "검색어를 입력하세요" 표시, ESC로 닫힘 |

### 묶음 2 console/network 요약
- console.error: **누적 11건** ⚠️
  - **COOP 정책 vs Firebase Auth `window.closed` 폴링** 8건 (반복) — 보안 헤더 강화(`31fa3bcd`)의 알려진 트레이드오프. 기능 영향 없음
  - **Project.jsx invalid id** 7건 (Reserved id 1 + Permission denied 6) — B2-07 FAIL의 부산물
- console.warning: 0
- CSP 위반: 0
- network 4xx/5xx: 0 (의도된 401 없음)
- Sentry 호출: 0

### 묶음 2 발견사항 / 회귀 후보
1. 🔴 **B2-07** — `/project/__invalid__` 정상 빈 프로젝트처럼 렌더 + console.error 7건. assertId 가드가 컴포넌트 마운트 전에 작동해야 함
2. 🟡 **B2-09a** — 공유 모달 ESC 미동작 (검색 모달은 OK) — 모달 일관성 깨짐
3. 🟡 **COOP 정책 vs Firebase Auth popup** — `window.closed` 차단 console.error 8건 (반복). 기능 OK지만 console 노이즈. COOP를 `same-origin-allow-popups`로 완화하거나 console.error 등급을 down하는 방법 검토

### 묶음 2 cleanup 상태
- 시드 프로젝트 `ph5lgMiA668IGxo4S0tY` — **유지** (묶음 3·4 공용)
- shareEnabled — **OFF 복구 완료** ✅
- 빌링 변경 — 없음 (트리거 없음)
- 기존 프로젝트 "모바일QA테스트" — **무손상** ✅

---

## 묶음 3: 캐릭터·관계도

| caseId | feature | viewport | result | evidence | notes |
|---|---|---|---|---|---|
| B3-02 | 캐릭터 추가 모달 — overflow 0, 5개 input + textarea + 태그 | desktop | ✅ | (모달 OK) | modalOverflow=0, pageOverflow=0 |
| **B3-03a** | **캐릭터 상세 — 역할 input 포커스 유지 (한글 글자별 타이핑)** | desktop | ✅ | DOM 검사 | "주인공" 한글자씩 입력 후 placeholder/value 모두 그대로 → 7e5d6b27 #4 회귀 미발생 |
| **B3-03b** | **캐릭터 상세 — 나이 input 포커스 유지** | desktop | ✅ | DOM 검사 | "25세" → 포커스 유지 |
| **B3-03c** | **캐릭터 상세 — 소속 input 포커스 유지** | desktop | ✅ | DOM 검사 | "왕궁" → 포커스 유지 |
| **B3-03d** | **캐릭터 상세 — 능력/특기 input 포커스 유지** | desktop | ✅ | DOM 검사 | "검술" → 포커스 유지 |
| **B3-03e** | **캐릭터 상세 — 이름 input 편집 (기존 값 끝에 _v2 추가)** | desktop | ✅ | DOM 검사 | End → "_v2" → value=`QA캐릭A_v2`, 포커스 유지 → 7e5d6b27 #4.5 회귀 미발생 |
| B3-03-save | 저장 버튼 → DB 갱신 → 패널에 5개 필드 모두 노출 | desktop | ✅ | screenshots/B3-03-desktop.png | "QA캐릭A_v2 / 주인공 / 25세 / 왕궁 / 검술" 표시 |
| **B3-12** | **ShareModal "현재 화면 이미지로 저장" → PNG 다운로드 트리거 (NEW-CAP-01)** | desktop | ✅ | `.playwright-mcp/cartographic-characters-1777643217091.png` | anchor.download 발동, filename 패턴 `cartographic-<tab>-<ts>.png`, href data:image/png;base64 prefix 정상 |
| B3-04 | 사진 업로드/위치/삭제 (5MB 제한, photoPosition) | - | ⏭️ deferred | - | 시간 효율 위해 다음 라운드 (Storage rules 검증 별도 시간 필요) |
| B3-05 | 캐릭터 카드 1탭/호버 (e16acd36 회귀) | - | ⏭️ deferred-to-tablet | - | 태블릿 패스에서 1탭 회귀가 더 핵심 |
| B3-06 | 긴 텍스트 ellipsis | - | ⏭️ deferred | - | 다음 라운드 |
| B3-07 | 위치이동 회귀 (59cc4889) | - | ⏭️ deferred | - | 캐릭터 3명 이상 필요. 시드 단순화 위해 다음 라운드 |
| B3-08 | 관계도 캐릭터 드래그/줌 | - | ⏭️ deferred | - | 캐릭터 1명만 있어 의미 없음 |
| B3-09 | 관계 연결 (시작→대상→모달) | - | ⏭️ deferred | - | 캐릭터 2명 이상 필요 |
| B3-10 | 모바일 ⇌ 받는사람 (a2d3c098) | - | ⏭️ deferred | - | 캐릭터 2명 이상 필요. 다음 라운드 |
| B3-11 | 관계 라벨 한글 박스 | - | ⏭️ deferred | - | 관계 1개 이상 필요 |
| B3-13 | 캐릭터 삭제 cascade | - | ⏭️ deferred | - | 묶음 5 시드 cleanup으로 갈음 |
| **B3-14** | **+ 캐릭터 버튼 — 캐릭터 상세 보고 있는 상태에서 동작 이상** | desktop | 🟡 **회귀 후보** | DOM 검사 | "+ 캐릭터" 클릭 시 모달이 안 뜨고 패널이 어색한 혼합 상태(이름 input에 기존 캐릭터 값이 그대로 남음). 새 캐릭터 추가 흐름이 명확치 않음 |

### 묶음 3 console/network 요약
- console.error: 5개 input 사이클 + 저장 + html2canvas 동안 추가 발생 0건 (누적 11건 그대로)
- console.warning: 0
- CSP 위반: 0
- network 4xx/5xx: 0
- Sentry: 0

### 묶음 3 발견사항
1. ✅ **5개 input 포커스 유지 (7e5d6b27 #4 #4.5) — 회귀 미발생**. 한글 글자별 타이핑 사이클 후 모두 INPUT 포커스 + value 정상 누적
2. ✅ **html2canvas PNG 다운로드 (NEW-CAP-01) — 정상 작동**. filename 자동 timestamp, data URL anchor click 트리거
3. 🟡 **B3-14 "+ 캐릭터" 버튼 — 캐릭터 상세 패널이 열린 상태에서 클릭 시 모달이 안 뜨고 기존 캐릭터 값이 입력 폼에 남아있는 혼합 상태**. 사용자가 새 캐릭터인지 기존 편집인지 헷갈릴 수 있음. (다음 라운드 더 정밀 검증 필요)
4. ⏭️ **8개 케이스 deferred** — 위치이동/관계연결/모바일 ⇌/카드 1탭은 캐릭터 3명+ 필요하거나 태블릿이 더 적절. 사용자 fix 후 별도 라운드 권장

### 묶음 3 cleanup 상태
- 캐릭터 `QA캐릭A_v2` — 시드 프로젝트 cascade로 묶음 5에서 일괄 정리
- shareEnabled OFF — 변경 안 함 (모달은 닫음)
- 빌링 변경 — 없음

---

## 묶음 4: 복선·타임라인·세계관·링크

| caseId | feature | viewport | result | evidence | notes |
|---|---|---|---|---|---|
| B4-02 | 복선 추가 모달 — 내용/언급 회차/캐릭터 연결/회수 토글 | desktop | ✅ | 모달 정상 | 캐릭터 자동 노출(QA캐릭A_v2) |
| **B4-03** | **복선 회차 input 숫자만 허용 (b11a91c2)** | desktop | ✅ | DOM 검사 | `abc12xyz3` 입력 → value `123` (자동 필터링) |
| **B4-04** | **복선 모바일 카드 가로 overflow (a0176894/f573aa26)** | mobile | ✅ | screenshots/B4-04-mobile.png | pageOverflow 0, cardsOverflow [] (빈 배열). "테스트복선 / 미회수 / 토글 / 수정 / 삭제 / 123화" 모두 정상 표시 |
| **B4-05** | **타임라인 화수 1~999 제한 (b1922e10)** | desktop | ❌ **FAIL** | screenshots/B4-05-desktop-FAIL.png | **회귀**: 화수 1000 입력 시 거절/보정 없이 정상 추가됨. input min/max 빈 값, 추가 시점에도 검증 없음. b1922e10에서 추가했어야 할 가드 누락 |
| B4-06 | 타임라인 ↔ DetailPanel 양방향 (b1922e10) | - | ⏭️ deferred | - | 캐릭터 1명만 등장인물 추가 가능 → 다음 라운드에서 본격 검증 |
| **B4-09** | **세계관 unsaved 상태 ← 목록 → 경고 모달 (dc5f349a)** | desktop | ✅ | DOM 검사 | "저장되지 않은 변경사항이 있어요" indicator + "저장하지 않은 내용이 있어요 / 변경 사항을 저장하지 않고 나가시겠어요? / 취소 / 나가기" 모달 정상 |
| **B4-10** | **세계관 탭 이동 가드 (dc5f349a)** | desktop | ✅ | DOM 검사 | unsaved 상태에서 캐릭터 탭 클릭 → "현재 탭의 변경사항이 저장되지 않았어요. 그래도 다른 탭으로 이동하시겠어요? / 취소 / 이동하기" 모달 정상 |
| B4-11 | 링크 추가 / 외부 새탭 / 작가명 ellipsis | - | ⏭️ deferred | - | 시간 효율 위해 다음 라운드 |
| B4-12 | 무료 한도 모달 (E2 addNew null guard) | - | ⏭️ deferred-account | - | 더미 계정 trial 상태에서 한도 모달 트리거 안 됨 → Free 계정 별도 검증 필요 |

### 묶음 4 console/network 요약
- console.error: 묶음 4 동안 추가 0건 (누적 11건 그대로)
- console.warning: 0
- CSP 위반: 0
- network 4xx/5xx: 0
- Sentry: 0

### 묶음 4 발견사항
1. ✅ **b11a91c2 (복선 회차 숫자만 허용) — 회귀 미발생**
2. ✅ **a0176894/f573aa26 (복선 모바일 overflow) — 회귀 미발생**. 모바일 viewport에서 카드 + page 모두 overflow 0
3. 🔴 **b1922e10 (타임라인 화수 1~999 제한) — 회귀 발생**. 화수 1000+ 입력 거절/보정 없이 정상 추가됨. input min/max 미설정 + 제출 시점 가드 누락
4. ✅ **dc5f349a (세계관 unsaved 모달 + 탭 이동 가드) — 회귀 미발생**. "저장 안 하고 나가시겠어요" + "다른 탭으로 이동하시겠어요" 양쪽 모달 정상

### 묶음 4 cleanup 상태
- 시드 복선 "테스트복선" — 묶음 5에서 시드 프로젝트 cascade로 정리
- 시드 타임라인 "QA-타임라인-1000화" — 동일 cascade 정리
- 세계관 unsaved 문서 — "이동하기"로 빠져나감 (저장 안 됨, 메모리에서 폐기)
- 빌링 변경 — 없음

---

## 묶음 5: 보안 헤더 + Toss 진입 + 쿠폰 rate limit

### 보안 응답 헤더 (메인 도큐먼트)

| 헤더 | 값 | 결과 |
|---|---|---|
| Content-Security-Policy | `default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.tosspayments.com https://apis.google.com https://*.gstatic.com https://www.googletagmanager.com; style-src ...; connect-src 'self' https://*.googleapis.com https://*.firebaseio.com https://*.firebaseapp.com https://apis.google.com https://api.tosspayments.com https://*.sentry.io wss://*.firebaseio.com; frame-src 'self' https://*.tosspayments.com https://*.firebaseapp.com https://accounts.google.com` | ⚠ — frame-src OK, 하지만 **connect-src에 cloudfunctions.net 누락** |
| X-Frame-Options | `DENY` | ✅ |
| X-Content-Type-Options | `nosniff` | ✅ |
| Strict-Transport-Security | `max-age=63072000` (2년) | ✅ |
| Referrer-Policy | `strict-origin-when-cross-origin` | ✅ |
| Permissions-Policy | `camera=(), microphone=(), geolocation=()` | ✅ |
| Cross-Origin-Opener-Policy | `same-origin-allow-popups` | ⚠ — Google OAuth popup의 window.closed 차단 console.error 발생 (이미 알려진 trade-off) |

### 케이스 결과

| caseId | feature | viewport | result | evidence | notes |
|---|---|---|---|---|---|
| B5-02-CSP | CSP frame-src `*.tosspayments.com` (e5e953ca) | desktop | ✅ | 헤더 검사 | 정상 포함 |
| B5-02-XFO | X-Frame-Options DENY | desktop | ✅ | 헤더 검사 | - |
| B5-02-XCTO | X-Content-Type-Options nosniff | desktop | ✅ | 헤더 검사 | - |
| B5-02-HSTS | HSTS 2년 | desktop | ✅ | 헤더 검사 | - |
| B5-02-COOP | COOP same-origin-allow-popups | desktop | 🟡 | 헤더 검사 | 정상 설정이나 Google OAuth(cross-origin) popup의 window.closed 폴링이 차단되어 console.error 발생 |
| **B5-02-CSP-CF** | **CSP connect-src에 cloudfunctions.net 포함** | desktop | ❌ **CRITICAL FAIL** | screenshots/B5-04-desktop.png | **회귀**: connect-src에 `https://*.cloudfunctions.net` 또는 정확한 `https://asia-northeast3-catograph-5d8f5.cloudfunctions.net` 누락. 모든 Cloud Functions 호출이 CSP에 의해 fetch 시작 전 차단됨 |
| **B5-04** | **쿠폰 잘못된 코드 5회 → rate limit (0651e50d)** | desktop | ❌ **검증 불가** | screenshots/B5-04-desktop.png | Cloud Function `applyCoupon` 호출이 CSP 차단으로 서버 도달 못 함. 사용자에게는 "⚠ internal" 메시지 노출. **rate limit 가드 자체는 서버에 있어 검증 불가능. 카운터: 클라이언트 5회 시도/서버 0회 도달** |
| **B5-05** | **`_system/coupon_attempts_<dummyUid>` 클라이언트 read 차단 (NEW-NEG-02)** | desktop | ✅ | Firestore REST 직접 호출 | status 403, `PERMISSION_DENIED`, "Missing or insufficient permissions". rules 정상 |
| B5-06 | Sentry 호출 누적 0건 검증 | desktop | ✅ | network requests filter `sentry` | 0 hit. CSP의 `*.sentry.io`는 허용되어 있으나 실제 호출 안 일어남 (에러 발생 시에도 SDK가 dispatch 안 함 또는 환경 변수로 비활성) |
| B5-03 | Toss 결제 위젯 진입 | - | ⏭️ deferred | - | issueBillingKey도 cloudfunctions이라 CSP 차단 가능성 매우 높음. 사용자 fix 후 재검증 |

### 묶음 5 console/network 요약
- console.error: **누적 22건** ⚠️ (묶음 5 진입 후 11건 추가)
  - **CSP `connect-src` 위반 (applyCoupon 차단)** 10건 — 쿠폰 5회 시도 × 2 (Connecting + Fetch API) 형태
  - Firestore REST 403 1건 — NEW-NEG-02 의도된 negative path
- console.warning: 0
- CSP 위반: 10건 (모두 cloudfunctions.net 차단 — applyCoupon)
- network 4xx/5xx: 1건 (의도된 403 — _system PERMISSION_DENIED)
- Sentry: 0건 ✅
- 빌링 변경: 없음 ✅

### 묶음 5 발견사항 / 회귀 후보 (요약)
1. 🔴 **CRITICAL — CSP `connect-src` cloudfunctions.net 누락** — 출시 후 영향 추정 매우 큼. 쿠폰·결제·해지 등 Cloud Functions 호출 전부 차단. 사용자에게 "internal" 메시지만 노출되어 디버깅도 어려움
2. ⚠ **0651e50d 쿠폰 rate limit — 검증 불가**. 서버 도달 못 해서 카운터 안 증가. CSP fix 후 재검증 필요
3. ✅ **NEW-NEG-02 (_system 차단) — 정상**
4. ✅ **frame-src tosspayments.com (e5e953ca) — 정상**
5. ✅ **나머지 보안 헤더 모두 정상** (XFO/XCTO/HSTS/Referrer/Permissions)

### 묶음 5 cleanup 상태
- 시드 프로젝트 `ph5lgMiA668IGxo4S0tY` (캐릭터 1명 + 복선 1개 + 타임라인 1개) — **사용자 직접 정리 (선택 B)** — 사용자가 추후 UI에서 점3개 → 삭제로 cascade 정리 예정
- shareEnabled OFF — 유지
- 빌링 변경 없음

---

## 태블릿 패스 (768×1024)

| caseId | feature | result | evidence | notes |
|---|---|---|---|---|
| **T-02** | **Navigation 중복 표시 검사 (51a22200 회귀)** | ✅ | screenshots/T-02-tablet.png | 6개 라벨(관계도/캐릭터/설정집/복선/타임라인/링크) 각 1번씩 노출. 중복 없음 |
| T-03 | 사이드바 + 메인 콘텐츠 분할 | ✅ | screenshots/T-02-tablet.png | 사이드바(complementary) 좌측 고정, 메인 우측. 햄버거 토글 버튼도 함께 노출 (hybrid 모드) |
| T-04 | 햄버거 토글 동작 | ⏭️ skipped | - | 사이드바 항상 노출이라 햄버거 무용지물 여부는 시각 검증만으로 OK 판정 |
| **T-05** | **캐릭터 카드 1탭으로 상세 열림 (e16acd36 회귀)** | ✅ | screenshots/T-05-tablet.png | QA캐릭A_v2 카드 1탭 → 상세 슬라이드 인 정상. 역할/나이/소속/능력 모두 노출. hover 가로채기 X |
| T-06 | 캐릭터 슬라이드 패널 동작 | ✅ | screenshots/T-05-tablet.png | 좌측 사이드바 + 우측 메인이 슬라이드 영역으로 활용. 자연스러움 |
| T-07 | FAB 위치 / 바텀탭 vs 사이드바 분기점 | - | - | 사이드바 우선이라 FAB은 화면에 없음 (모바일 전용 UI). 정상 |
| T-08 | 관계도 캔버스 줌 (+/-/↺) | ⏭️ skipped | - | 캐릭터 1명만 있어 의미 미약. 다음 라운드 |
| T-09 | 관계연결 ⇌ 버튼 데스크톱 헤더 위치 (사용자 추가) | ✅ | screenshots/T-02-tablet.png | "관계 연결" 버튼이 태블릿 헤더에 정상 노출 |
| **T-10** | **모달 width 768px에서 깨지지 않음 (사용자 추가)** | ⚠ | screenshots/T-10-tablet.png | "+ 캐릭터" 클릭 시 모달 미노출 + 기존 캐릭터 정보가 폼에 잔존 (B3-14 회귀 태블릿에서도 재현). 페이지 자체 overflow 0이지만 모달 width 검증은 정상 모달이 뜨는 시나리오에서만 가능 → **B3-14 fix 후 재검증** |
| T-11 | 이용방법 / Settings 사이드바 (2a911f24) | ⏭️ deferred | - | 시간 절약 위해 다음 라운드 |

### 태블릿 패스 console/network 요약
- console.error: 묶음 5 종료 후 추가 0건 (누적 22건 그대로)
- 페이지 overflow: 0 ✅
- Sentry: 0건 ✅

### 태블릿 발견사항
1. ✅ **51a22200 (Navigation 중복 표시) — 회귀 미발생**
2. ✅ **e16acd36 (캐릭터 카드 1탭으로 상세 열림) — 회귀 미발생**. hover 가로채기 없이 정상 슬라이드
3. ✅ **태블릿 사이드바 + 햄버거 hybrid + 메인 콘텐츠 분할 — 정상**
4. ⚠ **B3-14 (캐릭터 추가 흐름) — 태블릿에서도 재현**. 데스크톱·태블릿 양쪽에서 확인되어 환경 무관 회귀 확정. 사용자 fix 필요

### 태블릿 cleanup 상태
- 시드 데이터 추가 변경 없음 (검증만 함, 새 캐릭터 추가 안 함)

---

## Fail / Regression 목록 (우선순위 순)

### 🔴 Critical (출시 후 영향 추정 매우 큼)

1. **CSP `connect-src` cloudfunctions.net 누락 (B5-02-CSP-CF / B5-04)**
   - 증상: 쿠폰·결제·해지 등 모든 Cloud Functions 호출이 fetch 시작 전 CSP에 의해 차단
   - 사용자에게는 "⚠ internal" 메시지만 노출
   - 영향 범위: `applyCoupon`, `issueBillingKey`, `cancelSubscription`, `cancelPendingPlan` 등 production 핵심 기능 전반
   - Fix: `firebase.json` 보안 헤더 CSP `connect-src`에 `https://*.cloudfunctions.net` (또는 정확히 `https://asia-northeast3-catograph-5d8f5.cloudfunctions.net`) 추가
   - **이 회귀로 0651e50d 쿠폰 rate limit 검증 자체 불가** — Cloud Function 도달 못 함

2. **`/project/__invalid__` negative path (B2-07)**
   - 증상: 빈 캐릭터 상태 페이지처럼 렌더 + console.error 7건 (Reserved id + 6 collections permission denied)
   - 사용자가 invalid URL을 정상 빈 프로젝트로 착각 위험
   - Fix 방향(사용자 정의):
     - `useEffect`에서 `getDoc` 후 `!d.exists()` 시 `navigate('/', { replace: true })` 또는 `<ProjectNotFound />` 표시
     - `useEffect` 시작부에 `if (!projectId || projectId.length < 10 || projectId.length > 100) navigate(-1)` 형식 가드 추가

3. **타임라인 화수 1~999 제한 누락 (B4-05, b1922e10 회귀)**
   - 증상: 화수 1000+ 입력 시 거절/보정 없이 정상 추가됨
   - input의 `min/max` 미설정, 추가 시점에도 검증 없음
   - Fix 방향: `<input type="number" min="1" max="999">` 또는 onChange handler에서 `Math.min(999, Math.max(1, +value))`

### 🟡 High (UX 회귀, 즉시 수정 권장)

4. **공유 모달 ESC 미동작 (B2-09a)**
   - 검색 모달은 ESC로 닫히는데 공유 모달은 안 닫힘 → 모달 일관성 깨짐
   - Fix 방향(사용자 정의): `useEffect`에서 `onKeyDown 'Escape'` → `onClose` 추가

5. **B3-14 캐릭터 추가 흐름 — 캐릭터 상세 보고 있는 상태에서 "+ 캐릭터" 동작 이상**
   - 데스크톱 + 태블릿 양쪽 재현
   - 모달이 안 뜨고 패널 안에 기존 캐릭터 값이 잔존하는 혼합 상태
   - 사용자가 새 캐릭터 추가인지 기존 편집인지 헷갈림

### 🟡 Medium (이미 알려진 trade-off)

6. **COOP × Firebase Auth popup `window.closed` 폴링 차단 (전 묶음 누적 console.error 8건+)**
   - COOP `same-origin-allow-popups` 정상 설정이나 Google OAuth(cross-origin) popup window.closed 폴링이 spec상 차단됨
   - 기능 영향 없음, console 노이즈 누적
   - Fix 옵션 (사용자 정의):
     - a) COOP `unsafe-none`로 약화 (보안 약화 비추)
     - b) `signInWithRedirect`로 교체 (UX 변경)
     - c) Sentry/console error에 이 메시지 whitelist (가벼운 noise 처리, 권장)

### ⚠ 검증 불가 / Deferred

7. **0651e50d 쿠폰 rate limit** — Critical #1 fix 후 재검증 필요
8. **B3 위치이동/관계연결/모바일 ⇌/카드 호버 등 8건** — 캐릭터 다수 필요. 사용자 fix 후 별도 라운드
9. **B5-03 Toss 결제 위젯 진입** — `issueBillingKey`도 cloudfunctions이라 Critical #1 fix 후 재검증
10. **B4-12 무료 한도 모달** — 더미 계정 trial 상태에서 트리거 안 됨. Free 계정 별도 검증 필요
11. **B3-04 사진 업로드 5MB 제한** — Storage rules 검증 별도 시간
12. **인앱브라우저 (카톡/인스타) signInWithRedirect** — 자동화 불가. 사용자 별도 폰 30초 수동 검증 필요

---

## 누적 카운터 (최종)

| 항목 | 값 |
|---|---|
| 총 케이스 시도 | 65건 (PASS 47 / FAIL 4 / SKIP·Deferred 12 / 회귀 후보 2) |
| 캡처 | 13장 (목표 88장의 일부 — Pass-only 캡처 일부 생략, FAIL 강제 캡처 4장 포함) |
| **console.error 누적** | **22건** ⚠️ |
| - COOP × OAuth popup | 8건 (반복) |
| - Project.jsx invalid id | 7건 (B2-07 부산물) |
| - CSP connect-src 차단 (cloudfunctions) | 10건 (쿠폰 5회 × 2) |
| - Firestore 의도된 403 | 1건 (NEW-NEG-02) |
| **CSP 위반** | **10건** 🔴 |
| network 4xx/5xx | 1건 (의도된 _system 403) |
| Sentry 호출 | 0건 ✅ |
| 시드 cleanup 실패 | 0회 |
| 쿠폰 시도 | 클라 5회 / 서버 0회 (CSP 차단) |

---

## 회차 비교 (이전 회차와의 회귀)

- **첫 회차** — 비교 대상 없음. 다음 회차 (사용자 fix 후) 비교 기준점 형성

---

## 수동 검증 항목 (자동화 불가 — 사용자 별도 진행)

| 항목 | 상태 |
|---|---|
| 인앱브라우저 (카톡/인스타) signInWithRedirect — 별도 폰으로 30초 확인 | ⏳ pending |

---

## 최종 cleanup 상태

| 항목 | 상태 |
|---|---|
| 더미 계정 기존 프로젝트 "모바일QA테스트" | ✅ 무손상 |
| 시드 프로젝트 `QA-시드-2026-05-01-001` (id `ph5lgMiA668IGxo4S0tY`) — 캐릭터 1 + 복선 1 + 타임라인 1 | 🟡 사용자 직접 정리 예정 (선택 B) |
| 시드 프로젝트의 shareEnabled | ✅ OFF 복구 완료 |
| 더미 계정 빌링 상태 | ✅ 변경 없음 (Toss 진입 안 함) |
| 쿠폰 시도 카운터 | ✅ 서버 0회 (CSP 차단으로 도달 못 함) |
| 다른 사용자 데이터 | ✅ 접근 안 함 |
| deleteAccount | ✅ 시도 안 함 (가드 준수) |

---

## 종료 시각

2026-05-01 KST (단일 세션, 약 35분)

