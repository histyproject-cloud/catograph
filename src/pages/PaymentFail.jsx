import React from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

export default function PaymentFail() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const message = params.get('message') || '결제가 취소됐거나 오류가 발생했어요.';

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ textAlign: 'center', maxWidth: 400 }}>
        <div style={{ fontSize: 40, marginBottom: 16 }}>✕</div>
        <div style={{ fontFamily: 'var(--font-serif)', fontSize: 24, color: 'var(--text)', marginBottom: 12 }}>결제에 실패했어요</div>
        <p style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.8, marginBottom: 32 }}>
          {message}<br />
          문의: histy.cartographic@gmail.com
        </p>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
          <button className="btn" style={{ height: 44, padding: '0 24px', fontSize: 14 }} onClick={() => navigate('/')}>홈으로</button>
          <button className="btn btn-primary" style={{ height: 44, padding: '0 24px', fontSize: 14 }} onClick={() => navigate('/pricing')}>다시 시도</button>
        </div>
      </div>
    </div>
  );
}
