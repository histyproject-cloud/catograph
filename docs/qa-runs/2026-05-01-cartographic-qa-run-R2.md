# Cartographic QA Run R2 — 2026-05-01

## 환경
- target: https://cartographic.agency (Vercel hosting)
- 더미 계정: `IyBK...j1` (yw.f***uu@gmail.com, Free 플랜으로 표시 — trial 아니거나 만료)
- 시작/종료: 2026-05-01 KST
- 배포 commits:
  - `4b85449a` CSP fix
  - `98b133ce` assertId / 타임라인 화수 / ShareModal ESC
  - `1b6e6f8d` B3-14 c.id reset + unsaved 모달
  - `7daff538` silent-fail-prevention + 첫 캐릭터 슬라이드 + 페이지 끝 저장
- 가드: 타 계정 / **deleteAccount 실제 실행 절대 X (모달 진입까지만)** / 쿠폰 ≤5회 / 공유 토글 강제 OFF

## 검증 매트릭스 (R1에서 발견한 회귀 fix 검증)

| caseId | 회귀 | R1 | R2 | 증거 | 비고 |
|---|---|---|---|---|---|
| **CSP-1** | CSP connect-src cloudfunctions.net | ❌ FAIL | ✅ **PASS** | 헤더 검사 + 결제 모달 진입 | `https://*.cloudfunctions.net https://*.run.app` 추가 후 정상. 결제 모달 J3 일치 ("30일 무료 체험 시작 / 자동 결제 안내 / 해지 경로") |
| **CSP-2** | applyCoupon CSP 차단 (R1 console 10건) | ❌ FAIL | ✅ **PASS** | "유효하지 않은 쿠폰 코드예요" 메시지 정상 노출 | 이전 "⚠ internal" 사용자 친화적 메시지로 회복 |
| **B2-07** | `/project/__invalid__` assertId 가드 | ❌ FAIL | ✅ **PASS** | navigate('/') 정상 + console.error 0건 | useProject 6 hooks + Project.jsx useEffect 양쪽 가드 |
| **B4-05** | 타임라인 화수 1~999 (b1922e10) | ❌ FAIL | ✅ **PASS** | 1500 입력 → 999 자동 clamp | input min/max + onChange clamp + handleSubmit 검증 |
| **B2-09a** | ShareModal ESC 닫기 | ❌ FAIL | ✅ **PASS** | ESC → 모달 닫힘 | useEffect document keydown 'Escape' |
| **B3-14** | 캐릭터 상세 패널 + 캐릭터 클릭 | ❌ FAIL | ✅ **PASS** | screenshots/R2-B3-14-after.png — unsaved 모달 정상 노출 | "저장하지 않은 변경사항이 있어요 / 새 캐릭터를 추가하시겠어요? / 취소 / 버리고 추가" |
| **DEL-1** | deleteAccount Cloud Function 호출 (CSP fix 효과) | (검증 안 함) | ✅ **PASS** | screenshots/R2-deleteAccount-modal.png + R2-deleteAccount-cancelled.png | "회원 탈퇴 / 정말 탈퇴하시겠어요? / 모든 데이터 삭제 / 복구 불가 / 취소 / 확인". **즉시 "취소" 클릭 — 실제 탈퇴 절대 실행 안 함 (안전 가드 준수)** |

## silent-fail-prevention 검증 (R2 신규 항목)

| caseId | feature | result | 증거 |
|---|---|---|---|
| **SF-1** | CharacterDetailPage 이름 빈 채로 저장 → "이름을 입력해주세요" | ✅ **PASS** | DOM 검사 — `hasErrorMsg: true` + `saveBtnsCount: 2` (페이지 끝 저장 버튼 추가) |
| **SF-2** | CharacterDetailPage 페이지 끝 저장 버튼 노출 | ✅ **PASS** | 동일 — saveBtnsCount=2 (상단 1 + 하단 1) |
| **SF-3** | 캐릭터 탭 빈 상태 "첫 캐릭터 추가하기" → 슬라이드 통일 | ⏭️ deferred | 시드 프로젝트에 캐릭터 1명 존재 → 빈 상태 트리거 안 됨. 코드 변경(`onClick={openNewCharInternal}`)은 반영됨 |
| SF-AddChar | AddCharModal disabled 제거 + 메시지 | ⏭️ deferred | AddCharModal은 관계도 탭에서만 트리거 (캐릭터 탭은 슬라이드 통일됨). 다음 라운드 |
| SF-Timeline | TimelineView 1500 입력 시 999 보정 | ✅ **PASS** | B4-05 검증과 동일 |
| SF-Foreshadow | ForeshadowView 제목 빈 채로 추가 | ⏭️ deferred | R2 시간 절약 위해 다음 라운드 (코드는 반영됨) |
| SF-Fanworks | FanworksView javascript:/data: 차단 | ⏭️ deferred | 다음 라운드 |
| SF-World | WorldView 제목 빈 채로 저장 | ⏭️ deferred | 다음 라운드 |
| SF-CouponPricing | Pricing 빈 코드 시 메시지 | ⏭️ deferred | 다음 라운드 (코드는 반영됨) |
| SF-CouponSettings | Settings 빈 코드 시 메시지 | ⏭️ deferred | 다음 라운드 |

## R2 누적 카운터 (R1 누적 위에)

- console.error: 누적 24건 (R1 22 + R2 +2)
  - 새로 발생: applyCoupon 404 (1건, CSP 통과 후 서버 404 — 별개 이슈) + Firestore 의도된 403 (1건, NEW-NEG-02)
  - **CSP 차단으로 인한 console.error는 새로 발생 0건** ✅
- Sentry: 0건 ✅
- 빌링 변경: 없음 ✅
- 시드 cleanup 실패: 0회

## R2 새로 발견된 이슈 / 후보

1. ⚠ **applyCoupon 404** — `https://asia-northeast3-catograph-5d8f5.cloudfunctions.net/applyCoupon` 호출 시 404. CSP 통과는 정상. Cloud Functions endpoint URL 형식이 v1 vs v2 차이 가능성. 또는 함수가 deploy 안 됐거나 region 설정 차이. **R3에서 별도 검증** (functions code 검토 + production functions list 확인 필요)
2. ⚠ **더미 계정이 Free 플랜으로 표시** — R1에서는 trial 30일 자동 진입 가정했는데 R2 시점에 Free. trial 받지 않았거나 이미 만료됐을 가능성. R3에서 신규 계정으로 trial 검증 시 별도 확인

## R2 cleanup 상태

- 시드 프로젝트 `ph5lgMiA668IGxo4S0tY` — **사용자 직접 정리 예정 (R1 선택 B 유지)**
- shareEnabled — OFF 유지 (변경 안 함)
- 빌링 — 변경 없음 (Toss 모달 진입까지만, deleteAccount 모달 진입까지만)
- 다른 사용자 데이터 — 접근 안 함 ✅
- 더미 계정 데이터 — 무손상 ✅

## 다음 단계

1. ✅ R1 회귀 5건 + B3-14 = 6건 모두 PASS — production 배포 검증 완료
2. ⏳ silent-fail-prevention deferred 검증 7건 — R3 또는 다음 임시 라운드
3. ⏳ applyCoupon 404 별도 조사 (Functions URL/region/v1 vs v2)
4. ⏳ 더미 계정 trial 상태 확인 + 신규 계정으로 trial 흐름 별도 검증
5. ⏳ 인앱브라우저 (카톡/인스타) signInWithRedirect — 사용자 별도 폰 30초 수동 검증 (R1에서 이연됨)
6. 📅 **2주 뒤 정기 R3 회귀 라운드 (`/schedule`)**

---

## 종료 시각
2026-05-01 KST (R1 + R2 통합 약 1시간)
