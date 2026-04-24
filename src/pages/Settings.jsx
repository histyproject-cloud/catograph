import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { signOut } from 'firebase/auth';
import { auth, app } from '../firebase';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { isPro, getSubscriptionLabel } from '../config/plans';

export default function Settings({ user, onShowOnboarding, theme, onToggleTheme }) {
  const navigate = useNavigate();
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const handleDeleteAccount = async () => {
    if (!window.confirm('정말 탈퇴하시겠어요? 모든 데이터가 삭제되며 복구할 수 없습니다.')) return;
    setDeletingAccount(true);
    try {
      const functions = getFunctions(app, 'asia-northeast3');
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

  const pro = isPro(user);
  const planLabel = getSubscriptionLabel(user);

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

        {/* 플랜 */}
        <section style={{ background: 'var(--bg2)', border: `1px solid ${pro ? 'var(--accent)' : 'var(--border)'}`, borderRadius: 'var(--radius-lg)', padding: 24, marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: pro ? 16 : 0 }}>
            <div>
              <div style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 4 }}>현재 플랜</div>
              <div style={{ fontSize: 18, fontWeight: 600, color: pro ? 'var(--accent)' : 'var(--text)' }}>
                {pro ? '✦ Pro' : 'Free'}
              </div>
              <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 2 }}>{planLabel}</div>
            </div>
            {!pro && (
              <button className="btn btn-primary" style={{ fontSize: 13, padding: '0 16px', height: 36 }}
                onClick={() => navigate('/pricing')}>
                업그레이드
              </button>
            )}
          </div>
          {pro && (
            <div style={{ borderTop: '1px solid var(--border)', paddingTop: 16, fontSize: 13, color: 'var(--text3)' }}>
              구독 관련 문의는 <strong style={{ color: 'var(--text2)' }}>histy.cartographic@gmail.com</strong> 으로 연락해 주세요.
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
          <button className="btn" style={{ fontSize: 13, padding: '0 16px', height: 36 }}
            onClick={() => { onShowOnboarding?.(); navigate('/'); }}>
            온보딩 다시 보기
          </button>
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
