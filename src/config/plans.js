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
// Firestore users/{uid} 문서의 subscription 필드 기준
// subscription: {
//   status: 'active' | 'trial' | 'cancelled' | 'expired',
//   trialEndsAt: Timestamp,
//   currentPeriodEnd: Timestamp,
// }
export function isPro(user) {
  if (!user?.subscription) return false;
  const { status, currentPeriodEnd, trialEndsAt } = user.subscription;
  const now = Date.now();

  if (status === 'active') {
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
  const { status, trialEndsAt, currentPeriodEnd } = user.subscription;
  const now = Date.now();

  if (status === 'trial' && trialEndsAt?.toMillis?.() > now) {
    const daysLeft = Math.ceil((trialEndsAt.toMillis() - now) / 86400000);
    return `무료 체험 중 (${daysLeft}일 남음)`;
  }
  if (status === 'active') return 'Pro 플랜';
  if (status === 'cancelled') return '구독 취소됨';
  return '무료 플랜';
}
