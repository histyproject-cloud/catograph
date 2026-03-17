import React from 'react';
import { signInWithPopup } from 'firebase/auth';
import { useNavigate } from 'react-router-dom';
import { auth, googleProvider } from '../firebase';

export default function Login() {
  const navigate = useNavigate();

  const handleGoogle = async () => {
    try { await signInWithPopup(auth, googleProvider); }
    catch (e) { console.error(e); }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)', padding: 24 }}>
      <div style={{ textAlign: 'center', width: '100%', maxWidth: 380 }}>
        <div style={{ marginBottom: 32 }}>
          <Logo size={52} />
          <div style={{ fontFamily: 'var(--font-serif)', fontSize: 38, letterSpacing: '-0.02em', marginTop: 12 }}>Cartograph</div>
          <div style={{ color: 'var(--text2)', fontSize: 14, marginTop: 8 }}>세계관을 그리는 창작 허브</div>
        </div>
        <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 'var(--radius-xl)', padding: '28px 24px' }}>
          <p style={{ color: 'var(--text2)', fontSize: 13, marginBottom: 24, lineHeight: 1.8 }}>
            캐릭터 관계도 · 세계관 설정 · 복선 관리<br />
            창작의 모든 것을 한 곳에서
          </p>
          <button className="btn btn-primary" onClick={handleGoogle} style={{ width: '100%', height: 44, fontSize: 14, gap: 10 }}>
            <GoogleIcon />
            Google로 시작하기
          </button>
        </div>
        <p style={{ color: 'var(--text3)', fontSize: 11, marginTop: 20, letterSpacing: '0.04em' }}>작가와 독자가 함께 만드는 이야기 공간</p>
        <p style={{ color: 'var(--text3)', fontSize: 11, marginTop: 8 }}>
          <span style={{ cursor: 'pointer', textDecoration: 'underline' }} onClick={() => navigate('/legal')}>개인정보처리방침</span>
          {' · '}
          <span style={{ cursor: 'pointer', textDecoration: 'underline' }} onClick={() => navigate('/legal')}>이용약관</span>
        </p>
      </div>
    </div>
  );
}

function Logo({ size = 40 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" style={{ margin: '0 auto', display: 'block' }}>
      <circle cx="24" cy="24" r="22" stroke="var(--accent)" strokeWidth="1.2" strokeDasharray="4 3" opacity="0.6" />
      <circle cx="24" cy="24" r="3" fill="var(--accent)" />
      <circle cx="11" cy="15" r="2.5" fill="var(--accent)" opacity="0.5" />
      <circle cx="37" cy="15" r="2.5" fill="var(--accent)" opacity="0.5" />
      <circle cx="11" cy="33" r="2.5" fill="var(--accent)" opacity="0.5" />
      <circle cx="37" cy="33" r="2.5" fill="var(--accent)" opacity="0.5" />
      <line x1="24" y1="24" x2="11" y2="15" stroke="var(--accent)" strokeWidth="1" opacity="0.35" />
      <line x1="24" y1="24" x2="37" y2="15" stroke="var(--accent)" strokeWidth="1" opacity="0.35" />
      <line x1="24" y1="24" x2="11" y2="33" stroke="var(--accent)" strokeWidth="1" opacity="0.35" />
      <line x1="24" y1="24" x2="37" y2="33" stroke="var(--accent)" strokeWidth="1" opacity="0.35" />
    </svg>
  );
}

function GoogleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path d="M15.68 8.18c0-.57-.05-1.11-.14-1.64H8v3.1h4.3a3.67 3.67 0 0 1-1.59 2.41v2h2.57c1.5-1.38 2.4-3.42 2.4-5.87z" fill="#4285F4"/>
      <path d="M8 16c2.16 0 3.97-.71 5.3-1.93l-2.57-2a4.8 4.8 0 0 1-7.15-2.53H.97v2.06A8 8 0 0 0 8 16z" fill="#34A853"/>
      <path d="M3.58 9.54A4.82 4.82 0 0 1 3.33 8c0-.54.09-1.06.25-1.54V4.4H.97A8 8 0 0 0 0 8c0 1.29.31 2.51.97 3.6l2.61-2.06z" fill="#FBBC05"/>
      <path d="M8 3.18c1.22 0 2.31.42 3.17 1.24l2.37-2.37A8 8 0 0 0 .97 4.4l2.61 2.06A4.77 4.77 0 0 1 8 3.18z" fill="#EA4335"/>
    </svg>
  );
}
