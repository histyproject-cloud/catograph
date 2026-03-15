import React, { useState } from 'react';
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
      navigate(`/project/${ref.id}`);
    } catch { setCreating(false); }
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <header style={{ height: 56, display: 'flex', alignItems: 'center', padding: '0 20px', gap: 10, borderBottom: '1px solid var(--border)', background: 'var(--bg2)', position: 'sticky', top: 0, zIndex: 10 }}>
        <LogoMark />
        <span style={{ fontFamily: 'var(--font-serif)', fontSize: 20, letterSpacing: '-0.02em' }}>Cartograph</span>
        <div style={{ flex: 1 }} />
        {user.photoURL && <img src={user.photoURL} alt="" style={{ width: 28, height: 28, borderRadius: '50%' }} />}
        <button className="btn btn-ghost" style={{ fontSize: 12 }} onClick={() => signOut(auth)}>로그아웃</button>
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
          <div style={{ border: '1px dashed var(--border2)', borderRadius: 'var(--radius-lg)', padding: '60px 20px', textAlign: 'center' }}>
            <div style={{ fontSize: 28, marginBottom: 12, opacity: 0.3 }}>✦</div>
            <p style={{ color: 'var(--text2)', marginBottom: 20, fontSize: 14 }}>아직 작품이 없어요</p>
            <button className="btn btn-primary" onClick={handleNewClick}>첫 작품 만들기</button>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 14 }}>
            {projects.map(p => <ProjectCard key={p.id} project={p} onClick={() => navigate(`/project/${p.id}`)} onDelete={() => deleteProject(p.id)} onRename={(name) => updateProject(p.id, { name })} />)}
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
    </div>
  );
}

function ProjectCard({ project, onClick, onDelete, onRename }) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(project.name);

  const handleRename = (e) => {
    e.stopPropagation();
    if (name.trim() && name !== project.name) onRename(name.trim());
    setEditing(false);
  };

  return (
    <div
      onClick={() => !editing && onClick()}
      style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: 18, cursor: editing ? 'default' : 'pointer', position: 'relative', transition: 'border-color 0.15s' }}
      onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--border2)'}
      onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
    >
      <div style={{ width: 38, height: 38, background: 'var(--accent-glow)', border: '1px solid rgba(139,124,248,0.25)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 12, fontSize: 16 }}>✦</div>

      {editing ? (
        <input
          value={name}
          onChange={e => setName(e.target.value)}
          onBlur={handleRename}
          onKeyDown={e => { if (e.key === 'Enter') handleRename(e); if (e.key === 'Escape') { setName(project.name); setEditing(false); } }}
          onClick={e => e.stopPropagation()}
          style={{ width: '100%', fontSize: 14, fontWeight: 500, marginBottom: 4 }}
          autoFocus
        />
      ) : (
        <div style={{ fontWeight: 500, fontSize: 15, marginBottom: 4, paddingRight: 60 }}>{project.name}</div>
      )}

      <div style={{ color: 'var(--text3)', fontSize: 11 }}>{project.createdAt?.toDate?.()?.toLocaleDateString('ko-KR') || '방금 전'}</div>

      {/* 항상 보이는 수정/삭제 버튼 */}
      <div style={{ position: 'absolute', top: 12, right: 12, display: 'flex', gap: 4 }}>
        <button
          className="btn btn-ghost"
          style={{ fontSize: 11, height: 26, padding: '0 8px', color: 'var(--text3)' }}
          onClick={e => { e.stopPropagation(); setEditing(true); }}
        >수정</button>
        <button
          className="btn btn-ghost"
          style={{ fontSize: 11, height: 26, padding: '0 8px', color: 'var(--coral)' }}
          onClick={e => { e.stopPropagation(); if (window.confirm(`'${project.name}' 삭제할까요?`)) onDelete(); }}
        >삭제</button>
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
