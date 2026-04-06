import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db, auth } from '../firebase';

export default function PaymentSuccess() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [status, setStatus] = useState('processing'); // processing | done | error

  useEffect(() => {
    const confirm = async () => {
      try {
        const authKey = params.get('authKey');
        const customerKey = params.get('customerKey');
        const orderId = params.get('orderId');
        const amount = params.get('amount');
        const yearly = params.get('yearly') === 'true';

        if (!authKey || !customerKey) throw new Error('파라미터 없음');

        // 토스 빌링키 발급 요청 (서버리스 함수에서 처리해야 하지만 테스트용으로 Firestore에 저장)
        const user = auth.currentUser;
        if (!user) throw new Error('로그인 필요');

        // 구독 정보 저장 (실제 서비스에서는 Cloud Functions 웹훅으로 처리)
        const now = new Date();
        const periodEnd = new Date(now);
        if (yearly) {
          periodEnd.setFullYear(periodEnd.getFullYear() + 1);
        } else {
          periodEnd.setMonth(periodEnd.getMonth() + 1);
        }

        await setDoc(doc(db, 'users', user.uid), {
          subscription: {
            status: 'active',
            plan: yearly ? 'yearly' : 'monthly',
            amount: Number(amount),
            authKey,
            customerKey,
            orderId,
            startedAt: serverTimestamp(),
            currentPeriodEnd: periodEnd,
          }
        }, { merge: true });

        setStatus('done');
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
              이제 모든 기능을 무제한으로 사용할 수 있어요.
            </p>
            <button className="btn btn-primary" style={{ height: 44, padding: '0 32px', fontSize: 14 }} onClick={() => navigate('/')}>
              시작하기 →
            </button>
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
            <button className="btn" style={{ height: 44, padding: '0 32px', fontSize: 14 }} onClick={() => navigate('/')}>
              홈으로
            </button>
          </>
        )}
      </div>
    </div>
  );
}
