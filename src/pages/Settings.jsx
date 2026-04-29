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
  const [couponCode, setCouponCode] = useState('');
  const [applyingCoupon, setApplyingCoupon] = useState(false);
  const [couponError, setCouponError] = useState('');
  const [couponSuccess, setCouponSuccess] = useState('');

  // 커스텀 확인 모달
  const [confirmModal, setConfirmModal] = useState(null); // { title, message, onConfirm }
  // 토스트 알림
  const [toast, setToast] = useState(null); // { message, type: 'success' | 'error' }

  const functions = getFunctions(app, 'asia-northeast3');

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const showConfirm = (title, message, onConfirm) => {
    setConfirmModal({ title, message, onConfirm });
  };

  const handleDeleteAccount = () => {
    showConfirm(
      '회원 탈퇴',
      '정말 탈퇴하시겠어요?\n모든 데이터가 삭제되며 복구할 수 없습니다.',
      async () => {
        setDeletingAccount(true);
        try {
          const deleteAccount = httpsCallable(functions, 'deleteAccount');
          await deleteAccount();
          await signOut(auth);
          navigate('/login');
        } catch (e) {
          console.error(e);
          showToast('탈퇴 처리 중 오류가 발생했어요. 이메일로 문의해 주세요.', 'error');
        } finally {
          setDeletingAccount(false);
        }
      }
    );
  };

  // 구독 해지: 빌링키 해제 + status → cancelled (기간까지 Pro 유지)
  const handleCancelSubscription = () => {
    showConfirm(
      '구독 해지',
      '구독을 해지하시겠어요?\n해지 후에도 현재 결제 기간 만료일까지는 Pro를 이용할 수 있어요.',
      async () => {
        setCancellingSubscription(true);
        try {
          const cancelSubscription = httpsCallable(functions, 'cancelSubscription');
          await cancelSubscription();
          showToast('구독이 해지됐어요. 기간 만료일까지 계속 이용하실 수 있어요.');
          setTimeout(() => window.location.reload(), 2000);
        } catch (e) {
          console.error(e);
          showToast('해지 처리 중 오류가 발생했어요. 이메일로 문의해 주세요.', 'error');
        } finally {
          setCancellingSubscription(false);
        }
      }
    );
  };

  // 플랜 전환 예약 취소
  const handleCancelPendingPlan = () => {
    showConfirm(
      '예약 취소',
      '플랜 전환 예약을 취소하시겠어요?',
      async () => {
        setCancellingPlan(true);
        try {
          const cancelPendingPlan = httpsCallable(functions, 'cancelPendingPlan');
          await cancelPendingPlan();
          showToast('전환 예약이 취소됐어요.');
        } catch (e) {
          console.error(e);
          showToast('취소 중 오류가 발생했어요.', 'error');
        } finally {
          setCancellingPlan(false);
        }
      }
    );
  };

  const handleApplyCoupon = async (e) => {
    e.preventDefault();
    if (!couponCode.trim()) return;
    setApplyingCoupon(true);
    setCouponError('');
    setCouponSuccess('');
    try {
      const applyCoupon = httpsCallable(functions, 'applyCoupon');
      await applyCoupon({ code: couponCode.trim() });
      setCouponSuccess('1년 무료 이용권이 적용됐어요! 🎉');
      setCouponCode('');
    } catch (err) {
      setCouponError(err.message || '쿠폰 적용에 실패했어요. 코드를 다시 확인해주세요.');
    } finally {
      setApplyingCoupon(false);
    }
  };

  const pro = isPro(user);
  const planLabel = getSubscriptionLabel(user);
  const sub = user?.subscription || {};
  const isPastDue = sub.status === 'past_due';
  const isCancelled = sub.status === 'cancelled' && pro;
  const isActive = sub.status === 'active';
  const isTrial = sub.status === 'trial';
  // 해지 가능: active, trial 모두 가능 (past_due는 별도 안내)
  const canCancel = isActive || isTrial;

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

          {/* 활성/체험 구독 관리 */}
          {canCancel && (
            <div style={{ borderTop: '1px solid var(--border)', paddingTop: 16 }}>
              {/* trial 안내 */}
              {isTrial && (
                <div style={{ background: 'var(--bg3)', borderRadius: 'var(--radius)', padding: '10px 14px', marginBottom: 12, fontSize: 12, color: 'var(--text2)' }}>
                  💡 무료 체험 중이에요. {fmt(sub.currentPeriodEnd)}부터 자동 결제가 시작됩니다.
                </div>
              )}
              {/* pendingPlan 예약 안내 */}
              {sub.pendingPlan && (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--bg3)', borderRadius: 'var(--radius)', padding: '10px 14px', marginBottom: 12 }}>
                  <span style={{ fontSize: 13, color: 'var(--text2)' }}>
                    {fmt(sub.currentPeriodEnd)}부터{' '}
                    <strong>{sub.pendingPlan === 'yearly' ? '연간' : '월간'}</strong> 플랜으로 전환 예약됨
                  </span>
                  <button className="btn btn-ghost" style={{ fontSize: 11, height: 28, padding: '0 10px', flexShrink: 0, opacity: cancellingPlan ? 0.5 : 1, cursor: cancellingPlan ? 'not-allowed' : 'pointer' }}
                    onClick={handleCancelPendingPlan} disabled={cancellingPlan}>
                    {cancellingPlan ? '처리 중...' : '예약 취소'}
                  </button>
                </div>
              )}
              {/* 구독 해지 */}
              <button
                style={{ fontSize: 13, color: cancellingSubscription ? 'var(--text3)' : 'var(--text3)', background: 'none', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '8px 16px', cursor: cancellingSubscription ? 'not-allowed' : 'pointer', transition: 'all 0.2s', opacity: cancellingSubscription ? 0.5 : 1 }}
                onMouseEnter={e => { if (!cancellingSubscription) { e.currentTarget.style.color = 'var(--coral, #f87171)'; e.currentTarget.style.borderColor = 'var(--coral, #f87171)'; } }}
                onMouseLeave={e => { e.currentTarget.style.color = 'var(--text3)'; e.currentTarget.style.borderColor = 'var(--border)'; }}
                onClick={handleCancelSubscription} disabled={cancellingSubscription}>
                {cancellingSubscription ? '처리 중...' : '구독 해지'}
              </button>
              <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 8 }}>
                {isTrial
                  ? `해지 시 ${fmt(sub.currentPeriodEnd)}까지 무료 체험을 이용하고, 자동 결제는 진행되지 않아요.`
                  : `해지 후에도 ${fmt(sub.currentPeriodEnd)}까지 Pro를 이용할 수 있어요.`}
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

        {/* 쿠폰 코드 */}
        <section style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: 24, marginBottom: 16 }}>
          <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--text)', marginBottom: 4 }}>쿠폰 코드</div>
          <div style={{ fontSize: 13, color: 'var(--text3)', marginBottom: 16 }}>체험단 또는 이벤트 쿠폰 코드를 입력하세요.</div>
          {(isActive || isTrial) ? (
            <div style={{ fontSize: 13, color: 'var(--text3)', background: 'var(--bg3)', borderRadius: 'var(--radius)', padding: '10px 14px' }}>
              {isTrial ? '무료 체험 중에는 쿠폰을 사용할 수 없어요.' : '구독 중에는 쿠폰을 사용할 수 없어요.'}
            </div>
          ) : (
            <form onSubmit={handleApplyCoupon} style={{ display: 'flex', gap: 8 }}>
              <input
                value={couponCode}
                onChange={e => { setCouponCode(e.target.value.toUpperCase()); setCouponError(''); setCouponSuccess(''); }}
                placeholder="HISTY-XXXXXXXX"
                style={{ flex: 1, fontFamily: 'monospace', letterSpacing: '0.05em' }}
                disabled={applyingCoupon}
              />
              <button
                type="submit"
                className="btn btn-primary"
                style={{ fontSize: 13, padding: '0 16px', height: 36, flexShrink: 0, whiteSpace: 'nowrap', minWidth: 80, opacity: applyingCoupon ? 0.5 : 1, cursor: applyingCoupon ? 'not-allowed' : 'pointer' }}
                disabled={applyingCoupon || !couponCode.trim()}
              >
                {applyingCoupon ? '확인 중...' : '적용하기'}
              </button>
            </form>
          )}
          {couponError && <div style={{ fontSize: 12, color: 'var(--coral, #f87171)', marginTop: 8 }}>⚠ {couponError}</div>}
          {couponSuccess && <div style={{ fontSize: 12, color: 'var(--teal)', marginTop: 8 }}>✓ {couponSuccess}</div>}
        </section>

        {/* 테마 */}
        <section style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: 24, marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--text)', marginBottom: 4 }}>화면 테마</div>
              <div style={{ fontSize: 13, color: 'var(--text3)' }}>현재 {theme === 'dark' ? '다크' : '라이트'} 모드</div>
            </div>
            <button className="btn" style={{ fontSize: 13, padding: '0 16px', height: 36, whiteSpace: 'nowrap', flexShrink: 0 }} onClick={onToggleTheme}>
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
                style={{ fontSize: 13, color: 'var(--text3)', background: 'none', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '8px 16px', cursor: deletingAccount ? 'not-allowed' : 'pointer', transition: 'all 0.2s', opacity: deletingAccount ? 0.5 : 1 }}
                onMouseEnter={e => { if (!deletingAccount) { e.currentTarget.style.color = 'var(--coral, #f87171)'; e.currentTarget.style.borderColor = 'var(--coral, #f87171)'; } }}
                onMouseLeave={e => { e.currentTarget.style.color = 'var(--text3)'; e.currentTarget.style.borderColor = 'var(--border)'; }}
                onClick={handleDeleteAccount}
                disabled={deletingAccount}>
                {deletingAccount ? '탈퇴 처리 중...' : '회원 탈퇴'}
              </button>
            </div>
          </div>
        </section>

      </main>

      {/* ── 커스텀 확인 모달 ── */}
      {confirmModal && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20 }}
          onClick={() => setConfirmModal(null)}
        >
          <div
            style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: 28, maxWidth: 360, width: '100%', boxShadow: '0 20px 60px rgba(0,0,0,0.4)' }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--text)', marginBottom: 10 }}>{confirmModal.title}</div>
            <div style={{ fontSize: 14, color: 'var(--text2)', lineHeight: 1.6, marginBottom: 24, whiteSpace: 'pre-line' }}>{confirmModal.message}</div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button
                className="btn btn-ghost"
                style={{ fontSize: 13, height: 36, padding: '0 16px' }}
                onClick={() => setConfirmModal(null)}
              >
                취소
              </button>
              <button
                className="btn"
                style={{ fontSize: 13, height: 36, padding: '0 16px', background: 'var(--coral, #f87171)', color: '#fff', border: 'none' }}
                onClick={() => { confirmModal.onConfirm(); setConfirmModal(null); }}
              >
                확인
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── 토스트 알림 ── */}
      {toast && (
        <div style={{
          position: 'fixed', bottom: 32, left: '50%', transform: 'translateX(-50%)',
          background: toast.type === 'error' ? 'var(--coral, #f87171)' : 'var(--accent)',
          color: '#fff', borderRadius: 'var(--radius-lg)', padding: '12px 20px',
          fontSize: 14, fontWeight: 500, zIndex: 1100,
          boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
          animation: 'fadeInUp 0.2s ease',
          whiteSpace: 'nowrap',
          maxWidth: 'calc(100vw - 40px)',
          textAlign: 'center',
        }}>
          {toast.type === 'error' ? '⚠ ' : '✓ '}{toast.message}
        </div>
      )}
    </div>
  );
}
