// ── 플랜 가격 ──
export const PRICE = {
  monthly: 3300,
  trialDays: 30,
};

// ── Free 플랜 제한 ──
export const FREE_LIMITS = {
  projects: 3,
  characters: 10,
  worldDocs: 5,
  foreshadows: 15,
  timelineEvents: 15,
};

// ── 제한 초과 메시지 ──
export const LIMIT_MESSAGES = {
  projects: '무료 플랜은 프로젝트를 3개까지 만들 수 있어요.',
  characters: '무료 플랜은 캐릭터를 10명까지 등록할 수 있어요.',
  worldDocs: '무료 플랜은 설정집 문서를 5개까지 만들 수 있어요.',
  foreshadows: '무료 플랜은 복선을 15개까지 등록할 수 있어요.',
  timelineEvents: '무료 플랜은 타임라인 이벤트를 15개까지 등록할 수 있어요.',
};

// ── Pro 여부 체크 ──
// subscription.status:
//   'active'    → 정상 구독 (currentPeriodEnd 이전까지 Pro)
//   'trial'     → 무료 체험 (trialEndsAt 이전까지 Pro)
//   'cancelled' → 해지됨, 단 currentPeriodEnd 이전까지는 Pro 유지
//   'past_due'  → 결제 실패 (Pro 아님)
//   'expired'   → 만료 (Pro 아님)
export function isPro(user) {
  if (!user?.subscription) return false;
  const { status, currentPeriodEnd, trialEndsAt } = user.subscription;
  const now = Date.now();

  if (status === 'active' || status === 'cancelled') {
    // cancelled여도 기간 만료 전까지는 Pro 유지
    if (!currentPeriodEnd?.toMillis) return false;
    return currentPeriodEnd.toMillis() > now;
  }
  if (status === 'trial') {
    if (trialEndsAt?.toMillis) return trialEndsAt.toMillis() > now;
    return false;
  }
  return false;
}

// ── 구독 상태 텍스트 ──
export function getSubscriptionLabel(user) {
  if (!user?.subscription) return '무료 플랜';
  const { status, plan, trialEndsAt, currentPeriodEnd } = user.subscription;
  const now = Date.now();

  const fmt = (ts) => {
    if (!ts?.toDate) return '';
    const d = ts.toDate();
    return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일`;
  };

  if (status === 'trial' && trialEndsAt?.toMillis?.() > now) {
    const daysLeft = Math.ceil((trialEndsAt.toMillis() - now) / 86400000);
    return `무료 체험 중 (${daysLeft}일 남음)`;
  }
  if (status === 'active') {
    if (plan === 'b2b') {
      return `B2B 플랜 · ${fmt(currentPeriodEnd)}까지 이용 가능`;
    }
    const couponCode = user?.subscription?.couponCode;
    if (couponCode) {
      return `체험단 1년권 · ${fmt(currentPeriodEnd)}까지 이용 가능`;
    }
    const planName = plan === 'yearly' ? '연간' : '월간';
    return `Pro ${planName} · 다음 결제일 ${fmt(currentPeriodEnd)}`;
  }
  if (status === 'cancelled') {
    if (currentPeriodEnd?.toMillis?.() > now) {
      return `해지 예정 · ${fmt(currentPeriodEnd)}까지 이용 가능`;
    }
    return '구독 만료됨';
  }
  if (status === 'past_due') return '결제 실패 — 카드를 확인해 주세요';
  return '무료 플랜';
}
