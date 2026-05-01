# Cartographic 기능명세서 v1.0
> 작성일: 2026-04-29  
> 대상: QA 테스터, 개발자  
> 서비스: https://catograph-5d8f5.web.app

---

## 목차
1. [서비스 개요](#1-서비스-개요)
2. [공통 규칙](#2-공통-규칙)
3. [인증](#3-인증)
4. [대시보드](#4-대시보드)
5. [프로젝트 - 캐릭터](#5-프로젝트--캐릭터)
6. [프로젝트 - 관계도](#6-프로젝트--관계도)
7. [프로젝트 - 복선](#7-프로젝트--복선)
8. [프로젝트 - 설정집](#8-프로젝트--설정집)
9. [프로젝트 - 타임라인](#9-프로젝트--타임라인)
10. [프로젝트 - 팬아트/링크](#10-프로젝트--팬아트링크)
11. [공유 기능](#11-공유-기능)
12. [요금제 & 결제](#12-요금제--결제)
13. [구독 상태 관리](#13-구독-상태-관리)
14. [자동결제 스케줄러](#14-자동결제-스케줄러)
15. [쿠폰](#15-쿠폰)
16. [회원 탈퇴](#16-회원-탈퇴)
17. [설정 페이지](#17-설정-페이지)
18. [무료 플랜 제한](#18-무료-플랜-제한)
19. [UI / 반응형](#19-ui--반응형)

---

## 1. 서비스 개요

| 항목 | 내용 |
|---|---|
| 서비스명 | Cartographic |
| 상호 | 히스티 |
| 대표 | 우연우 |
| 사업자등록번호 | 162-18-02499 |
| 통신판매업 신고번호 | 2026-서울광진-0758 |
| 전화 | 070-4509-0356 |
| 이메일 | histy.cartographic@gmail.com |
| 기술 스택 | React 18, Firebase 10 (Auth/Firestore/Storage/Functions), Toss Payments |

### 플랜 구성

| 플랜 | 요금 | 비고 |
|---|---|---|
| Free | 무료 | 기능 제한 있음 |
| Pro 월간 | 3,300원/월 | 자동결제 |
| Pro 연간 | 29,900원/년 | 25% 할인, 자동결제 |
| Enterprise | 맞춤 견적 | 이메일 문의 |

---

## 2. 공통 규칙

### 낙관적 업데이트 (Optimistic Update)
- 추가/수정/삭제 작업은 Firestore 응답을 기다리지 않고 로컬 state를 즉시 반영
- Firestore 저장 실패 시 콘솔 에러 출력 (현재 UI 롤백 미구현 — 추후 개선 대상)

### 데이터 로딩
- 프로젝트 내 모든 컬렉션(캐릭터, 복선, 설정집 등)은 `getDocs` 최초 1회 로드
- 실시간 구독(`onSnapshot`)은 대시보드(프로젝트 목록)에만 적용

### 정렬 기준
- 모든 목록: `order` 필드 우선, 없으면 `createdAt.seconds` 기준 오름차순

### 로그인 필요 페이지
- `/` (대시보드), `/project/:id`, `/settings`, `/pricing`
- 미로그인 시 `/login`으로 리다이렉트

---

## 3. 인증

### 3-1. 로그인
- Google OAuth 소셜 로그인만 지원
- 로그인 성공 시 대시보드(`/`)로 이동
- Firebase Auth 세션은 `browserLocalStorage` 영속성 (브라우저 재시작 후에도 유지)

### 3-2. 로그아웃
- 로그아웃 시 `/login`으로 이동
- Firebase Auth 세션 완전 삭제

### 3-3. 리다이렉트 후 인증 복원
- Toss 결제 페이지 리다이렉트 복귀 후 `auth.authStateReady()` 대기
- `authStateReady` 완료 후에도 `currentUser === null`이면 에러 처리

### 3-4. 예외
- 이미 로그인된 상태에서 `/login` 접근 시 `/`로 리다이렉트

---

## 4. 대시보드

### 4-1. 프로젝트 목록
- `onSnapshot`으로 실시간 반영 (다른 기기에서 생성/삭제 시 즉시 반영)
- 본인 소유 프로젝트만 표시 (`ownerId == uid`)
- 최신 생성 순 정렬

### 4-2. 프로젝트 생성
- 이름 입력 필수
- **Free 플랜**: 3개 초과 생성 시 업그레이드 모달 표시, 생성 차단
- **Pro 플랜**: 무제한 생성
- 생성 성공 시 목록에 즉시 반영

### 4-3. 프로젝트 삭제
- 2단계 확인 (첫 번째 클릭 → 확인 버튼 표시 → 두 번째 클릭)
- 삭제 대상: 프로젝트 문서 + 하위 컬렉션 전체 (캐릭터/관계/복선/설정집/타임라인/팬아트) + Storage 파일
- Firestore batch 삭제 (400개씩 청크)
- 삭제 후 목록에서 즉시 제거

### 4-4. 프로젝트 이름 수정
- 인라인 편집 또는 별도 입력
- 빈 이름 저장 불가

---

## 5. 프로젝트 - 캐릭터

### 5-1. 캐릭터 추가
- 이름 필수
- 태그, 메모, 사진 선택
- **Free 플랜**: 10명 초과 시 업그레이드 모달, 추가 차단
- 추가 후 즉시 목록 반영 (낙관적 업데이트)
- `order: Date.now()` 기본값

### 5-2. 캐릭터 수정
- 이름, 태그, 메모 수정 가능
- 수정 즉시 화면 반영

### 5-3. 사진 업로드
- 이미지 파일만 허용
- Storage 저장 경로: `characters/{charId}/photo`
- 기존 사진 교체 시 이전 파일 덮어쓰기

### 5-4. 캐릭터 삭제
- 2단계 확인
- 삭제 시 연관 데이터 cascade 처리:
  - **관계(relations)**: 해당 캐릭터가 fromId 또는 toId인 관계 삭제
  - **복선(foreshadows)**: 해당 캐릭터가 charIds에 포함된 항목에서 uid 제거
  - **Storage 사진**: 삭제 시도 (없으면 무시)
- 삭제 후 관계도, 복선 화면에도 즉시 반영

### 5-5. 캐릭터 순서 변경 (드래그)
- 리오더 모드 활성화 후 드래그
- 저장 시 각 캐릭터의 `order` 필드 업데이트 (0, 1, 2…)
- 저장 후 즉시 반영 (새로고침 불필요)

---

## 6. 프로젝트 - 관계도

### 6-1. 관계 추가
- 두 캐릭터 선택 (fromId, toId)
- 라벨, 색상 지정
- 중복 관계 허용 여부: 명세 확인 필요

### 6-2. 관계 수정
- 라벨, 색상 수정
- 즉시 캔버스에 반영

### 6-3. 관계 삭제
- 2단계 확인
- 삭제 즉시 캔버스에서 제거

### 6-4. 캔버스 노드 위치
- 드래그로 캐릭터 위치 이동
- 위치는 캐릭터 문서의 `position: {x, y}` 필드에 저장
- 저장 즉시 반영

---

## 7. 프로젝트 - 복선

### 7-1. 복선 추가
- 제목(title) 필수
- 언급 회차(mentions): 화수(숫자만) + 메모 복수 입력 가능
- 회수 여부(resolved) 토글
- 연결 캐릭터(charIds) 복수 선택
- **Free 플랜**: 15개 초과 시 업그레이드 모달, 추가 차단
- 추가 후 즉시 목록 반영

### 7-2. 복선 수정
- 제목, 언급 회차, 회수 여부, 연결 캐릭터 수정 가능
- 저장 즉시 반영

### 7-3. 복선 삭제
- 2단계 확인
- 삭제 즉시 목록에서 제거

### 7-4. 필터
- 전체 / 미회수 / 회수 완료 탭 전환
- 필터 전환 즉시 반영

### 7-5. 순서 변경 (드래그)
- 리오더 모드: 미회수/회수 완료 그룹 내에서 각각 드래그 가능
- 저장 후 즉시 반영 (orderedOpen/orderedClosed 초기화)
- **버그 수정 이력**: 리오더 모드 사용 후 새 복선 추가 시 즉시 표시되지 않던 문제 → 수정 완료

### 7-6. 화수 입력 제한
- 숫자만 입력 허용 (`/[^0-9]/g` 제거)
- 모바일: 숫자 키패드 표시 (`inputMode="numeric"`)

---

## 8. 프로젝트 - 설정집

### 8-1. 문서 추가
- 제목 입력
- **Free 플랜**: 5개 초과 시 업그레이드 모달, 추가 차단
- 추가 후 즉시 목록 반영

### 8-2. 문서 편집
- 내용(content) 편집
- 자동 저장 또는 명시적 저장 (구현 방식 확인 필요)

### 8-3. 문서 삭제
- 2단계 확인

### 8-4. 순서 변경
- 드래그 리오더, 저장 즉시 반영

---

## 9. 프로젝트 - 타임라인

### 9-1. 이벤트 추가
- **Free 플랜**: 15개 초과 시 업그레이드 모달, 추가 차단
- 추가 후 즉시 반영

### 9-2. 이벤트 수정 / 삭제
- 수정/삭제 즉시 반영
- 삭제: 2단계 확인

### 9-3. 캐릭터·복선 연결
- 이벤트에 캐릭터, 복선 연결 가능

### 9-4. 순서 변경
- 드래그 리오더, 저장 즉시 반영

---

## 10. 프로젝트 - 팬아트/링크

### 10-1. 링크 추가 / 수정 / 삭제
- 2단계 확인 후 삭제
- 추가/수정 즉시 반영

### 10-2. 순서 변경
- 드래그 리오더, 저장 즉시 반영

---

## 11. 공유 기능

### 11-1. 공유 링크 활성화
- 프로젝트 설정에서 공유 토글 ON/OFF
- ON 시 고유 공유 URL 생성 (`/shared/:projectId`)
- OFF 시 공유 URL 접근 불가 (404 또는 비공개 안내)

### 11-2. 공유 탭 설정
- 공유 링크에서 표시할 탭 선택 (캐릭터/관계도/복선/설정집/타임라인/팬아트)
- 선택한 탭만 공유 뷰에 표시

### 11-3. 공유 뷰 (읽기 전용)
- 모든 편집 기능 비활성화
- 추가/수정/삭제/리오더 버튼 미표시
- 데이터는 실제 프로젝트 데이터와 동일하게 표시
- 로그인 불필요

---

## 12. 요금제 & 결제

### 12-1. 요금제 페이지 표시 규칙

| 조건 | 표시 내용 |
|---|---|
| 신규 사용자 (trial 미사용) | "처음 30일은 무료로 체험해보세요" + "30일 무료로 시작하기" 버튼 + Pro 카드 상단 "30일 무료 체험" 배지 |
| 재구독자 (trial 사용 이력 있음) | "필요한 플랜을 선택하세요" + "구독 시작하기" 버튼 |
| 결제 실패 (past_due) | 상단 경고 배너 + "카드 재등록" 버튼 |
| 해지 예정 (cancelled + Pro 기간 중) | 상단 안내 배너 (기간 표시) |
| 현재 플랜 | "✦ 현재 플랜" 버튼 (비활성화) |
| 플랜 전환 예약 | "✓ 전환 예약됨" 버튼 (비활성화) + 취소 링크 |

### 12-2. 신규 사용자 판별 기준
다음 중 하나라도 해당하면 **재구독자** (즉시결제):
- `subscription.hasUsedTrial === true`
- `subscription.lastPaidAt` 존재
- `subscription.couponCode` 존재
- `subscription.cancelledAt` 존재

위 조건 모두 해당 없으면 **신규 사용자** (30일 trial).

### 12-3. 결제 플로우

```
[결제 버튼 클릭]
    ↓
[명시적 동의 모달 표시]
  - 신규: "30일 후 자동결제 안내"
  - 재구독: "오늘 즉시 결제 안내"
    ↓
[확인 클릭]
    ↓
[Toss SDK: requestBillingAuth 호출]
  - method: CARD
  - customerKey: user.uid
  - successUrl: /payment/success?orderId=...&amount=...&yearly=...
  - failUrl: /payment/fail
    ↓
[토스 카드 등록 페이지로 리다이렉트]
    ↓
[카드 등록 완료 → /payment/success?authKey=...&customerKey=... 리다이렉트]
    ↓
[auth.authStateReady() 대기]
    ↓
[issueBillingKey Cloud Function 호출]
  - authKey, customerKey, yearly, orderId 전달
    ↓
[Function 처리 완료]
    ↓
[성공: "결제 완료" 화면 → 3초 후 홈으로]
[실패: "결제 처리 중 문제가 생겼어요" 화면]
```

### 12-4. issueBillingKey 내부 처리

**① 중복 실행 방지**
- `lastOrderId === orderId`이면 즉시 `{ success: true, alreadyProcessed: true }` 반환
- Firestore 변경 없음

**② customerKey 검증**
- `customerKey !== uid`이면 `invalid-argument` 에러

**③ Toss 빌링키 발급**
- `POST /v1/billing/authorizations/{authKey}` 호출
- 실패 시 `internal` 에러, Firestore 변경 없음

**④ 신규/재구독 분기**

| 구분 | 처리 |
|---|---|
| 신규 (trial) | 즉시 결제 없음. status=trial, trialEndsAt=30일 후, hasUsedTrial=true |
| 재구독 (즉시결제) | `POST /v1/billing/{billingKey}` 즉시 호출 |

**⑤ 재구독 즉시결제 실패 시**
- 빌링키 cancel 시도 (`DELETE /v1/billing/authorizations/{billingKey}/cancel`)
- `internal` 에러 반환
- Firestore 변경 없음

**⑥ Firestore 저장 (성공 시)**
```
subscription: {
  status: "trial" | "active"
  plan: "monthly" | "yearly"
  amount: 3300 | 29900
  billingKey: "..."
  cardCompany: "..."
  cardNumber: "..."
  lastOrderId: orderId
  startedAt: serverTimestamp
  currentPeriodEnd: Date (trial: +30일, active: +1개월/년)
  trialEndsAt: Date | (삭제)
  hasUsedTrial: true  ← 영구 플래그
  lastPaidAt: serverTimestamp  ← 재구독자만
  // 이전 잔존 필드 삭제
  cancelledAt: DELETE
  lastFailedAt: DELETE
  lastFailReason: DELETE
  pendingPlan: DELETE
  couponCode: DELETE
  couponDays: DELETE
  couponLabel: DELETE
}
```

**⑦ payments 컬렉션 기록**

| 케이스 | type |
|---|---|
| 신규 trial | `trial_started` (amount=0) |
| 재구독 즉시결제 성공 | `recurring_first_payment` |

### 12-5. 결제 실패 페이지 (/payment/fail)
- Toss가 failUrl로 리다이렉트한 경우
- 안내 메시지 + 홈으로 버튼

### 12-6. 플랜 전환 예약
- 현재 구독 기간 중 다른 플랜으로 전환 예약
- `subscription.pendingPlan` 필드에 저장
- 다음 결제일에 billingScheduler가 pendingPlan 적용
- 예약 취소: `cancelPendingPlan` Function 호출 → pendingPlan 삭제
- 예약 가능 조건: Pro 구독 중 + cancelled/past_due/쿠폰 아님 + 현재 플랜과 다른 플랜

---

## 13. 구독 상태 관리

### 13-1. 구독 상태 정의

| status | 의미 | isPro() |
|---|---|---|
| `trial` | 무료 체험 중 | true (currentPeriodEnd > 현재) |
| `active` | 정상 구독 중 | true (currentPeriodEnd > 현재) |
| `cancelled` | 해지 예정 (기간 만료 전) | true (currentPeriodEnd > 현재) |
| `past_due` | 결제 실패 | false |
| `expired` | 만료 (쿠폰 만료 등) | false |
| null/없음 | Free 플랜 | false |

### 13-2. 구독 해지 (cancelSubscription)

**가능한 상태**: active, trial, past_due  
**불가능한 상태**: cancelled, expired, null → `failed-precondition` 에러

**처리 순서**:
1. Toss 빌링키 cancel (`DELETE /v1/billing/authorizations/{billingKey}/cancel`)
   - 실패해도 계속 진행 (console.warn 출력)
2. Firestore 업데이트:
   - `status: "cancelled"`
   - `cancelledAt: serverTimestamp`
   - `billingKey: DELETE`
   - `pendingPlan: DELETE`
   - `currentPeriodEnd` 유지 (기간까지 Pro 사용 가능)
3. payments 기록: `type: "subscription_cancelled"`

### 13-3. 상태 전이 다이어그램

```
신규 가입
  └→ [구독 시작] → trial
                    └→ [30일 후 자동결제 성공] → active
                    └→ [30일 후 자동결제 실패] → past_due
                    └→ [직접 해지] → cancelled

active
  └→ [정기결제 성공] → active (갱신)
  └→ [정기결제 실패] → past_due
  └→ [직접 해지] → cancelled

cancelled
  └→ [currentPeriodEnd 도래] → (isPro=false, Free처럼 동작)
  └→ [재구독] → active (즉시결제)

past_due
  └→ [카드 재등록 + 즉시결제 성공] → active
  └→ [직접 해지] → cancelled

쿠폰 적용 → active (plan=coupon)
  └→ [currentPeriodEnd 도래, billingScheduler] → expired
```

### 13-4. 웹훅 (tossWebhook)

- **IP 화이트리스트**: 토스 공식 IP 13개만 허용, 외 → 403
- **이벤트**: `PAYMENT_STATUS_CHANGED` + `status === "DONE"`
- **`auto_` prefix orderId**: billingScheduler가 이미 처리 → 스킵 (200 OK)
- **중복 수신 방지**: `lastOrderId === incomingOrderId` → 스킵 (200 OK)
- **pendingPlan**: 있으면 해당 플랜으로 전환 후 삭제
- **payments 기록**: `type: "webhook_payment"`

---

## 14. 자동결제 스케줄러 (billingScheduler)

### 14-1. 실행 조건
- 매일 오전 9시 (KST)
- 대상: `subscription.status == "active"` 또는 `"trial"` AND `subscription.currentPeriodEnd < todayEnd`
- `< todayEnd` 조건으로 누락된 과거 결제일도 처리

### 14-2. 처리 분기

**빌링키 없음 + couponCode 있음 (쿠폰 만료)**:
- `status: "expired"`, `expiredAt: serverTimestamp`
- payments: `type: "coupon_expired"`

**빌링키 없음 + couponCode 없음**:
- `console.warn` 후 skip

**빌링키 있음 (정상 처리)**:
- pendingPlan 있으면 해당 플랜, 없으면 현재 플랜 유지
- Toss 자동결제 호출: `POST /v1/billing/{billingKey}`

### 14-3. 결제 성공 시
```
subscription.status: "active"
subscription.plan: newPlan
subscription.currentPeriodEnd: 이전 결제일 기준 +1개월 또는 +1년  ← drift 방지
subscription.lastPaidAt: serverTimestamp
subscription.lastOrderId: "auto_{uid}_{timestamp}"
subscription.pendingPlan: DELETE
subscription.lastFailedAt: DELETE
subscription.lastFailReason: DELETE
```
payments: `type: "auto_billing"`, paymentKey, receiptUrl 포함

### 14-4. 결제 실패 시
```
subscription.status: "past_due"
subscription.lastFailedAt: serverTimestamp
subscription.lastFailReason: 에러 메시지
```
payments: `type: "auto_billing_failed"`, errorCode, errorMessage 포함

### 14-5. nextPeriodEnd 계산 방식
- **기준**: `currentPeriodEnd` (현재 결제일 기준)
- 월간: `base.setMonth(base.getMonth() + 1)`
- 연간: `base.setFullYear(base.getFullYear() + 1)`
- 결제 시각 기준이 아닌 결제일 기준 → 날짜 drift 없음

---

## 15. 쿠폰

### 15-1. 쿠폰 구조 (Firestore `coupons` 컬렉션)

| 필드 | 설명 |
|---|---|
| isActive | 활성화 여부 |
| expiresAt | 쿠폰 자체 만료일 (Timestamp) |
| maxUses | 최대 사용 횟수 |
| usedCount | 현재 사용 횟수 |
| usedBy | 사용한 uid 배열 |
| durationDays | 구독 기간 (일) |
| label | 표시용 라벨 |

### 15-2. 쿠폰 적용 가능 조건 (모두 충족해야 함)
- 쿠폰 코드 존재
- `isActive === true`
- `expiresAt` 미도래 또는 없음
- `usedCount < maxUses`
- `usedBy`에 현재 uid 없음 (1인 1회)
- 현재 구독 상태가 Pro가 아님 (active/trial/cancelled-기간내 모두 차단)

### 15-3. 오류 메시지

| 조건 | 메시지 |
|---|---|
| 코드 없음 | "유효하지 않은 쿠폰 코드예요." |
| isActive=false | "사용할 수 없는 쿠폰 코드예요." |
| expiresAt 지남 | "기간이 만료된 쿠폰 코드예요." |
| usedCount 소진 | "이미 모든 사용 횟수가 소진된 쿠폰이에요." |
| 중복 사용 | "이미 사용한 쿠폰 코드예요." |
| trial 중 | "무료 체험 중에는 쿠폰을 사용할 수 없어요. 체험 종료 후 다시 시도해 주세요." |
| 구독 중 | "이미 구독 중이에요. 현재 구독이 만료된 후 사용할 수 있어요." |

### 15-4. 쿠폰 적용 처리 (Firestore 트랜잭션)
- `coupons` + `users` 동시 읽기 → 검증 → 동시 쓰기
- 트랜잭션으로 동시 사용 방지 (마지막 1회 남은 쿠폰에 2명 동시 접근 시 1명만 성공)

### 15-5. 쿠폰 적용 후 Firestore
```
subscription: {
  status: "active"
  plan: "coupon"
  couponCode: code
  couponDays: durationDays
  couponLabel: label
  currentPeriodEnd: now + durationDays
  startedAt: serverTimestamp
  // 이전 잔존 필드 삭제
  billingKey: DELETE
  cardCompany: DELETE
  cardNumber: DELETE
  lastOrderId: DELETE
  lastPaidAt: DELETE
  cancelledAt: DELETE
  lastFailedAt: DELETE
  lastFailReason: DELETE
  pendingPlan: DELETE
  amount: DELETE
}
```
payments: `type: "coupon_applied"`

---

## 16. 회원 탈퇴

### 16-1. 처리 순서
1. 본인 소유 프로젝트 목록 조회
2. 프로젝트별 캐릭터 사진 Storage 삭제 (없으면 무시)
3. 하위 컬렉션 일괄 삭제 (characters, relations, foreshadows, worldDocs, timelineEvents, fanworks) — batch 400개 청크
4. 프로젝트 문서 삭제
5. Toss 빌링키 cancel (billingKey 있는 경우) — 실패해도 계속 진행
6. `users/{uid}` 문서 삭제
7. Firebase Auth 계정 삭제

### 16-2. 예외 처리
- 빌링키 cancel 실패: catch 후 계속 진행 (탈퇴는 완료)
- Storage 파일 없음: catch 후 무시

### 16-3. 탈퇴 후
- Firebase Auth 세션 삭제 → 자동 로그아웃
- 모든 Firestore 데이터 삭제 확인

---

## 17. 설정 페이지

### 17-1. 구독 상태 표시

| 상태 | 표시 |
|---|---|
| trial | "무료 체험 중" + 체험 종료일 + 해지 버튼 |
| active | "Pro 구독 중" + 다음 결제일 + 카드 정보 + 해지 버튼 |
| cancelled | "해지 예정" + 만료일 + 재구독 버튼 |
| past_due | "결제 실패" + 카드 재등록 버튼 |
| 쿠폰(coupon) | 쿠폰 라벨 + 만료일 (해지 버튼 없음 또는 별도 처리) |
| Free | 구독 없음 + 업그레이드 버튼 |

### 17-2. 쿠폰 입력
- trial 중 쿠폰 입력 시 에러: "무료 체험 중에는 쿠폰을 사용할 수 없어요"
- Pro 구독 중 쿠폰 입력 시 에러: "이미 구독 중이에요"

### 17-3. 플랜 전환 예약
- active 상태에서 다른 플랜으로 전환 예약 가능
- 예약 후 다음 결제일에 자동 적용
- 예약 취소 가능

---

## 18. 무료 플랜 제한

| 항목 | Free 한도 | Pro |
|---|---|---|
| 프로젝트 | 3개 | 무제한 |
| 캐릭터 | 10명 | 무제한 |
| 설정집 문서 | 5개 | 무제한 |
| 복선 | 15개 | 무제한 |
| 타임라인 이벤트 | 15개 | 무제한 |
| 팬아트/링크 | 제한 없음 | 무제한 |

### 제한 초과 시 동작
- 업그레이드 유도 모달 표시
- 항목 추가 동작 차단
- 기존 데이터는 유지 (초과 후 Pro → Free 다운그레이드 시에도 삭제 안 됨)

---

## 19. UI / 반응형

### 19-1. 모달 패턴
- `window.confirm`, `window.alert` 사용 안 함
- 커스텀 모달 (`confirmModal` state) 사용
- 배경 클릭 시 모달 닫힘
- 내부 클릭 시 이벤트 전파 차단 (`stopPropagation`)

### 19-2. 토스트 알림
- 성공/오류 구분 (색상 다름)
- 4초 후 자동 소멸
- 화면 하단 중앙 고정

### 19-3. 삭제 확인 패턴 (2단계)
- 첫 번째 클릭: "삭제" 버튼 → 확인 버튼으로 전환
- 두 번째 클릭: 실제 삭제 실행
- 다른 곳 클릭 시 첫 번째 상태로 복원

### 19-4. 반응형
- 모바일에서 사이드바 숨김
- 하단 탭 네비게이션 표시
- 리오더 버튼 모바일에서 미표시

### 19-5. 브라우저 캐시 정책
- `index.html`: `no-cache, no-store, must-revalidate`
- `*.js`, `*.css`: `public, max-age=31536000, immutable` (콘텐츠 해시 파일명)

---

## 부록 A. payments 컬렉션 type 목록

| type | 발생 시점 |
|---|---|
| `trial_started` | 신규 사용자 빌링키 발급 (trial 시작) |
| `recurring_first_payment` | 재구독자 즉시결제 성공 |
| `auto_billing` | billingScheduler 자동결제 성공 |
| `auto_billing_failed` | billingScheduler 자동결제 실패 |
| `webhook_payment` | 토스 웹훅 경유 결제 성공 |
| `subscription_cancelled` | 구독 해지 |
| `coupon_applied` | 쿠폰 적용 |
| `coupon_expired` | 쿠폰 만료 (billingScheduler) |

---

## 부록 B. Firestore subscription 필드 목록

| 필드 | 타입 | 설명 |
|---|---|---|
| status | string | trial/active/cancelled/past_due/expired |
| plan | string | monthly/yearly/coupon |
| amount | number | 3300 또는 29900 |
| billingKey | string | 토스 빌링키 |
| cardCompany | string | 카드사명 |
| cardNumber | string | 카드번호 (마스킹) |
| currentPeriodEnd | Timestamp | 구독 만료일 / 다음 결제일 |
| trialEndsAt | Timestamp | 무료 체험 종료일 (trial만) |
| hasUsedTrial | boolean | trial 사용 여부 (영구 플래그) |
| startedAt | Timestamp | 구독 시작일 |
| lastPaidAt | Timestamp | 마지막 결제 성공일 |
| lastOrderId | string | 마지막 처리된 orderId (중복 방지) |
| cancelledAt | Timestamp | 해지 요청일 |
| lastFailedAt | Timestamp | 마지막 결제 실패일 |
| lastFailReason | string | 마지막 결제 실패 사유 |
| pendingPlan | string | 다음 결제일 적용 예약 플랜 |
| couponCode | string | 적용된 쿠폰 코드 |
| couponDays | number | 쿠폰 기간 (일) |
| couponLabel | string | 쿠폰 표시용 라벨 |
