import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { signOut } from 'firebase/auth';
import { auth, app } from '../firebase';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { isPro, getSubscriptionLabel } from '../config/plans';

const fmt = (ts) => {
  if (!ts?.toDate) return '';
  const d = ts.toDate();
  return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일`;
};

export default function Settings({ user, onShowOnboarding, theme, onToggleTheme }) {
  const navigate = useNavigate();
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [cancellingSubscription, setCancellingSubscription] = useState(false);
  const [cancellingPlan, setCancellingPlan] = useState(false);

  const functions = getFunctions(app, 'asia-northeast3');

  const handleDeleteAccount = async () => {
    if (!window.confirm('정말 탈퇴하시겠어요? 모든 데이터가 삭제되며 복구할 수 없습니다.')) return;
    setDeletingAccount(true);
    try {
      const deleteAccount = httpsCallable(functions, 'deleteAccount');
      await deleteAccount();
      navigate('/login');
    } catch (e) {
      console.error(e);
      alert('탈퇴 처리 중 오류가 발생했어요. 이메일로 문의해 주세요.');
    } finally {
      setDeletingAccount(false);
    }
  };

  // 구독 해지: 빌링키 해제 + status → cancelled (기간까지 Pro 유지)
  const handleCancelSubscription = async () => {
    if (!window.confirm(
      '구독을 해지하시겠어요?\n해지 후에도 현재 결제 기간 만료일까지는 Pro를 이용할 수 있어요.'
    )) return;
    setCancellingSubscription(true);
    try {
      const cancelSubscription = httpsCallable(functions, 'cancelSubscription');
      await cancelSubscription();
      alert('구독이 해지됐어요. 기간 만료일까지 계속 이용하실 수 있어요.');
    } catch (e) {
      console.error(e);
      alert('해지 처리 중 오류가 발생했어요. 이메일로 문의해 주세요.');
    } finally {
      setCancellingSubscription(false);
    }
  };

  // 플랜 전환 예약 취소
  const handleCancelPendingPlan = async () => {
    if (!window.confirm('플랜 전환 예약을 취소하시겠어요?')) return;
    setCancellingPlan(true);
    try {
      const cancelPendingPlan = httpsCallable(functions, 'cancelPendingPlan');
      await cancelPendingPlan();
      alert('전환 예약이 취소됐어요.');
    } catch (e) {
      console.error(e);
      alert('취소 중 오류가 발생했어요.');
    } finally {
      setCancellingPlan(false);
    }
  };

  const pro = isPro(user);
  const planLabel = getSubscriptionLabel(user);
  const sub = user?.subscription || {};
  const isPastDue = sub.status === 'past_due';
  const isCancelled = sub.status === 'cancelled' && pro;
  const isActive = sub.status === 'active';

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      {/* 헤더 */}
      <header style={{ height: 52, display: 'flex', alignItems: 'center', padding: '0 20px', gap: 10, borderBottom: '1px solid var(--border)', background: 'var(--bg2)', position: 'sticky', top: 0, zIndex: 10 }}>
        <button className="btn btn-ghost" style={{ fontSize: 12 }} onClick={() => navigate(-1)}>← 뒤로</button>
        <div style={{ width: 1, height: 16, background: 'var(--border)' }} />
        <span style={{ fontFamily: 'var(--font-serif)', fontSize: 16 }}>마이페이지</span>
      </header>

      <main style={{ maxWidth: 560, margin: '0 auto', padding: '40px 20px 80px' }}>

        {/* 프로필 */}
        <section style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: 24, marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            {user?.photoURL
              ? <img src={user.photoURL} alt="" style={{ width: 56, height: 56, borderRadius: '50%', border: '2px solid var(--border2)' }} />
              : <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'var(--accent-glow)', border: '2px solid var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, color: 'var(--accent)' }}>{user?.displayName?.[0] || 'U'}</div>
            }
            <div>
              <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--text)', marginBottom: 4 }}>{user?.displayName}</div>
              <div style={{ fontSize: 13, color: 'var(--text3)' }}>{user?.email}</div>
            </div>
          </div>
        </section>

        {/* 결제 실패 배너 */}
        {isPastDue && (
          <div style={{ background: 'rgba(248,113,113,0.1)', border: '1px solid var(--coral, #f87171)', borderRadius: 'var(--radius-lg)', padding: '14px 18px', marginBottom: 16 }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--coral, #f87171)', marginBottom: 4 }}>⚠️ 결제에 실패했어요</div>
            <div style={{ fontSize: 13, color: 'var(--coral, #f87171)', opacity: 0.9 }}>
              등록된 카드의 한도·유효기간을 확인해 주세요. 문제가 지속되면{' '}
              <strong>histy.cartographic@gmail.com</strong> 으로 문의해 주세요.
            </div>
          </div>
        )}

        {/* 플랜 */}
        <section style={{ background: 'var(--bg2)', border: `1px solid ${pro ? 'var(--accent)' : isPastDue ? 'var(--coral, #f87171)' : 'var(--border)'}`, borderRadius: 'var(--radius-lg)', padding: 24, marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: (isActive || isCancelled) ? 16 : 0 }}>
            <div>
              <div style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 4 }}>현재 플랜</div>
              <div style={{ fontSize: 18, fontWeight: 600, color: pro ? 'var(--accent)' : 'var(--text)' }}>
                {pro ? '✦ Pro' : 'Free'}
              </div>
              <div style={{ fontSize: 12, color: isPastDue ? 'var(--coral, #f87171)' : 'var(--text3)', marginTop: 2 }}>{planLabel}</div>
            </div>
            {!pro && !isPastDue && (
              <button className="btn btn-primary" style={{ fontSize: 13, padding: '0 16px', height: 36 }}
                onClick={() => navigate('/pricing')}>
                업그레이드
              </button>
            )}
            {isPastDue && (
              <button className="btn btn-primary" style={{ fontSize: 13, padding: '0 16px', height: 36 }}
                onClick={() => navigate('/pricing')}>
                결제 수단 변경
              </button>
            )}
          </div>

          {/* 활성 구독 관리 */}
          {isActive && (
            <div style={{ borderTop: '1px solid var(--border)', paddingTop: 16 }}>
              {/* pendingPlan 예약 안내 */}
              {sub.pendingPlan && (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--bg3)', borderRadius: 'var(--radius)', padding: '10px 14px', marginBottom: 12 }}>
                  <span style={{ fontSize: 13, color: 'var(--text2)' }}>
                    {fmt(sub.currentPeriodEnd)}부터{' '}
                    <strong>{sub.pendingPlan === 'yearly' ? '연간' : '월간'}</strong> 플랜으로 전환 예약됨
                  </span>
                  <button className="btn btn-ghost" style={{ fontSize: 11, height: 28, padding: '0 10px', flexShrink: 0 }}
                    onClick={handleCancelPendingPlan} disabled={cancellingPlan}>
                    {cancellingPlan ? '처리 중...' : '예약 취소'}
                  </button>
                </div>
              )}
              {/* 구독 해지 */}
              <button
                style={{ fontSize: 13, color: 'var(--text3)', background: 'none', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '8px 16px', cursor: 'pointer', transition: 'all 0.2s' }}
                onMouseEnter={e => { e.currentTarget.style.color = 'var(--coral, #f87171)'; e.currentTarget.style.borderColor = 'var(--coral, #f87171)'; }}
                onMouseLeave={e => { e.currentTarget.style.color = 'var(--text3)'; e.currentTarget.style.borderColor = 'var(--border)'; }}
                onClick={handleCancelSubscription} disabled={cancellingSubscription}>
                {cancellingSubscription ? '처리 중...' : '구독 해지'}
              </button>
              <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 8 }}>
                해지 후에도 {fmt(sub.currentPeriodEnd)}까지 Pro를 이용할 수 있어요.
              </div>
            </div>
          )}

          {/* 해지 예정 상태 */}
          {isCancelled && (
            <div style={{ borderTop: '1px solid var(--border)', paddingTop: 16 }}>
              <div style={{ fontSize: 13, color: 'var(--text3)', marginBottom: 12 }}>
                {fmt(sub.currentPeriodEnd)} 이후 자동으로 무료 플랜으로 전환돼요.
              </div>
              <button className="btn btn-primary" style={{ fontSize: 13, height: 36, padding: '0 16px' }}
                onClick={() => navigate('/pricing')}>
                구독 재개하기
              </button>
            </div>
          )}
        </section>

        {/* 테마 */}
        <section style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: 24, marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--text)', marginBottom: 4 }}>화면 테마</div>
              <div style={{ fontSize: 13, color: 'var(--text3)' }}>현재 {theme === 'dark' ? '다크' : '라이트'} 모드</div>
            </div>
            <button className="btn" style={{ fontSize: 13, padding: '0 16px', height: 36 }} onClick={onToggleTheme}>
              {theme === 'dark' ? '☀️ 라이트모드로 전환' : '🌙 다크모드로 전환'}
            </button>
          </div>
        </section>

        {/* 온보딩 다시 보기 */}
        <section style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: 24, marginBottom: 16 }}>
          <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--text)', marginBottom: 4 }}>사용 가이드</div>
          <div style={{ fontSize: 13, color: 'var(--text3)', marginBottom: 16 }}>카토그래픽 기능 소개를 다시 볼 수 있어요.</div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn" style={{ fontSize: 13, padding: '0 16px', height: 36 }}
              onClick={() => { onShowOnboarding?.(); navigate('/'); }}>
              온보딩 다시 보기
            </button>
            <a href="/how-to.html" target="_blank" rel="noopener noreferrer"
              className="btn" style={{ fontSize: 13, padding: '0 16px', height: 36, textDecoration: 'none' }}>
              이용방법 보기 →
            </a>
          </div>
        </section>

        {/* 법적 정보 */}
        <section style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: 24, marginBottom: 16 }}>
          <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--text)', marginBottom: 16 }}>법적 정보</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <button className="btn btn-ghost" style={{ justifyContent: 'flex-start', fontSize: 13, height: 36 }}
              onClick={() => navigate('/legal')}>이용약관</button>
            <button className="btn btn-ghost" style={{ justifyContent: 'flex-start', fontSize: 13, height: 36 }}
              onClick={() => navigate('/legal')}>개인정보처리방침</button>
            <button className="btn btn-ghost" style={{ justifyContent: 'flex-start', fontSize: 13, height: 36 }}
              onClick={() => navigate('/legal')}>환불 정책</button>
          </div>
        </section>

        {/* 계정 관리 */}
        <section style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: 24 }}>
          <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--text)', marginBottom: 16 }}>계정 관리</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <button className="btn btn-ghost" style={{ justifyContent: 'flex-start', fontSize: 13, height: 36, color: 'var(--coral, #f87171)' }}
              onClick={() => signOut(auth)}>로그아웃</button>
            <div style={{ borderTop: '1px solid var(--border)', paddingTop: 12, marginTop: 4 }}>
              <div style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 12, lineHeight: 1.6 }}>
                탈퇴 시 모든 프로젝트, 캐릭터, 복선 등 데이터가 즉시 삭제되며 복구할 수 없습니다.
              </div>
              <button
                style={{ fontSize: 13, color: 'var(--text3)', background: 'none', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '8px 16px', cursor: 'pointer', transition: 'all 0.2s' }}
                onMouseEnter={e => { e.currentTarget.style.color = 'var(--coral, #f87171)'; e.currentTarget.style.borderColor = 'var(--coral, #f87171)'; }}
                onMouseLeave={e => { e.currentTarget.style.color = 'var(--text3)'; e.currentTarget.style.borderColor = 'var(--border)'; }}
                onClick={handleDeleteAccount}
                disabled={deletingAccount}>
                {deletingAccount ? '탈퇴 처리 중...' : '회원 탈퇴'}
              </button>
            </div>
          </div>
        </section>

      </main>
    </div>
  );
}
