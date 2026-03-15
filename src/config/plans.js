// Free 플랜 제한
export const FREE_LIMITS = {
  projects: 1,
  characters: 10,
  worldDocs: 3,
  foreshadows: 10,
  timelineEvents: 20,
};

// 제한 초과 메시지
export const LIMIT_MESSAGES = {
  projects: '무료 플랜은 프로젝트를 1개까지 만들 수 있어요.',
  characters: '무료 플랜은 캐릭터를 10명까지 등록할 수 있어요.',
  worldDocs: '무료 플랜은 세계관 문서를 3개까지 만들 수 있어요.',
  foreshadows: '무료 플랜은 복선을 10개까지 등록할 수 있어요.',
  timelineEvents: '무료 플랜은 타임라인 이벤트를 20개까지 등록할 수 있어요.',
};

// 나중에 isPro 체크 로직 여기서 관리
// 현재는 모두 Free로 처리 (결제 연동 전)
export function isPro(user) {
  // TODO: 결제 연동 후 user.isPro 등으로 교체
  return false;
}
