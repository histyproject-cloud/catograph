# 🧪 Cartographic QA 체크리스트 v1.0

> 출시 전 종합 검증 체크리스트
> 검증 방법 + Firebase 콘솔 확인 포인트 포함
> 마지막 업데이트: 2026-04-29

---

## A. 인증 & 회원가입

| # | 항목 | 검증 방법 | DB 확인 |
|---|---|---|---|
| A1 | 신규 Google 로그인 | 처음 사용자 로그인 시 ConsentModal 표시 | `users/{uid}` 문서 생성 (createdAt만 있음) |
| A2 | 동의 모달 — 필수 동의 안 누르면 "시작" 비활성 | 이용약관 OR 개인정보만 체크 시 버튼 disabled | - |
| A3 | 동의 완료 | 모든 필수 + (선택) 마케팅 체크 → 시작 | `users/{uid}.consentAt`, `agreedToTerms`, `agreedToPrivacy`, `marketingConsent`, `consentVersion` 저장 |
| A4 | 동의 후 온보딩 모달 표시 | 첫 로그인 시 자동 표시 | `onboardingDone: true` 저장 시점 확인 |
| A5 | 로그아웃 → 재로그인 | 동의/온보딩 모달 재표시 안 됨 | consentAt, onboardingDone 유지 |
| A6 | 다른 계정으로 로그인 | 다른 사용자 데이터 안 보임 | Firestore rules로 차단 |
| A7 | 로그인 안 된 상태 → /project/xxx | /login으로 리다이렉트 | - |
| A8 | 로그인 안 된 상태 → /shared/xxx | 접근 가능 (공유 링크 켜진 경우) | shareEnabled 체크 |
| A9 | 인앱브라우저 (카카오톡 내부) 로그인 | signInWithRedirect 동작 | 정상 로그인 |
| A10 | Google 계정 거부/팝업 닫기 | 에러 메시지 X (조용히 무시) | - |

---

## B. 프로젝트 (Dashboard)

| # | 항목 | 검증 방법 | DB 확인 |
|---|---|---|---|
| B1 | 프로젝트 생성 | "+ 새 작품" → 이름 입력 → 만들기 | `projects/{id}` 문서 생성, ownerId 일치 |
| B2 | 프로젝트 진입 | 카드 클릭 → /project/:id | - |
| B3 | 프로젝트 이름 변경 | 점3개 메뉴 → 제목 수정 | `projects/{id}.name` 갱신 |
| B4 | 프로젝트 삭제 | 점3개 → 삭제 → 확인 모달 → 정말 삭제 | `projects/{id}` 및 모든 하위(`characters`, `relations`, `foreshadows`, `worldDocs`, `timelineEvents`, `fanworks`) cascade 삭제 |
| B5 | 무료 플랜 한도 (3개) | 4번째 생성 시도 | UpgradeModal 표시 |
| B6 | Pro 플랜 무제한 | 4개 이상 생성 가능 | - |
| B7 | 헤더 점3개 메뉴 외부 클릭 | 메뉴 자동 닫힘 | - |
| B8 | 빈 상태 (프로젝트 0개) | "첫 작품 시작" 화면 + 기능 소개 6개 카드 | - |

---

## C. 캐릭터

| # | 항목 | 검증 방법 | DB 확인 |
|---|---|---|---|
| C1 | 캐릭터 추가 | 헤더 "+ 캐릭터" → 모달 → 입력 → 추가 | `characters/{id}` 생성, `order: Date.now()`, projectId 일치 |
| C2 | 무료 한도 (10명) | 11번째 시도 | UpgradeModal |
| C3 | 캐릭터 카드 클릭 → 상세 | CharacterDetailPage 슬라이드 인 | - |
| C4 | 사진 업로드 | 라벨 클릭 → 파일 선택 (이미지) | Storage `characters/{charId}/photo`, `characters/{id}.photoURL` 갱신 |
| C5 | 사진 5MB 초과 | Storage rules 거부 | 콘솔 에러 |
| C6 | 사진 외 파일 (PDF 등) | Storage rules 거부 (`contentType.matches('image/.*')`) | - |
| C7 | 사진 삭제 | "삭제" 텍스트 버튼 | Storage 객체 삭제, photoURL '' |
| C8 | 사진 위치 (상단/중앙/하단) | 3개 버튼 클릭 | `photoPosition` 업데이트 |
| C9 | 캐릭터 정보 수정 → 저장 | 이름·역할·태그 등 변경 → "저장" | Firestore 갱신 + "✓ 저장됨" 토스트 |
| C10 | 캐릭터 삭제 (상세 페이지) | "삭제" → "정말 삭제" 인라인 확인 | Firestore 삭제 + 연결된 relations 삭제 + foreshadows.charIds 정리 |
| C11 | 캐릭터 삭제 (카드 호버) | 마우스 오버 → 빨간 삭제 버튼 → 인라인 확인 | 동일 |
| C12 | 캐릭터 검색 (이름/역할/태그) | 헤더 돋보기 → 입력 | 결과 즉시 필터링 |
| C13 | 드래그 순서 변경 | "⠿ 위치 수정" → 드래그 → 종료 | `order` 필드 0,1,2... 갱신 |
| C14 | 캐릭터 카드 이름·역할 긴 텍스트 | "Captain Steel of the Northern Galaxy Kingdom" 입력 | ellipsis 처리 |

---

## D. 관계도

| # | 항목 | 검증 방법 | DB 확인 |
|---|---|---|---|
| D1 | 캐릭터 위치 드래그 | 캔버스에서 드래그 | `characters/{id}.position` 갱신 |
| D2 | 관계 연결 | "관계 연결" → 시작 캐릭터 → 대상 캐릭터 → 모달 | `relations/{id}` 생성 |
| D3 | 관계 라벨 입력 | 모달 input + 색상 선택 | label, color 저장 |
| D4 | 관계선 클릭 (편집/삭제) | 선 클릭 → 팝업 | - |
| D5 | 관계 삭제 | 팝업 "삭제" → 확인 | Firestore 삭제 |
| D6 | 캐릭터 삭제 시 관계도 동기화 | 한쪽 캐릭터 삭제 | 관련 relations 모두 사라짐 |
| D7 | 모바일/태블릿 줌 | 핀치/+−↺ 버튼 | 정상 |
| D8 | 라벨 한글 박스 | "절친한 친구" 입력 | 박스가 텍스트보다 작지 않음 |
| D9 | 관계도 → 캐릭터 카드 클릭 | DetailPanel 우측 슬라이드 | - |

---

## E. 세계관 (WorldDocs)

| # | 항목 | 검증 방법 | DB 확인 |
|---|---|---|---|
| E1 | 새 문서 만들기 | "+ 새 문서" | `worldDocs/{id}` 생성 |
| E2 | 무료 한도 (5개) | 6번째 시도 | UpgradeModal 표시, **addNew가 null 가드로 안 죽음** |
| E3 | 문서 작성 | 제목/내용 입력 → 저장 | Firestore 갱신 |
| E4 | 미저장 상태 표시 | 입력 후 "저장되지 않은 변경사항" 표시 | - |
| E5 | 미저장 상태에서 ← 목록 클릭 | 경고 모달 표시 | - |
| E6 | 문서 삭제 | "삭제" → "정말 삭제" 인라인 | Firestore 삭제 |
| E7 | 드래그 순서 변경 | reorderMode → 드래그 | `order` 갱신 |

---

## F. 복선 (Foreshadows)

| # | 항목 | 검증 방법 | DB 확인 |
|---|---|---|---|
| F1 | 복선 추가 | "+ 복선 추가" → 제목 + 회수 토글 + 캐릭터 연결 | `foreshadows/{id}` 생성 |
| F2 | 무료 한도 (15개) | 16번째 시도 | UpgradeModal |
| F3 | 회수 인라인 토글 | FSCard의 토글 스위치 클릭 | `resolved` 필드 갱신 |
| F4 | 회수 완료 시 회수 완료 섹션으로 이동 | 토글 후 자동 분류 | UI 즉시 반영 |
| F5 | 미회수/회수완료 필터 | 상단 3개 버튼 | - |
| F6 | 구버전 데이터 호환 | `resolvedEp` 필드만 있는 데이터 | "회수 완료"로 표시 |
| F7 | 언급 회차 다중 추가 | 1화/3화/7화 | mentions 배열 |
| F8 | 캐릭터 연결 | 태그 클릭으로 토글 | charIds 배열 |
| F9 | 복선 삭제 | "삭제" → "정말 삭제" | Firestore |
| F10 | 캐릭터 삭제 시 복선 charIds 정리 | 캐릭터 1명 삭제 | 그 캐릭터 빠진 charIds로 update |

---

## G. 타임라인

| # | 항목 | 검증 방법 | DB 확인 |
|---|---|---|---|
| G1 | 이벤트 추가 | "+ 타임라인 추가" → 화수, 제목, 설명, 등장인물 | `timelineEvents/{id}` 생성 |
| G2 | 무료 한도 (15개) | 16번째 | UpgradeModal |
| G3 | 펼치기/접기 | 카드 클릭 | UI 토글 |
| G4 | 등장인물 칩 | DetailPanel '등장 화수'와 양방향 연동 | - |
| G5 | 이벤트 삭제 | 인라인 확인 | Firestore |
| G6 | 화수별 정렬 | episode 오름차순 | - |
| G7 | 긴 제목 ellipsis | "엄청 긴 이벤트 제목 ..." | `...` 처리 |

---

## H. 링크 (Fanworks)

| # | 항목 | 검증 방법 | DB 확인 |
|---|---|---|---|
| H1 | 링크 추가 | "+ 링크 추가" → 제목/URL/타입/작가 | `fanworks/{id}` |
| H2 | 링크 클릭 → 외부 이동 | 새 탭 | - |
| H3 | 수정/삭제 | 인라인 | - |
| H4 | 작가명 ellipsis | 매우 긴 작가명 | maxWidth 120 ellipsis |
| H5 | 드래그 순서 변경 | reorderMode 진입/종료 시 onSaveOrder 호출 | `order` 갱신 |

---

## I. 공유 기능

| # | 항목 | 검증 방법 | DB 확인 |
|---|---|---|---|
| I1 | 공유 모달 열기 | 헤더 "공유" 버튼 | - |
| I2 | 공유 활성화 토글 | "공유" 모달 → 토글 | `projects/{id}.shareEnabled = true` |
| I3 | 공유 탭 선택 — 전체 | 라디오: 전체 공유 | `shareTab: 'all'` |
| I4 | 공유 탭 선택 — 현재 탭만 | 라디오: 현재 탭만 (URL에 ?tab=xxx) | `shareTab: 'current'` (URL 파라미터로만) |
| I5 | 공유 탭 — 캐릭터/세계관/복선/타임라인 개별 | 각 탭만 | `shareTab` 저장됨 |
| I6 | 공유 링크 복사 | "링크 복사" 클릭 → "✓ 복사됨" 토스트 | 클립보드에 URL 들어감 |
| I7 | 공유 링크 — 시크릿창에서 접속 | 로그인 안 한 상태에서 URL 열기 | 데이터 표시됨 |
| I8 | 공유 비활성화 후 링크 | shareEnabled false 상태에서 접근 | "공유되지 않은 프로젝트" 페이지 |
| I9 | 공유 페이지 — 캐릭터 탭 | 카드 클릭 → 모달 상세 | 정상 |
| I10 | 공유 페이지 — 세계관 탭 | 좌측 목록 → 우측 본문 | 긴 제목 ellipsis 처리 |
| I11 | 공유 페이지 — 복선 탭 | 미회수/회수완료 섹션 분리 | resolved/resolvedEp 호환 |
| I12 | 공유 페이지 — 타임라인 탭 | 화수 순 정렬 + 펼치기 | 등장인물 표시 |
| I13 | 공유 페이지 — 링크 탭 | 외부 링크 열기 가능 | - |
| I14 | 이미지 캡처 다운로드 — 링크 탭 | 모드 전환 → "이미지로 저장" | PNG 파일 다운로드 |
| I15 | 캡처 실패 처리 | DOM 오류 시 | "이미지 저장에 실패했어요" 인라인 표시 (alert 아님) |
| I16 | 공유 페이지 모바일 반응형 | 375px / 768px / 1280px | 정상 |
| I17 | 공유 페이지 다크/라이트 | localStorage theme 따라 표시 | - |

---

## J. 결제 (신규 사용자 — Trial 30일)

| # | 항목 | 검증 방법 | DB 확인 |
|---|---|---|---|
| **J1** | Pricing 진입 시 "30일 무료 체험" 배지 표시 | 신규 계정 (hasUsedTrial 없음) | - |
| **J2** | "30일 무료로 시작하기" 버튼 → 확인 모달 | "30일 무료 체험 시작" 제목 | - |
| **J3** | 모달 내용: "30일 후 자동 결제" 안내 | 명시적 동의 후 결제창 | - |
| **J4** | 토스 결제창 → 카드 등록 (즉시 청구 X) | 카드 등록만 | 카드 청구액 0원 |
| **J5** | PaymentSuccess → "결제 완료" 표시 | "결제 완료됐어요!" | - |
| **J6** | DB 확인 | Firebase 콘솔 → users/{uid}.subscription | `status: 'trial'`, `currentPeriodEnd = 30일 후`, `trialEndsAt = 같음`, `hasUsedTrial: true`, `billingKey` 존재 |
| **J7** | payments 컬렉션 | type: 'trial_started', isTrial: true | - |
| **J8** | Settings 진입 시 "무료 체험 중 (30일 남음)" | getSubscriptionLabel 동작 | - |
| **J9** | Settings에 trial 안내 박스 | "💡 무료 체험 중이에요. X부터 자동 결제" | - |
| J10 | trial 중 Pro 기능 사용 가능 | 캐릭터 11명 이상 등록 | UpgradeModal 안 뜸 |

---

## K. 결제 (재구독자 — 즉시 결제)

| # | 항목 | 검증 방법 | DB 확인 |
|---|---|---|---|
| **K1** | "30일 무료" 배지 **숨김** | hasUsedTrial=true | 배지 안 보임 |
| **K2** | 버튼 라벨 "구독 시작하기" | "30일 무료로 시작하기" 아님 | - |
| **K3** | 버튼 클릭 → 확인 모달 "구독 결제 안내" | "오늘 ₩X,XXX 즉시 결제" 안내 | - |
| **K4** | 카드 등록 → **즉시 청구 1회** | 카드명세 즉시 청구 | - |
| **K5** | DB 상태 | `status: 'active'`, `currentPeriodEnd = 1개월/년 후` | `lastPaidAt` 존재 |
| **K6** | payments | type: 'recurring_first_payment', amount, paymentKey, receiptUrl | - |
| **K7** | 즉시 결제 실패 (잔액부족 카드) | 빌링키 자동 cancel + 에러 토스트 | 빌링키 미저장 |

---

## L. 쿠폰

| # | 항목 | 검증 방법 | DB 확인 |
|---|---|---|---|
| L1 | Firebase 콘솔에서 쿠폰 생성 | `coupons/HISTY-TEST-001` 문서 (isActive, durationDays:90, label, maxUses) | - |
| L2 | Free 사용자 쿠폰 적용 | Settings/Pricing 입력 → 적용 | `subscription.couponCode`, `couponDays:90`, `couponLabel`, `currentPeriodEnd:+90일`, `status:active`, `plan:'coupon'` |
| L3 | 쿠폰 라벨 동적 표시 | "3개월 무료 이용권" (코드: durationDays/30 자동 계산) | - |
| L4 | 동일 쿠폰 두 번째 사용 시도 | "이미 사용한 쿠폰" 에러 | usedBy에 uid 있음 |
| L5 | maxUses 초과 쿠폰 | 차단 메시지 | usedCount >= maxUses |
| L6 | isActive=false 쿠폰 | "사용할 수 없는 쿠폰" | - |
| L7 | expiresAt 지난 쿠폰 | "기간 만료" | - |
| L8 | trial 사용자 쿠폰 적용 시도 | "무료 체험 중에는 쿠폰을 사용할 수 없어요" | - |
| L9 | 쿠폰 만료 (currentPeriodEnd 도래) | billingScheduler 다음 실행 시 status=expired | payments에 `coupon_expired` 이력 |
| **L10** | 쿠폰 만료 후 결제 시도 | 즉시 결제 (재구독자 분기) → 30일 무료 중복 안 받음 | couponCode 등 stale 필드 모두 정리 |

### 쿠폰 종류 정리

| 쿠폰명 | durationDays | label (선택) | 자동 표시 |
|---|---|---|---|
| 3개월 체험 | 90 | (생략) | "3개월 무료 이용권" |
| 6개월 체험 | 180 | (생략) | "6개월 무료 이용권" |
| 1년 체험 | 365 | (생략) | "1년 무료 이용권" |
| 30일 체험 | 30 | "신규 회원 1개월" | "신규 회원 1개월" (label 우선) |

---

## M. 해지 / 재구독

| # | 항목 | 검증 방법 | DB 확인 |
|---|---|---|---|
| M1 | active 상태 해지 | Settings → "구독 해지" → 확인 | `status: cancelled`, `cancelledAt`, `billingKey` 삭제 |
| M2 | trial 상태 해지 | Settings → 동일 | `status: cancelled`, billingKey 삭제 → 자동결제 안 일어남 |
| M3 | 해지 후에도 currentPeriodEnd까지 Pro | isPro() true | - |
| M4 | 해지 후 currentPeriodEnd 지나면 Free | 시간 경과 후 | isPro() false |
| M5 | "구독 재개하기" → Pricing | 재구독 시 즉시 결제 분기 | - |
| M6 | past_due 사용자 해지 | Cloud Function이 허용 (방금 추가) | status: cancelled |
| M7 | payments | type: 'subscription_cancelled' | - |

---

## N. 자동결제 스케줄러

| # | 항목 | 검증 방법 | DB 확인 |
|---|---|---|---|
| N1 | trial 사용자 30일 후 첫 결제 | Firestore Console에서 `currentPeriodEnd`를 어제로 변경하고 스케줄러 수동 실행 | `status: trial → active`, payments에 `auto_billing` |
| N2 | active 사용자 결제일 도래 | 동일 | currentPeriodEnd 갱신 (이전+1달/년) |
| N3 | 결제 실패 처리 | 실패 카드로 테스트 | `status: past_due`, payments에 `auto_billing_failed` |
| N4 | 누락 catch (어제 결제일 사용자) | currentPeriodEnd를 어제로 + status active | 다음 스케줄러 실행 시 catch |
| N5 | 쿠폰 만료자 처리 | billingKey 없는 쿠폰 사용자 + 만료 | `status: expired`, payments `coupon_expired` |
| N6 | pendingPlan 적용 | 월간 → 연간 예약 후 결제일 도래 | plan: 'yearly'로 갱신 |

---

## O. 플랜 전환 예약

| # | 항목 | 검증 방법 | DB 확인 |
|---|---|---|---|
| O1 | active 월간 → 연간 예약 | Pricing → "다음 결제일부터 전환" → 확인 | `subscription.pendingPlan: 'yearly'` |
| O2 | 예약 표시 | "✓ 전환 예약됨" + 날짜 | - |
| O3 | 예약 취소 | "예약 취소" 버튼 | pendingPlan 삭제 |
| O4 | 다음 결제일 시 적용 | 스케줄러 실행 | plan: 'yearly', pendingPlan 삭제 |
| O5 | 쿠폰/trial/cancelled 사용자 예약 차단 | 버튼 비활성 또는 다른 흐름 | - |

---

## P. 회원탈퇴

| # | 항목 | 검증 방법 | DB 확인 |
|---|---|---|---|
| P1 | Settings → 회원 탈퇴 → 확인 | 처리 중 표시 | - |
| P2 | 모든 프로젝트 삭제 | `projects` where ownerId | 0개 |
| P3 | 모든 하위 컬렉션 삭제 | characters/relations/foreshadows/worldDocs/timelineEvents/fanworks | 0개 |
| P4 | 캐릭터 사진 Storage 삭제 | `characters/{id}/photo` | 없음 |
| P5 | 빌링키 cancel | 토스 측에서 cancel API 호출 | - |
| P6 | users/{uid} 문서 삭제 | - | 없음 |
| P7 | Auth 계정 삭제 | Firebase Console → Auth | uid 없음 |
| P8 | 같은 이메일로 재가입 | 새 uid 부여, 데이터 처음부터 | **신규 trial 받음 (알려진 한계)** |
| P9 | payments 이력 | 탈퇴 시 payments도 삭제? **현재 미삭제** | 분쟁/세무용 보존 (의도 확인 필요) |

---

## Q. UI 반응형 (모바일/태블릿/PC)

| # | 항목 | 검증 방법 |
|---|---|---|
| Q1 | 모바일 (375px) — 바텀탭 표시 | iPhone SE 시뮬레이션 |
| Q2 | 모바일 — FAB 버튼 작동 | 캐릭터 추가/관계 연결 |
| Q3 | 태블릿 (768px) — 햄버거 메뉴 | 사이드바 토글 |
| Q4 | PC (1280px+) — 사이드바 고정 | - |
| Q5 | 텍스트 overflow 처리 | 긴 이메일/캐릭터명/제목 → ellipsis |
| Q6 | 다크/라이트 테마 전환 | Settings 토글 → 즉시 반영 |
| Q7 | 테마 전환 후 새로고침 유지 | localStorage 동작 |

---

## R. 검색 / 부가 기능

| # | 항목 | 검증 방법 |
|---|---|---|
| R1 | 통합 검색 — 캐릭터 매칭 (이름/역할/설명/태그) | 헤더 돋보기 → 입력 |
| R2 | 통합 검색 — 타임라인 매칭 (제목/설명) | - |
| R3 | 통합 검색 — 복선 매칭 | resolved 호환 표시 (회수완료/미회수) |
| R4 | 통합 검색 — 설정집 매칭 (제목/내용) | - |
| R5 | 통합 검색 — 링크 매칭 (제목/작가) | - |
| R6 | 검색 결과 클릭 → 해당 탭 이동 | - |
| R7 | 빈 검색 결과 — "결과 없음" 표시 | - |
| R8 | ESC로 검색 모달 닫기 | - |
| R9 | 헤더 프로젝트 제목 클릭 → 인라인 편집 | Enter 저장, ESC 취소 |

---

## S. 보안 / Firestore Rules

| # | 항목 | 검증 방법 |
|---|---|---|
| S1 | 다른 사용자 프로젝트 직접 URL 접근 | /project/타인-id | 데이터 안 보임 |
| S2 | 다른 사용자 캐릭터 직접 수정 시도 | Firestore SDK로 강제 시도 | rules 거부 |
| S3 | `coupons/` 클라이언트 접근 | 직접 read 시도 | 차단 |
| S4 | `payments/` 클라이언트 쓰기 | 차단 (Cloud Functions 전용) | 차단 |
| S5 | `payments/` 본인 것 읽기 | 본인 uid 일치 시 가능 | 가능 |
| S6 | subscription 직접 수정 | 클라이언트에서 status: 'active'로 변조 시도 | rules 거부 (pendingPlan만 허용) |
| S7 | pendingPlan 직접 수정 (정상) | 클라이언트에서 'monthly'/'yearly' 설정 | 허용 |
| S8 | pendingPlan에 임의 값 ('free') | 차단 | rules의 enum 체크 |
| S9 | 인증 없이 Cloud Function 호출 | onCall이 unauthenticated 에러 | 차단 |
| S10 | 다른 uid로 issueBillingKey 호출 | customerKey !== uid 검증 | 차단 |

---

## T. Cloud Functions 헬스체크

Firebase Console → Functions → 로그:

| # | 항목 |
|---|---|
| T1 | `issueBillingKey` 호출 시 로그 정상 (신규/재구독 구분) |
| T2 | `applyCoupon` 트랜잭션 동작 |
| T3 | `cancelSubscription` 빌링키 cancel 로그 |
| T4 | `cancelPendingPlan` |
| T5 | `deleteAccount` 단계별 로그 (프로젝트, Storage, billingKey, Auth) |
| T6 | `billingScheduler` 매일 9시 KST 실행 (cron 로그) |
| T7 | `monthlyFirestoreBackup` 매월 1일 03시 (cron 로그 + GCS 버킷 확인) |
| T8 | `tossWebhook` IP 검증 동작 (Toss IP 외 차단) |

---

## U. 백업

| # | 항목 |
|---|---|
| U1 | GCS 버킷 `gs://catograph-5d8f5.appspot.com/firestore-backups/YYYY-MM/` 폴더 생성 확인 (월 1회) |
| U2 | 백업 복원 시뮬레이션 (테스트 프로젝트로) |

---

## ⚠️ 우선순위

**🔴 출시 전 필수 (Critical):**
A1, A3, A6, B1, B4, **C4 (사진)**, **I2~I7 (공유)**, **J1~J9 (신규 결제)**, **K1~K7 (재구독)**, M1~M5 (해지/재구독), S1~S6 (보안)

**🟡 1주 내 (High):**
모든 무료 한도 검증, L1~L10 (쿠폰), N1~N5 (스케줄러 모의 실행), I8~I17 (공유 페이지 디테일)

**🟢 출시 후 모니터링 (Medium):**
U1, U2 (백업), 자동결제 실제 30일 후 동작, 어뷰징 패턴 (P8)

---

## 📝 QA 진행 메모

진행 중 발견된 이슈는 아래에 기록:

| 일시 | 항목# | 증상 | 해결 방법 |
|---|---|---|---|
|  |  |  |  |
|  |  |  |  |
|  |  |  |  |
