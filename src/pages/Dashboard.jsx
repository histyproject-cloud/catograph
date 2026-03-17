import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { signOut } from 'firebase/auth';
import { auth } from '../firebase';
import { useProjects } from '../hooks/useProject';
import { FREE_LIMITS, LIMIT_MESSAGES, isPro } from '../config/plans';
import UpgradeModal from '../components/UpgradeModal';

export default function Dashboard({ user }) {
  const navigate = useNavigate();
  const { projects, loading, createProject, deleteProject, updateProject } = useProjects(user.uid);
  const [showNew, setShowNew] = useState(false);
  const [newName, setNewName] = useState('');
  const [creating, setCreating] = useState(false);
  const [upgradeMsg, setUpgradeMsg] = useState(null);
  const [showProfile, setShowProfile] = useState(false);
  const profileRef = useRef(null);

  useEffect(() => {
    const handler = (e) => { if (profileRef.current && !profileRef.current.contains(e.target)) setShowProfile(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleNewClick = () => {
    if (!isPro(user) && projects.length >= FREE_LIMITS.projects) {
      setUpgradeMsg(LIMIT_MESSAGES.projects);
      return;
    }
    setShowNew(true);
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!newName.trim()) return;
    setCreating(true);
    try {
      const ref = await createProject(newName.trim());
      navigate('/project/' + ref.id);
    } catch { setCreating(false); }
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <header style={{ height: 56, display: 'flex', alignItems: 'center', padding: '0 20px', gap: 10, borderBottom: '1px solid var(--border)', background: 'var(--bg2)', position: 'sticky', top: 0, zIndex: 10 }}>
        <LogoMark />
        <span style={{ fontFamily: 'var(--font-serif)', fontSize: 20, letterSpacing: '-0.02em' }}>Cartograph</span>
        <div style={{ flex: 1 }} />
        <div ref={profileRef} style={{ position: 'relative' }}>
          <button
            onClick={() => setShowProfile(v => !v)}
            style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'none', border: 'none', cursor: 'pointer', padding: '4px 8px', borderRadius: 'var(--radius)' }}
          >
            {user.photoURL
              ? <img src={user.photoURL} alt="" style={{ width: 28, height: 28, borderRadius: '50%' }} />
              : <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--accent-glow)', border: '1px solid var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, color: 'var(--accent)' }}>{user.displayName?.[0] || 'U'}</div>
            }
            <span style={{ fontSize: 13, color: 'var(--text2)' }}>{user.displayName?.split(' ')[0]}</span>
            <span style={{ fontSize: 10, color: 'var(--text3)' }}>▾</span>
          </button>
          {showProfile && (
            <div style={{ position: 'absolute', top: 'calc(100% + 8px)', right: 0, background: 'var(--bg2)', border: '1px solid var(--border2)', borderRadius: 'var(--radius-lg)', padding: 8, minWidth: 210, boxShadow: '0 8px 24px rgba(0,0,0,0.4)', zIndex: 100, animation: 'slideUp 0.15s ease' }}>
              <div style={{ padding: '8px 12px 12px', borderBottom: '1px solid var(--border)' }}>
                <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)', marginBottom: 2 }}>{user.displayName}</div>
                <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 8 }}>{user.email}</div>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: 'var(--bg3)', borderRadius: 99, padding: '3px 10px' }}>
                  <span style={{ fontSize: 10, color: 'var(--text3)' }}>플랜</span>
                  <span style={{ fontSize: 11, fontWeight: 500, color: isPro(user) ? 'var(--teal)' : 'var(--text2)' }}>{isPro(user) ? 'Pro ✦' : 'Free'}</span>
                </div>
              </div>
              <div style={{ padding: '6px 0' }}>
                {!isPro(user) && (
                  <MenuItem color="var(--accent)" onClick={() => { setUpgradeMsg('더 많은 기능을 사용하려면 Pro 플랜으로 업그레이드하세요.'); setShowProfile(false); }}>✦ Pro로 업그레이드</MenuItem>
                )}
                <MenuItem onClick={() => { navigate('/legal'); setShowProfile(false); }}>이용약관 · 개인정보처리방침</MenuItem>
                <MenuItem color="var(--coral)" onClick={() => { signOut(auth); setShowProfile(false); }}>로그아웃</MenuItem>
              </div>
            </div>
          )}
        </div>
      </header>

      <main style={{ maxWidth: 900, margin: '0 auto', padding: '40px 20px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 28, flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: 28, letterSpacing: '-0.02em' }}>내 작품</h1>
            <p style={{ color: 'var(--text2)', fontSize: 13, marginTop: 4 }}>세계관을 그려나가세요</p>
          </div>
          <button className="btn btn-primary" onClick={handleNewClick}>+ 새 작품</button>
        </div>

        {loading ? (
          <div style={{ color: 'var(--text3)', textAlign: 'center', padding: 60 }}>불러오는 중...</div>
        ) : projects.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '48px 20px' }}>
            {/* 메인 CTA */}
            <div style={{ marginBottom: 48 }}>
              <div style={{ fontSize: 40, marginBottom: 16, opacity: 0.5 }}>✦</div>
              <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: 22, marginBottom: 8 }}>첫 작품을 시작해보세요</h2>
              <p style={{ color: 'var(--text3)', fontSize: 13, marginBottom: 24, lineHeight: 1.7 }}>
                캐릭터 관계도부터 복선 관리까지<br />창작의 모든 것을 한 곳에서
              </p>
              <button className="btn btn-primary" style={{ height: 44, padding: '0 28px', fontSize: 14 }} onClick={handleNewClick}>
                + 첫 작품 만들기
              </button>
            </div>

            {/* 기능 소개 */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 14, maxWidth: 700, margin: '0 auto' }}>
              {[
                { icon: '🕸️', title: '캐릭터 관계도', desc: '인물 카드를 자유롭게 배치하고 관계선으로 연결해요' },
                { icon: '✦', title: '복선 관리', desc: '심은 복선과 회수 회차를 한눈에 추적해요' },
                { icon: '📅', title: '타임라인', desc: '화수별 사건을 정리하고 등장인물을 연결해요' },
                { icon: '🌍', title: '세계관 문서', desc: '설정집을 자유롭게 작성하고 보관해요' },
                { icon: '☆', title: '2차창작 모음', desc: '팬아트, 팬픽 링크를 작품별로 저장해요' },
                { icon: '🔗', title: '공유 기능', desc: '읽기 전용 링크로 협업자와 설정을 공유해요' },
              ].map((f, i) => (
                <div key={i} style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '18px 16px', textAlign: 'left' }}>
                  <div style={{ fontSize: 22, marginBottom: 8 }}>{f.icon}</div>
                  <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4, color: 'var(--text)' }}>{f.title}</div>
                  <div style={{ fontSize: 12, color: 'var(--text3)', lineHeight: 1.6 }}>{f.desc}</div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 14 }}>
            {projects.map(p => (
              <ProjectCard key={p.id} project={p} onClick={() => navigate('/project/' + p.id)} onDelete={() => deleteProject(p.id)} onRename={(name) => updateProject(p.id, { name })} />
            ))}
          </div>
        )}
      </main>

      {showNew && (
        <div className="modal-backdrop" onClick={() => setShowNew(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-title">새 작품 만들기</div>
            <form onSubmit={handleCreate}>
              <div className="form-group">
                <label className="form-label">작품 제목</label>
                <input value={newName} onChange={e => setNewName(e.target.value)} placeholder="예: 어둠의 궤적" style={{ width: '100%' }} autoFocus />
              </div>
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 20 }}>
                <button type="button" className="btn" onClick={() => setShowNew(false)}>취소</button>
                <button type="submit" className="btn btn-primary" disabled={creating || !newName.trim()}>{creating ? '생성 중...' : '만들기'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <UpgradeModal message={upgradeMsg} onClose={() => setUpgradeMsg(null)} />

      {/* Footer */}
      <footer style={{ borderTop: '1px solid var(--border)', padding: '24px 20px', background: 'var(--bg2)', marginTop: 40 }}>
        <div style={{ maxWidth: 900, margin: '0 auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 16 }}>
            <div style={{ display: 'flex', gap: 16 }}>
              <span style={{ fontSize: 12, color: 'var(--text3)', cursor: 'pointer' }} onClick={() => navigate('/pricing')}>요금제</span>
              <span style={{ fontSize: 12, color: 'var(--text3)', cursor: 'pointer' }} onClick={() => navigate('/legal')}>이용약관</span>
              <span style={{ fontSize: 12, color: 'var(--text3)', cursor: 'pointer' }} onClick={() => navigate('/legal')}>개인정보처리방침</span>
              <span style={{ fontSize: 12, color: 'var(--text3)', cursor: 'pointer' }} onClick={() => navigate('/legal?tab=refund')}>환불 정책</span>
            </div>
            <span style={{ fontSize: 12, color: 'var(--text3)' }}>© 2026 Histy</span>
          </div>
          <div style={{ fontSize: 11, color: 'var(--text3)', lineHeight: 1.9 }}>
            <p>상호명: 히스티 · 사업자등록번호: 162-18-02499 · 대표자: (대표자명) · 전화: 010-5629-4236</p>
            <p>주소: 서울특별시 광진구 구의강변로 11 · 이메일: cartograph.help@gmail.com</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

function MenuItem({ children, onClick, color }) {
  return (
    <button onClick={onClick} style={{ width: '100%', textAlign: 'left', padding: '8px 12px', border: 'none', background: 'none', cursor: 'pointer', fontSize: 13, color: color || 'var(--text2)', borderRadius: 6, display: 'block' }}
      onMouseEnter={e => e.currentTarget.style.background = 'var(--bg3)'}
      onMouseLeave={e => e.currentTarget.style.background = 'none'}
    >{children}</button>
  );
}

function ProjectCard({ project, onClick, onDelete, onRename }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(project.name);
  const menuRef = useRef(null);

  useEffect(() => {
    const handler = (e) => { if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleRename = (e) => {
    e?.stopPropagation();
    if (name.trim() && name !== project.name) onRename(name.trim());
    setEditing(false);
  };

  return (
    <div
      onClick={() => !editing && !menuOpen && onClick()}
      style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: 18, cursor: editing ? 'default' : 'pointer', position: 'relative', transition: 'border-color 0.15s' }}
      onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--border2)'}
      onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
    >
      <div style={{ width: 38, height: 38, background: 'var(--accent-glow)', border: '1px solid rgba(139,124,248,0.25)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 12, fontSize: 16 }}>✦</div>

      {editing ? (
        <input value={name} onChange={e => setName(e.target.value)} onBlur={handleRename}
          onKeyDown={e => { if (e.key === 'Enter') handleRename(e); if (e.key === 'Escape') { setName(project.name); setEditing(false); } }}
          onClick={e => e.stopPropagation()}
          style={{ width: '100%', fontSize: 14, fontWeight: 500, marginBottom: 4, paddingRight: 32 }} autoFocus />
      ) : (
        <div style={{ fontWeight: 500, fontSize: 15, marginBottom: 4, paddingRight: 32, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{project.name}</div>
      )}
      <div style={{ color: 'var(--text3)', fontSize: 11 }}>{project.createdAt?.toDate?.()?.toLocaleDateString('ko-KR') || '방금 전'}</div>

      {/* 점 3개 */}
      <div ref={menuRef} style={{ position: 'absolute', top: 10, right: 10 }}>
        <button
          onClick={e => { e.stopPropagation(); setMenuOpen(v => !v); }}
          style={{ width: 28, height: 28, border: 'none', background: menuOpen ? 'var(--bg3)' : 'transparent', borderRadius: 6, cursor: 'pointer', color: 'var(--text3)', fontSize: 18, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          onMouseEnter={e => e.currentTarget.style.background = 'var(--bg3)'}
          onMouseLeave={e => { if (!menuOpen) e.currentTarget.style.background = 'transparent'; }}
        >⋮</button>

        {menuOpen && (
          <div style={{ position: 'absolute', top: 32, right: 0, background: 'var(--bg2)', border: '1px solid var(--border2)', borderRadius: 'var(--radius)', padding: 4, minWidth: 130, boxShadow: '0 8px 20px rgba(0,0,0,0.4)', zIndex: 50, animation: 'fadeIn 0.1s ease' }}>
            <MenuItem onClick={e => { setEditing(true); setMenuOpen(false); }}>✏️ 제목 수정</MenuItem>
            <MenuItem color="var(--coral)" onClick={e => { setMenuOpen(false); if (window.confirm("'" + project.name + "' 삭제할까요?")) onDelete(); }}>🗑️ 삭제</MenuItem>
          </div>
        )}
      </div>
    </div>
  );
}

function LogoMark() {
  return (
    <svg width="24" height="24" viewBox="0 0 48 48" fill="none">
      <circle cx="24" cy="24" r="22" stroke="var(--accent)" strokeWidth="1.5" strokeDasharray="4 3" opacity="0.7" />
      <circle cx="24" cy="24" r="3" fill="var(--accent)" />
      <circle cx="11" cy="15" r="2" fill="var(--accent)" opacity="0.5" />
      <circle cx="37" cy="15" r="2" fill="var(--accent)" opacity="0.5" />
      <circle cx="11" cy="33" r="2" fill="var(--accent)" opacity="0.5" />
      <circle cx="37" cy="33" r="2" fill="var(--accent)" opacity="0.5" />
      <line x1="24" y1="24" x2="11" y2="15" stroke="var(--accent)" strokeWidth="1" opacity="0.4" />
      <line x1="24" y1="24" x2="37" y2="15" stroke="var(--accent)" strokeWidth="1" opacity="0.4" />
      <line x1="24" y1="24" x2="11" y2="33" stroke="var(--accent)" strokeWidth="1" opacity="0.4" />
      <line x1="24" y1="24" x2="37" y2="33" stroke="var(--accent)" strokeWidth="1" opacity="0.4" />
    </svg>
  );
}
