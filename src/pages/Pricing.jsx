import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { doc, updateDoc } from 'firebase/firestore';
import { db, app } from '../firebase';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { isPro } from '../config/plans';

const TOSS_CLIENT_KEY = process.env.REACT_APP_TOSS_CLIENT_KEY;

export default function Pricing({ user }) {
  const navigate = useNavigate();
  const [yearly, setYearly] = useState(false);
  const [paying, setPaying] = useState(false);
  const [reserving, setReserving] = useState(false);
  const [cancellingPlan, setCancellingPlan] = useState(false);
  const userIsPro = isPro(user);
  const userPlan = user?.subscription?.plan || null; // 'monthly' | 'yearly' | null
  const pendingPlan = user?.subscription?.pendingPlan || null;
  const currentPeriodEnd = user?.subscription?.currentPeriodEnd?.toDate?.() || null;
  const isPastDue = user?.subscription?.status === 'past_due';
  const isCancelled = user?.subscription?.status === 'cancelled';
  // 해지 예정이거나 past_due면 전환 예약 불가
  const isCurrentPlan = (planType) => userIsPro && userPlan === planType && !isCancelled;
  const canReserve = (planType) => userIsPro && !isCancelled && !isPastDue && userPlan !== planType && userPlan !== null;
  const isReserved = (planType) => pendingPlan === planType;

  const fns = getFunctions(app, 'asia-northeast3');

  const formatDate = (date) => {
    if (!date) return '';
    return `${date.getFullYear()}년 ${date.getMonth() + 1}월 ${date.getDate()}일`;
  };

  const handleReservePlan = async (planType) => {
    if (!user || reserving) return;
    if (planType !== 'monthly' && planType !== 'yearly') return;
    const confirmMsg = planType === 'yearly'
      ? `${formatDate(currentPeriodEnd)}부터 연간 플랜(29,900원/년)으로 전환할까요?`
      : `${formatDate(currentPeriodEnd)}부터 월간 플랜(3,300원/월)으로 전환할까요?`;
    if (!window.confirm(confirmMsg)) return;
    setReserving(true);
    try {
      await updateDoc(doc(db, 'users', user.uid), { 'subscription.pendingPlan': planType });
      alert(`다음 결제일(${formatDate(currentPeriodEnd)})부터 ${planType === 'yearly' ? '연간' : '월간'} 플랜으로 전환됩니다.`);
    } catch (e) {
      console.error(e);
      alert('전환 예약 중 오류가 발생했어요. 다시 시도해 주세요.');
    } finally {
      setReserving(false);
    }
  };

  // 플랜 전환 예약 취소
  const handleCancelPendingPlan = async () => {
    if (!window.confirm('플랜 전환 예약을 취소하시겠어요?')) return;
    setCancellingPlan(true);
    try {
      const cancelPendingPlan = httpsCallable(fns, 'cancelPendingPlan');
      await cancelPendingPlan();
      alert('전환 예약이 취소됐어요.');
    } catch (e) {
      console.error(e);
      alert('취소 중 오류가 발생했어요.');
    } finally {
      setCancellingPlan(false);
    }
  };

  const FREE_FEATURES = ['프로젝트 3개 생성 가능','캐릭터 최대 10명 등록','설정집 문서 최대 5개 등록','복선 최대 15개 등록','타임라인 최대 15개 등록','공유 링크 (읽기 전용) 전송 가능'];
  const PRO_FEATURES = ['프로젝트 무제한 생성','캐릭터 무제한 등록','설정집 문서 무제한 등록','복선 무제한 등록','타임라인 무제한 등록','공유 링크 (읽기 전용) 전송 가능','우선 고객 지원'];
  const ENTERPRISE_FEATURES = ['30명 이상 팀을 위한 플랜','Pro 기능 전체 포함','인당 요금 할인','우선 기술 지원 (SLA)','맞춤 계약 및 세금계산서'];

  const handlePayment = async () => {
    if (!user) { navigate('/login'); return; }
    if (paying) return;
    setPaying(true);
    try {
      const { loadTossPayments } = await import('@tosspayments/tosspayments-sdk');
      const tossPayments = await loadTossPayments(TOSS_CLIENT_KEY);
      const payment = tossPayments.payment({ customerKey: user.uid });
      const amount = yearly ? 29900 : 3300;
      const planName = yearly ? 'Cartographic Pro 연간' : 'Cartographic Pro 월간';
      const orderId = `order_${user.uid}_${Date.now()}`;
      await payment.requestBillingAuth({
        method: 'CARD',
        successUrl: `${window.location.origin}/payment/success?orderId=${orderId}&amount=${amount}&yearly=${yearly}`,
        failUrl: `${window.location.origin}/payment/fail`,
        customerEmail: user.email || '',
        customerName: user.displayName || '고객',
      });
    } catch (e) {
      console.error(e);
      alert('결제 창 열기에 실패했어요. 다시 시도해 주세요.');
    } finally {
      setPaying(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <header style={{ height: 52, display: 'flex', alignItems: 'center', padding: '0 20px', gap: 10, borderBottom: '1px solid var(--border)', background: 'var(--bg2)', position: 'sticky', top: 0, zIndex: 10 }}>
        <button className="btn btn-ghost" style={{ fontSize: 12 }} onClick={() => navigate(-1)}>← 뒤로</button>
        <div style={{ width: 1, height: 16, background: 'var(--border)' }} />
        <span style={{ fontFamily: 'var(--font-serif)', fontSize: 16 }}>Cartographic</span>
      </header>

      <main style={{ maxWidth: 800, margin: '0 auto', padding: '60px 20px 80px' }}>
        {/* 결제 실패 배너 */}
        {isPastDue && (
          <div style={{ background: 'rgba(248,113,113,0.1)', border: '1px solid var(--coral, #f87171)', borderRadius: 'var(--radius-lg)', padding: '14px 18px', marginBottom: 32, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--coral, #f87171)', marginBottom: 2 }}>⚠️ 결제에 실패했어요</div>
              <div style={{ fontSize: 13, color: 'var(--coral, #f87171)', opacity: 0.9 }}>등록된 카드를 확인하거나 새 카드를 등록해 주세요.</div>
            </div>
            <button className="btn btn-primary" style={{ flexShrink: 0, fontSize: 13 }} onClick={handlePayment} disabled={paying}>
              {paying ? '처리 중...' : '카드 재등록'}
            </button>
          </div>
        )}

        {/* 해지 예정 배너 */}
        {isCancelled && userIsPro && (
          <div style={{ background: 'rgba(99,102,241,0.08)', border: '1px solid var(--accent)', borderRadius: 'var(--radius-lg)', padding: '14px 18px', marginBottom: 32, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
            <div style={{ fontSize: 13, color: 'var(--accent)' }}>
              구독이 해지 예정이에요. {formatDate(currentPeriodEnd)}까지 Pro를 이용할 수 있어요.
            </div>
          </div>
        )}

        <div style={{ textAlign: 'center', marginBottom: 48 }}>
          <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: 36, letterSpacing: '-0.02em', marginBottom: 12 }}>요금제</h1>
          <p style={{ color: 'var(--text2)', fontSize: 15, marginBottom: 28 }}>처음 30일은 Pro 플랜을 무료로 체험해보세요</p>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 12, background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 99, padding: '6px 8px' }}>
            <button onClick={() => setYearly(false)} style={{ padding: '6px 16px', borderRadius: 99, border: 'none', background: !yearly ? 'var(--accent)' : 'transparent', color: !yearly ? '#fff' : 'var(--text2)', cursor: 'pointer', fontSize: 13, fontWeight: 500, transition: 'all 0.2s' }}>월간</button>
            <button onClick={() => setYearly(true)} style={{ padding: '6px 16px', borderRadius: 99, border: 'none', background: yearly ? 'var(--accent)' : 'transparent', color: yearly ? '#fff' : 'var(--text2)', cursor: 'pointer', fontSize: 13, fontWeight: 500, transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: 6 }}>
              연간 <span style={{ background: 'rgba(255,255,255,0.2)', borderRadius: 99, padding: '1px 8px', fontSize: 11 }}>25% 할인</span>
            </button>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 20 }}>
          {/* Free */}
          <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 'var(--radius-xl)', padding: 28 }}>
            <div style={{ marginBottom: 24 }}>
              <div style={{ fontSize: 13, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Free</div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}><span style={{ fontFamily: 'var(--font-serif)', fontSize: 40 }}>0원</span></div>
              <div style={{ color: 'var(--text3)', fontSize: 12, marginTop: 4 }}>영원히 무료</div>
            </div>
            <button className="btn" style={{ width: '100%', justifyContent: 'center', height: 42, fontSize: 14, marginBottom: 24, opacity: userIsPro ? 0.4 : 1, cursor: userIsPro ? 'default' : 'pointer' }} onClick={() => !userIsPro && navigate('/')} disabled={userIsPro}>무료로 시작하기</button>
            <div style={{ borderTop: '1px solid var(--border)', paddingTop: 20 }}>
              {FREE_FEATURES.map((f, i) => (<div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}><span style={{ color: 'var(--text3)', fontSize: 14 }}>○</span><span style={{ fontSize: 13, color: 'var(--text2)' }}>{f}</span></div>))}
            </div>
          </div>

          {/* Pro */}
          <div style={{ background: 'var(--bg2)', border: '2px solid var(--accent)', borderRadius: 'var(--radius-xl)', padding: 28, position: 'relative' }}>
            <div style={{ position: 'absolute', top: -12, left: '50%', transform: 'translateX(-50%)', background: 'var(--accent)', color: '#fff', fontSize: 11, fontWeight: 500, padding: '3px 14px', borderRadius: 99, whiteSpace: 'nowrap' }}>30일 무료 체험</div>
            <div style={{ marginBottom: 24 }}>
              <div style={{ fontSize: 13, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Pro</div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
                <span style={{ fontFamily: 'var(--font-serif)', fontSize: 40 }}>{yearly ? '29,900' : '3,300'}원</span>
                <span style={{ color: 'var(--text3)', fontSize: 13 }}>{yearly ? '/년' : '/월'}</span>
              </div>
              <div style={{ color: 'var(--text3)', fontSize: 12, marginTop: 4 }}>{yearly ? '월 2,492원 · 25% 할인' : '연간 결제 시 25% 할인'}</div>
            </div>
            <button className={`btn ${isCurrentPlan(yearly ? 'yearly' : 'monthly') ? '' : 'btn-primary'}`}
              style={{ width: '100%', justifyContent: 'center', height: 42, fontSize: 14, marginBottom: isReserved(yearly ? 'yearly' : 'monthly') || canReserve(yearly ? 'yearly' : 'monthly') ? 8 : 24, cursor: isCurrentPlan(yearly ? 'yearly' : 'monthly') ? 'default' : 'pointer' }}
              onClick={() => {
                if (isCurrentPlan(yearly ? 'yearly' : 'monthly')) return;
                if (canReserve(yearly ? 'yearly' : 'monthly')) {
                  handleReservePlan(yearly ? 'yearly' : 'monthly');
                } else {
                  handlePayment();
                }
              }}
              disabled={isCurrentPlan(yearly ? 'yearly' : 'monthly') || paying || reserving || isReserved(yearly ? 'yearly' : 'monthly')}>
              {isCurrentPlan(yearly ? 'yearly' : 'monthly')
                ? '✦ 현재 플랜'
                : isReserved(yearly ? 'yearly' : 'monthly')
                  ? '✓ 전환 예약됨'
                  : canReserve(yearly ? 'yearly' : 'monthly')
                    ? (reserving ? '처리 중...' : `다음 결제일부터 전환`)
                    : (paying ? '처리 중...' : '30일 무료로 시작하기')}
            </button>
            {/* 예약 안내 문구 + 예약 취소 */}
            {isReserved(yearly ? 'yearly' : 'monthly') && (
              <div style={{ textAlign: 'center', marginBottom: 16 }}>
                <p style={{ fontSize: 11, color: 'var(--accent)', marginBottom: 4 }}>
                  {formatDate(currentPeriodEnd)}부터 적용돼요
                </p>
                <button
                  style={{ fontSize: 11, color: 'var(--text3)', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}
                  onClick={handleCancelPendingPlan} disabled={cancellingPlan}>
                  {cancellingPlan ? '처리 중...' : '예약 취소'}
                </button>
              </div>
            )}
            {canReserve(yearly ? 'yearly' : 'monthly') && !isReserved(yearly ? 'yearly' : 'monthly') && (
              <p style={{ fontSize: 11, color: 'var(--text3)', textAlign: 'center', marginBottom: 16 }}>
                현재 기간 종료 후 전환 ({formatDate(currentPeriodEnd)})
              </p>
            )}
            <div style={{ borderTop: '1px solid var(--border)', paddingTop: 20 }}>
              {PRO_FEATURES.map((f, i) => (<div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}><span style={{ color: 'var(--accent)', fontSize: 14 }}>✦</span><span style={{ fontSize: 13, color: 'var(--text)' }}>{f}</span></div>))}
            </div>
          </div>

          {/* Enterprise */}
          <div style={{ background: 'var(--bg2)', border: '1px solid var(--border2)', borderRadius: 'var(--radius-xl)', padding: 28 }}>
            <div style={{ marginBottom: 24 }}>
              <div style={{ fontSize: 13, color: 'var(--teal, #2dd4bf)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Enterprise</div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}><span style={{ fontFamily: 'var(--font-serif)', fontSize: 28, color: 'var(--text)' }}>맞춤 견적</span></div>
              <div style={{ color: 'var(--text3)', fontSize: 12, marginTop: 4 }}>30명 이상 팀을 위한 맞춤 견적</div>
            </div>
            <a href="https://mail.google.com/mail/?view=cm&to=histy.cartographic@gmail.com&subject=Cartographic%20Enterprise%20%EB%AC%B8%EC%9D%98"
              target="_blank" rel="noopener noreferrer"
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 42, fontSize: 14, marginBottom: 24, border: '1px solid var(--border2)', borderRadius: 'var(--radius)', color: 'var(--text)', textDecoration: 'none', background: 'transparent', cursor: 'pointer', transition: 'background 0.2s' }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--bg3)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>문의하기 →</a>
            <div style={{ borderTop: '1px solid var(--border)', paddingTop: 20 }}>
              {ENTERPRISE_FEATURES.map((f, i) => (<div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}><span style={{ color: '#2dd4bf', fontSize: 14 }}>✦</span><span style={{ fontSize: 13, color: 'var(--text2)' }}>{f}</span></div>))}
            </div>
          </div>
        </div>

        <div style={{ textAlign: 'center', marginTop: 40, padding: '20px', background: 'var(--bg2)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border)' }}>
          <p style={{ fontSize: 13, color: 'var(--text2)' }}>서비스 이용 시작 전 취소 시 전액 환불 · 이용 시작 후 환불 불가 (전자상거래법 제17조 제2항 제5호) · 언제든지 해지 가능</p>
          <p style={{ fontSize: 12, color: 'var(--text3)', marginTop: 6 }}>무료 플랜으로 먼저 체험 후 결제를 권장합니다 · 문의: histy.cartographic@gmail.com</p>
        </div>
      </main>

      <footer style={{ borderTop: '1px solid var(--border)', padding: '24px 20px', background: 'var(--bg2)' }}>
        <div style={{ maxWidth: 800, margin: '0 auto', fontSize: 11, color: 'var(--text3)', lineHeight: 2, textAlign: 'center' }}>
          <p>상호명: 히스티 · 대표자: 우연우 · 사업자등록번호: 162-18-02499</p>
          <p>주소: 서울특별시 광진구 구의강변로 11 · 이메일: histy.cartographic@gmail.com</p>
        </div>
      </footer>
    </div>
  );
}
