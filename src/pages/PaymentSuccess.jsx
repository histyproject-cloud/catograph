import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { onAuthStateChanged } from 'firebase/auth';
import { auth, app } from '../firebase';

export default function PaymentSuccess() {
  const [params] = useSearchParams();
  const [status, setStatus] = useState('processing');

  useEffect(() => {
    const confirm = async () => {
      try {
        const authKey = params.get('authKey');
        const customerKey = params.get('customerKey');
        const orderId = params.get('orderId');
        const amount = params.get('amount');
        const yearly = params.get('yearly') === 'true';

        if (!authKey || !customerKey) throw new Error('파라미터 없음');

        // ── Firebase Auth 세션 복원 대기 (리디렉션 후 currentUser가 null일 수 있음) ──
        const user = await new Promise((resolve) => {
          const unsub = onAuthStateChanged(auth, (u) => { unsub(); resolve(u); });
        });
        if (!user) throw new Error('로그인 필요');

        // ── 빌링키 발급 + 구독 활성화 (Cloud Function에서 통합 처리) ──
        // 중복 실행 방지(orderId 기반)도 Function 내부에서 처리됨
        const functions = getFunctions(app, 'asia-northeast3');
        const issueBillingKey = httpsCallable(functions, 'issueBillingKey');
        await issueBillingKey({ authKey, customerKey, yearly, orderId, amount });

        setStatus('done');
        setTimeout(() => { window.location.href = '/'; }, 3000);

      } catch (e) {
        console.error(e);
        setStatus('error');
      }
    };
    confirm();
  }, [params]);

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ textAlign: 'center', maxWidth: 400 }}>
        {status === 'processing' && (
          <>
            <div style={{ width: 40, height: 40, border: '3px solid var(--accent)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 24px' }} />
            <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
            <div style={{ fontFamily: 'var(--font-serif)', fontSize: 22, color: 'var(--text)', marginBottom: 8 }}>결제 처리 중...</div>
            <p style={{ fontSize: 13, color: 'var(--text3)' }}>잠시만 기다려 주세요.</p>
          </>
        )}
        {status === 'done' && (
          <>
            <div style={{ fontSize: 52, marginBottom: 16 }}>✦</div>
            <div style={{ fontFamily: 'var(--font-serif)', fontSize: 26, color: 'var(--text)', marginBottom: 12 }}>결제가 완료됐어요!</div>
            <p style={{ fontSize: 14, color: 'var(--text2)', lineHeight: 1.8, marginBottom: 32 }}>
              Pro 플랜이 활성화됐어요.<br />
              잠시 후 홈으로 이동합니다...
            </p>
            <div style={{ width: '100%', height: 4, background: 'var(--bg3)', borderRadius: 99, overflow: 'hidden' }}>
              <div style={{ height: '100%', background: 'var(--accent)', borderRadius: 99, animation: 'progress 3s linear forwards' }} />
            </div>
            <style>{`@keyframes progress { from { width: 0% } to { width: 100% } }`}</style>
          </>
        )}
        {status === 'error' && (
          <>
            <div style={{ fontSize: 40, marginBottom: 16 }}>⚠️</div>
            <div style={{ fontFamily: 'var(--font-serif)', fontSize: 22, color: 'var(--text)', marginBottom: 12 }}>결제 처리 중 문제가 생겼어요</div>
            <p style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.8, marginBottom: 32 }}>
              결제는 완료됐을 수 있어요.<br />
              histy.cartographic@gmail.com 으로 문의해 주세요.
            </p>
            <button className="btn" style={{ height: 44, padding: '0 32px', fontSize: 14 }} onClick={() => window.location.href = '/'}>
              홈으로
            </button>
          </>
        )}
      </div>
    </div>
  );
}
