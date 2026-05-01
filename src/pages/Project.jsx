import React, { useState, useEffect, useRef, useImperativeHandle, forwardRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db, storage } from '../firebase';
import { signOut } from 'firebase/auth';
import { auth } from '../firebase';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { useCharacters, useRelations, useForeshadows, useWorldDocs, useTimelineEvents, useFanworks } from '../hooks/useProject';
import { useBreakpoint } from '../hooks/useBreakpoint';
import Navigation from '../components/Navigation';
import DetailPanel, { getAvatarColor } from '../components/DetailPanel';
import RelationCanvas from '../components/RelationCanvas';
import TimelineView from '../components/TimelineView';
import FanworksView from '../components/FanworksView';
import UpgradeModal from '../components/UpgradeModal';
import { FREE_LIMITS, LIMIT_MESSAGES, isPro } from '../config/plans';
import { Calendar, Search } from 'lucide-react';

export default function Project({ user }) {
  const { id: projectId } = useParams();
  const navigate = useNavigate();
  const { isMobile, isTablet, isDesktop } = useBreakpoint();

  const [project, setProject] = useState(null);
  const charListRef = useRef(null);
  const [activeTab, setActiveTab] = useState('relation');
  const activeTabRef = useRef(activeTab);
  activeTabRef.current = activeTab;
  // unsaved 상태 추적 — 탭 이동 가드 (#9)
  const [worldUnsaved, setWorldUnsaved] = useState(false);
  const [pendingTab, setPendingTab] = useState(null);
  const applyTabChange = (tab) => { setActiveTab(tab); setReorderMode(false); setSelectedChar(null); };
  const handleSetActiveTab = (tab) => {
    if (tab === activeTab) return;
    if (worldUnsaved && activeTab === 'world') {
      setPendingTab(tab);
      return;
    }
    applyTabChange(tab);
  };
  const [selectedChar, setSelectedChar] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [connectMode, setConnectMode] = useState(false);
  const [connectFrom, setConnectFrom] = useState(null);
  const [showRelModal, setShowRelModal] = useState(null);
  const [relLabel, setRelLabel] = useState('');
  const [relColor, setRelColor] = useState('');
  const [showAddChar, setShowAddChar] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [upgradeMsg, setUpgradeMsg] = useState(null);
  const [reorderMode, setReorderMode] = useState(false);
  const [showDragToast, setShowDragToast] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const profileRef = React.useRef(null);

  useEffect(() => {
    const handler = (e) => { if (profileRef.current && !profileRef.current.contains(e.target)) setShowProfile(false); };
    document.addEventListener('pointerdown', handler);
    return () => document.removeEventListener('pointerdown', handler);
  }, []);

  const toggleReorderMode = () => {
    setReorderMode(v => {
      const next = !v;
      if (next) {
        setShowDragToast(true);
        setTimeout(() => setShowDragToast(false), 2000);
      }
      return next;
    });
  };

  // 제한 체크 헬퍼
  const checkLimit = (current, type) => {
    if (isPro(user)) return true;
    if (current >= FREE_LIMITS[type]) { setUpgradeMsg(LIMIT_MESSAGES[type]); return false; }
    return true;
  };

  const { characters, setCharacters, addCharacter, updateCharacter, deleteCharacter } = useCharacters(projectId);
  const { relations, setRelations, addRelation, updateRelation, deleteRelation } = useRelations(projectId);
  const { foreshadows, setForeshadows, addForeshadow, updateForeshadow, deleteForeshadow } = useForeshadows(projectId);

  // 캐릭터 삭제 후 relations·foreshadows state도 동기화
  const handleDeleteCharacter = async (charId) => {
    const { deletedRelIds, updatedFsMap } = await deleteCharacter(charId);
    setRelations(prev => prev.filter(r => !deletedRelIds.includes(r.id)));
    setForeshadows(prev => prev.map(f => updatedFsMap[f.id] !== undefined ? { ...f, charIds: updatedFsMap[f.id] } : f));
  };
  const { docs: worldDocs, addWorldDoc, updateWorldDoc, deleteWorldDoc } = useWorldDocs(projectId);
  const { events, addEvent, updateEvent, deleteEvent } = useTimelineEvents(projectId);
  const { fanworks, addFanwork, updateFanwork, deleteFanwork } = useFanworks(projectId);
  const selectedCharObj = characters.find(c => c.id === selectedChar?.id) ?? selectedChar;
  
  useEffect(() => {
    getDoc(doc(db, 'projects', projectId))
      .then(d => { if (d.exists()) setProject(d.data()); })
      .catch(err => console.error('프로젝트 로드 실패:', err));
  }, [projectId]);

  const checkLimitRef = React.useRef(checkLimit);
  React.useEffect(() => { checkLimitRef.current = checkLimit; });

  useEffect(() => {
    const handler = () => { if (checkLimitRef.current(characters.length, 'characters')) setShowAddChar(true); };
    document.addEventListener('character:add', handler);
    return () => document.removeEventListener('character:add', handler);
  }, [characters.length]);

  const handleCharClick = (char) => {
    if (connectMode) {
      if (!connectFrom) { setConnectFrom(char.id); }
      else if (connectFrom !== char.id) { setShowRelModal({ fromId: connectFrom, toId: char.id }); setConnectFrom(null); setConnectMode(false); }
    } else {
      setSelectedChar(char);
    }
  };

  const handleAddRelation = async () => {
    if (!showRelModal) return;
    await addRelation(showRelModal.fromId, showRelModal.toId, relLabel, relColor);
    setRelLabel(''); setRelColor(''); setShowRelModal(null);
  };

  const [editingTitle, setEditingTitle] = useState(false);
  const [titleInput, setTitleInput] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const handleRenameProject = async () => {
    if (titleInput.trim() && titleInput !== project?.name) {
      try {
        await updateDoc(doc(db, 'projects', projectId), { name: titleInput.trim() });
        setProject(p => ({ ...p, name: titleInput.trim() }));
      } catch (err) {
        console.error('프로젝트 이름 변경 실패:', err);
      }
    }
    setEditingTitle(false);
  };

  // 모바일/태블릿 하단 여백
  const bottomPad = (isMobile || isTablet) ? 'var(--bottombar-h)' : 0;

  return (
    <div style={{ display: 'flex', height: '100vh', flexDirection: 'column', background: 'var(--bg)', overflow: 'hidden' }}>
      {/* 헤더 */}
      <header style={{ height: 'var(--header-h)', display: 'flex', alignItems: 'center', padding: '0 12px', gap: 8, borderBottom: '1px solid var(--border)', background: 'var(--bg2)', flexShrink: 0, zIndex: 30 }}>
        {/* 햄버거 (태블릿) */}
        {isTablet && (
          <button className="btn-icon" style={{ border: 'none', background: 'none' }} onClick={() => setSidebarOpen(v => !v)}>
            <HamburgerIcon />
          </button>
        )}
        <button className="btn btn-ghost" style={{ fontSize: isMobile ? 13 : 12, padding: isMobile ? '0 10px' : '0 8px', height: isMobile ? 34 : 'auto', flexShrink: 0, fontWeight: isMobile ? 500 : 400 }} onClick={() => navigate('/')}>← 뒤로</button>
        <div style={{ width: 1, height: 16, background: 'var(--border)' }} />
        {editingTitle ? (
          <input
            value={titleInput}
            onChange={e => setTitleInput(e.target.value)}
            onBlur={handleRenameProject}
            onKeyDown={e => { if (e.key === 'Enter') handleRenameProject(); if (e.key === 'Escape') setEditingTitle(false); }}
            style={{ fontFamily: 'var(--font-serif)', fontSize: 15, flex: 1, background: 'var(--bg3)', border: '1px solid var(--accent)', borderRadius: 6, padding: '2px 8px', color: 'var(--text)', outline: 'none' }}
            autoFocus
          />
        ) : (
          <span
            onClick={() => { setTitleInput(project?.name || ''); setEditingTitle(true); }}
            title="클릭해서 제목 수정"
            style={{ fontFamily: 'var(--font-serif)', fontSize: 15, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', cursor: 'text', borderBottom: '1px dashed var(--border2)' }}
          >
            {project?.name || '...'}
          </span>
        )}
        {/* 검색 아이콘 */}
        <button className="btn btn-ghost" style={{ padding: '0 10px', height: 36, flexShrink: 0, display: 'flex', alignItems: 'center' }}
          onClick={() => { setShowSearch(true); setSearchQuery(''); }}><Search size={16} /></button>
        {/* 액션 버튼들 - 데스크톱/태블릿만 헤더에 표시 */}
        {!isMobile && activeTab === 'relation' && (
          <button
            className={`btn ${connectMode ? 'btn-primary' : ''}`}
            style={{ fontSize: 13, padding: '0 14px', height: 36 }}
            onClick={() => { setConnectMode(v => !v); setConnectFrom(null); }}
          >
            {connectMode ? (connectFrom ? '대상 선택' : '시작 선택') : '관계 연결'}
          </button>
        )}
        {!isMobile && (activeTab === 'relation' || activeTab === 'characters') && (
          <button className="btn btn-primary" style={{ fontSize: 13, padding: '0 14px', height: 36 }}
            onClick={() => {
              if (checkLimit(characters.length, 'characters')) {
                if (activeTabRef.current === 'characters') charListRef.current?.openNewChar();
                else setShowAddChar(true);
              }
            }}>
            + 캐릭터
          </button>
        )}
        {!isMobile && activeTab === 'world' && (
          <button className="btn btn-primary" style={{ fontSize: 13, padding: '0 14px', height: 36 }}
            onClick={() => { if (checkLimit(worldDocs.length, 'worldDocs')) document.dispatchEvent(new CustomEvent('worlddoc:add')); }}>
            + 새 문서
          </button>
        )}
        {!isMobile && activeTab === 'foreshadow' && (
          <button className="btn btn-primary" style={{ fontSize: 13, padding: '0 14px', height: 36 }}
            onClick={() => document.dispatchEvent(new CustomEvent('foreshadow:add'))}>
            + 복선 추가
          </button>
        )}
        {!isMobile && activeTab === 'timeline' && (
          <button className="btn btn-primary" style={{ fontSize: 13, padding: '0 14px', height: 36 }}
            onClick={() => document.dispatchEvent(new CustomEvent('timeline:add'))}>
            + 타임라인 추가
          </button>
        )}
        {!isMobile && activeTab === 'fanworks' && (
          <button className="btn btn-primary" style={{ fontSize: 13, padding: '0 14px', height: 36 }}
            onClick={() => document.dispatchEvent(new CustomEvent('fanworks:add'))}>
            + 링크 추가
          </button>
        )}
        {!isMobile && ['characters', 'world', 'foreshadow', 'timeline', 'fanworks'].includes(activeTab) && (
          <button
            className={`btn${reorderMode ? ' btn-primary' : ''}`}
            style={{ fontSize: 13, padding: '0 14px', height: 36, background: reorderMode ? 'rgba(139,124,248,0.25)' : undefined, borderColor: reorderMode ? 'var(--accent)' : undefined }}
            onClick={toggleReorderMode}
          >
            {reorderMode ? '✓ 수정 종료' : '⠿ 위치 수정'}
          </button>
        )}
        <button className="btn" style={{ fontSize: 13, padding: '0 14px', height: 36 }} onClick={() => setShowShareModal(true)}>
          공유
        </button>
        {!isMobile && (
          <a href="/how-to.html" target="_blank" rel="noopener noreferrer"
            style={{ fontSize: 13, color: 'var(--text3)', textDecoration: 'none', padding: '0 12px', height: 36, display: 'flex', alignItems: 'center', borderRadius: 'var(--radius)', border: '1px solid var(--border)', transition: 'all 0.2s', flexShrink: 0 }}
            onMouseEnter={e => { e.currentTarget.style.color = 'var(--text)'; e.currentTarget.style.borderColor = 'var(--border2)'; }}
            onMouseLeave={e => { e.currentTarget.style.color = 'var(--text3)'; e.currentTarget.style.borderColor = 'var(--border)'; }}>
            이용방법
          </a>
        )}
        {/* 프로필 드롭다운 */}
        <div ref={profileRef} style={{ position: 'relative', flexShrink: 0 }}>
          <button onClick={() => setShowProfile(v => !v)}
            style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', cursor: 'pointer', padding: '4px 6px', borderRadius: 'var(--radius)' }}>
            {user?.photoURL
              ? <img src={user.photoURL} alt="" style={{ width: 28, height: 28, borderRadius: '50%' }} />
              : <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--accent-glow)', border: '1px solid var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, color: 'var(--accent)' }}>{user?.displayName?.[0] || 'U'}</div>
            }
          </button>
          {showProfile && (
            <div style={{ position: 'absolute', top: 'calc(100% + 8px)', right: 0, background: 'var(--bg2)', border: '1px solid var(--border2)', borderRadius: 'var(--radius-lg)', padding: 8, minWidth: 210, boxShadow: '0 8px 24px rgba(0,0,0,0.4)', zIndex: 100 }}>
              <div style={{ padding: '8px 12px 12px', borderBottom: '1px solid var(--border)' }}>
                <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)', marginBottom: 2 }}>{user?.displayName}</div>
                <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 8, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 180 }}>{user?.email}</div>
                <div onClick={() => { navigate('/pricing'); setShowProfile(false); }}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: 'var(--bg3)', borderRadius: 99, padding: '3px 10px', cursor: 'pointer' }}>
                  <span style={{ fontSize: 10, color: 'var(--text3)' }}>플랜</span>
                  <span style={{ fontSize: 11, fontWeight: 500, color: isPro(user) ? 'var(--teal)' : 'var(--text2)' }}>{isPro(user) ? 'Pro ✦' : 'Free'}</span>
                </div>
              </div>
              <div style={{ padding: '6px 0' }}>
                <button onClick={() => { navigate('/settings'); setShowProfile(false); }} style={{ width: '100%', textAlign: 'left', padding: '8px 12px', border: 'none', background: 'none', cursor: 'pointer', fontSize: 13, color: 'var(--text2)', borderRadius: 6, display: 'block' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--bg3)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'none'}>마이페이지</button>
                {!isPro(user) && (
                  <button onClick={() => { navigate('/pricing'); setShowProfile(false); }} style={{ width: '100%', textAlign: 'left', padding: '8px 12px', border: 'none', background: 'none', cursor: 'pointer', fontSize: 13, color: 'var(--accent)', borderRadius: 6, display: 'block' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--bg3)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'none'}>✦ Pro로 업그레이드</button>
                )}
                <button onClick={() => { navigate('/'); setShowProfile(false); }} style={{ width: '100%', textAlign: 'left', padding: '8px 12px', border: 'none', background: 'none', cursor: 'pointer', fontSize: 13, color: 'var(--text2)', borderRadius: 6, display: 'block' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--bg3)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'none'}>← 홈으로</button>
                <div style={{ borderTop: '1px solid var(--border)', margin: '6px 0' }} />
                <button onClick={() => { signOut(auth); setShowProfile(false); }} style={{ width: '100%', textAlign: 'left', padding: '8px 12px', border: 'none', background: 'none', cursor: 'pointer', fontSize: 13, color: 'var(--coral, #f87171)', borderRadius: 6, display: 'block' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--bg3)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'none'}>로그아웃</button>
              </div>
            </div>
          )}
        </div>
      </header>

      {/* 바디 */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden', paddingBottom: bottomPad }}>
        {/* 사이드바 / 탭바 네비게이션 */}
        <Navigation
          activeTab={activeTab} setActiveTab={handleSetActiveTab}
          characters={characters} selectedChar={selectedChar} onSelectChar={handleCharClick}
          projectName={project?.name || ''}
          sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen}
        />

        {/* 메인 콘텐츠 */}
        <main id="project-main-content" style={{ flex: 1, overflow: 'hidden', display: 'flex', minWidth: 0 }}>
          {activeTab === 'relation' && (
            <RelationCanvas
              characters={characters} relations={relations}
              selectedChar={selectedChar} connectMode={connectMode} connectFrom={connectFrom}
              onCharClick={handleCharClick}
              onUpdatePosition={(id, pos) => updateCharacter(id, { position: pos })}
              onDeleteRelation={deleteRelation}
              onUpdateRelation={updateRelation}
            />
          )}
          {activeTab === 'characters' && (
            <CharacterList ref={charListRef} characters={characters} onSelect={handleCharClick} selected={selectedChar} onDelete={handleDeleteCharacter} onUpdate={updateCharacter} onAdd={addCharacter} events={events} relations={relations} foreshadows={foreshadows} reorderMode={reorderMode}
              onSaveOrder={(ordered) => ordered.forEach((c, i) => updateCharacter(c.id, { order: i }))} />
          )}
          {activeTab === 'world' && (
            <WorldView docs={worldDocs} onAdd={(title) => { if (checkLimit(worldDocs.length, 'worldDocs')) return addWorldDoc(title); }} onUpdate={updateWorldDoc} onDelete={deleteWorldDoc} reorderMode={reorderMode}
              onSaveOrder={(ordered) => ordered.forEach((d, i) => updateWorldDoc(d.id, { order: i }))}
              onUnsavedChange={setWorldUnsaved} />
          )}
          {activeTab === 'foreshadow' && (
            <ForeshadowView foreshadows={foreshadows} characters={characters} reorderMode={reorderMode}
              onAdd={(data) => { if (checkLimit(foreshadows.length, 'foreshadows')) return addForeshadow(data); }}
              onUpdate={updateForeshadow} onDelete={deleteForeshadow}
              onSaveOrder={(ordered) => ordered.forEach((f, i) => updateForeshadow(f.id, { order: i }))} />
          )}
          {activeTab === 'timeline' && (
            <TimelineView
              reorderMode={reorderMode}
              events={events} characters={characters} foreshadows={foreshadows}
              onAdd={(data) => { if (checkLimit(events.length, 'timelineEvents')) return addEvent(data); }}
              onUpdate={updateEvent} onUpdateForeshadow={updateForeshadow} onDelete={deleteEvent}
              limit={FREE_LIMITS.timelineEvents} isPro={isPro(user)}
              onSaveOrder={(ordered) => ordered.forEach((e, i) => updateEvent(e.id, { order: i }))}
            />
          )}
          {activeTab === 'fanworks' && (
            <FanworksView
              reorderMode={reorderMode}
              fanworks={fanworks}
              onAdd={addFanwork}
              onUpdate={updateFanwork}
              onDelete={deleteFanwork}
              onSaveOrder={(ordered) => ordered.forEach((f, i) => updateFanwork(f.id, { order: i }))}
            />
          )}
        </main>

        {/* 디테일 패널 (데스크톱: 고정, 태블릿: 오버레이, 모바일: 바텀시트) */}
        {selectedCharObj && (
          <DetailPanel
            character={selectedCharObj}
            onUpdate={updateCharacter}
            onClose={() => setSelectedChar(null)}
            foreshadows={foreshadows}
            onAddForeshadow={addForeshadow}
            onUpdateForeshadow={updateForeshadow}
            onDeleteForeshadow={deleteForeshadow}
          />
        )}
      </div>

      {/* 모바일 FAB - 바텀탭바 위에 플로팅 액션 버튼 */}
      {isMobile && (
        <div style={{
          position: 'fixed',
          bottom: 'calc(var(--bottombar-h) + 12px)',
          right: 16,
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
          zIndex: 40,
        }}>
          {/* 관계 연결 버튼 (relation 탭만) */}
          {activeTab === 'relation' && (
            <button
              onClick={() => { setConnectMode(v => !v); setConnectFrom(null); }}
              style={{
                width: 48, height: 48, borderRadius: '50%', cursor: 'pointer',
                background: connectMode ? 'var(--accent)' : 'var(--bg2)',
                border: `1.5px solid ${connectMode ? 'var(--accent)' : 'var(--border2)'}`,
                color: connectMode ? '#fff' : 'var(--text2)',
                fontSize: 20, display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
              }}
              title="관계 연결"
            >⇌</button>
          )}
          {/* + 추가 버튼 (탭에 따라 동작 다름) */}
          <button
            onClick={() => {
              if (activeTab === 'relation' || activeTab === 'characters') {
                if (checkLimit(characters.length, 'characters')) {
                  if (activeTabRef.current === 'characters') charListRef.current?.openNewChar();
                  else setShowAddChar(true);
                }
              } else if (activeTab === 'world') {
                if (checkLimit(worldDocs.length, 'worldDocs')) document.dispatchEvent(new CustomEvent('worlddoc:add'));
              } else if (activeTab === 'foreshadow') {
                document.dispatchEvent(new CustomEvent('foreshadow:add'));
              } else if (activeTab === 'timeline') {
                document.dispatchEvent(new CustomEvent('timeline:add'));
              } else if (activeTab === 'fanworks') {
                document.dispatchEvent(new CustomEvent('fanworks:add'));
              }
            }}
            style={{
              width: 52, height: 52, borderRadius: '50%', border: 'none', cursor: 'pointer',
              background: 'var(--accent)',
              color: '#fff',
              fontSize: 24, display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 4px 16px rgba(139,124,248,0.5)',
            }}
            title="추가"
          >+</button>
        </div>
      )}

      {/* (이전엔 모바일/태블릿용 바텀 Navigation을 별도 호출했지만, 첫 번째 Navigation이
           내부에서 환경별 분기 처리(isMobile→BottomTabBar, 이외→DesktopSidebar)하므로
           두 번 호출하면 태블릿에서 사이드바가 2번 렌더됨. 첫 번째 호출만 사용.) */}

      {/* 관계 라벨 모달 */}
      {showRelModal && (
        <div className="modal-backdrop" onClick={() => setShowRelModal(null)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 340 }}>
            <div className="modal-title">관계 설정</div>
            {/* 방향 표시 */}
            {(() => {
              const fromChar = characters.find(c => c.id === showRelModal.fromId);
              const toChar = characters.find(c => c.id === showRelModal.toId);
              if (!fromChar || !toChar) return null;
              return (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 14, padding: '8px 10px', background: 'var(--bg3)', borderRadius: 8 }}>
                  <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--accent)' }}>{fromChar.name}</span>
                  <span style={{ fontSize: 13, color: 'var(--text3)' }}>→</span>
                  <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--text2)' }}>{toChar.name}</span>
                </div>
              );
            })()}
            <div className="form-group">
              <label className="form-label">관계 설명</label>
              <input value={relLabel} onChange={e => setRelLabel(e.target.value)} placeholder="예: 동료, 적대, 연인" style={{ width: '100%' }} autoFocus onKeyDown={e => e.key === 'Enter' && handleAddRelation()} />
            </div>
            <div className="form-group">
              <label className="form-label">선 색상</label>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 4 }}>
                {[
                  { value: '', color: 'rgba(255,255,255,0.25)', label: '기본' },
                  { value: '#a89cf8', color: '#a89cf8', label: '보라' },
                  { value: '#2dd4bf', color: '#2dd4bf', label: '청록' },
                  { value: '#f87171', color: '#f87171', label: '빨강' },
                  { value: '#f59e0b', color: '#f59e0b', label: '주황' },
                  { value: '#4ade80', color: '#4ade80', label: '초록' },
                  { value: '#60a5fa', color: '#60a5fa', label: '파랑' },
                  { value: '#f472b6', color: '#f472b6', label: '분홍' },
                ].map(rc => (
                  <div key={rc.value} title={rc.label}
                    onClick={() => setRelColor(rc.value)}
                    style={{
                      width: 24, height: 24, borderRadius: '50%', cursor: 'pointer',
                      background: rc.color,
                      border: relColor === rc.value ? '2px solid #fff' : '2px solid transparent',
                      boxShadow: relColor === rc.value ? '0 0 0 1px rgba(255,255,255,0.4)' : 'none',
                      transition: 'border 0.1s, box-shadow 0.1s',
                    }}
                  />
                ))}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 16 }}>
              <button className="btn" onClick={() => setShowRelModal(null)}>취소</button>
              <button className="btn btn-primary" onClick={handleAddRelation}>연결</button>
            </div>
          </div>
        </div>
      )}

      {/* 캐릭터 추가 모달 */}
      {showAddChar && <AddCharModal onClose={() => setShowAddChar(false)} onAdd={async data => { await addCharacter(data); setShowAddChar(false); }} />}

      {/* 공유 모달 */}
      {showShareModal && (
        <ShareModal
          projectId={projectId}
          project={project}
          activeTab={activeTab}
          onClose={() => setShowShareModal(false)}
          onUpdate={(data) => setProject(p => ({ ...p, ...data }))}
        />
      )}

      {/* 드래그 안내 토스트 */}
      {showDragToast && (
        <div style={{
          position: 'fixed', bottom: 80, left: '50%', transform: 'translateX(-50%)',
          background: 'rgba(20,20,24,0.88)', backdropFilter: 'blur(8px)',
          border: '1px solid var(--border2)', borderRadius: 99,
          padding: '10px 20px', fontSize: 13, color: 'var(--text2)',
          zIndex: 999, whiteSpace: 'nowrap',
          animation: 'fadeInUp 0.2s ease',
          boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
        }}>
          ⠿ 드래그하여 각 항목의 위치를 수정하세요
        </div>
      )}

      {/* 통합 검색 모달 */}
      {showSearch && (
        <div className="modal-backdrop" onClick={() => setShowSearch(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 520, padding: 0, overflow: 'hidden' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 16px', borderBottom: '1px solid var(--border)' }}>
              <Search size={16} color="var(--text3)" />
              <input autoFocus value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                placeholder="캐릭터, 타임라인, 복선, 설정집 검색..."
                style={{ flex: 1, background: 'none', border: 'none', outline: 'none', fontSize: 15, color: 'var(--text)' }}
                onKeyDown={e => e.key === 'Escape' && setShowSearch(false)} />
              {searchQuery && <button onClick={() => setSearchQuery('')} style={{ background: 'none', border: 'none', color: 'var(--text3)', cursor: 'pointer', fontSize: 18 }}>×</button>}
            </div>
            <div style={{ maxHeight: 480, overflowY: 'auto' }}>
              {searchQuery.trim().length < 1 ? (
                <div style={{ padding: '32px 20px', textAlign: 'center', color: 'var(--text3)', fontSize: 13 }}>검색어를 입력하세요</div>
              ) : (() => {
                const q = searchQuery.toLowerCase();
                const matchedChars = characters.filter(c => c.name?.toLowerCase().includes(q) || c.role?.toLowerCase().includes(q) || c.description?.toLowerCase().includes(q) || c.tags?.some(t => t.toLowerCase().includes(q)));
                const matchedEvents = events.filter(e => e.title?.toLowerCase().includes(q) || e.description?.toLowerCase().includes(q));
                const matchedFS = foreshadows.filter(f => f.title?.toLowerCase().includes(q));
                const matchedDocs = worldDocs.filter(d => d.title?.toLowerCase().includes(q) || d.content?.toLowerCase().includes(q));
                const matchedFanworks = fanworks.filter(f => f.title?.toLowerCase().includes(q) || f.author?.toLowerCase().includes(q));
                const total = matchedChars.length + matchedEvents.length + matchedFS.length + matchedDocs.length + matchedFanworks.length;
                if (total === 0) return <div style={{ padding: '32px 20px', textAlign: 'center', color: 'var(--text3)', fontSize: 13 }}>'{searchQuery}'에 해당하는 결과가 없어요</div>;
                const ResultItem = ({ icon, title, sub, onClick }) => (
                  <div onClick={() => { onClick(); setShowSearch(false); setSearchQuery(''); }}
                    style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 16px', cursor: 'pointer' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--bg3)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'none'}>
                    <span style={{ fontSize: 14, flexShrink: 0 }}>{icon}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{title}</div>
                      {sub && <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{sub}</div>}
                    </div>
                  </div>
                );
                const SectionLabel = ({ label, count }) => (
                  <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.08em', padding: '10px 16px 4px', background: 'var(--bg3)' }}>{label} ({count})</div>
                );
                return (
                  <>
                    {matchedChars.length > 0 && <><SectionLabel label="캐릭터" count={matchedChars.length} />{matchedChars.map(c => <ResultItem key={c.id} icon="👤" title={c.name} sub={c.role} onClick={() => handleSetActiveTab('characters')} />)}</>}
                    {matchedEvents.length > 0 && <><SectionLabel label="타임라인" count={matchedEvents.length} />{matchedEvents.map(e => <ResultItem key={e.id} icon="◷" title={e.title} sub={e.episode ? `${e.episode}화` : ''} onClick={() => handleSetActiveTab('timeline')} />)}</>}
                    {matchedFS.length > 0 && <><SectionLabel label="복선" count={matchedFS.length} />{matchedFS.map(f => <ResultItem key={f.id} icon="⟡" title={f.title} sub={(f.resolved ?? !!f.resolvedEp) ? '회수 완료' : '미회수'} onClick={() => handleSetActiveTab('foreshadow')} />)}</>}
                    {matchedDocs.length > 0 && <><SectionLabel label="설정집" count={matchedDocs.length} />{matchedDocs.map(d => <ResultItem key={d.id} icon="⊞" title={d.title} sub={d.content?.slice(0, 40)} onClick={() => handleSetActiveTab('world')} />)}</>}
                    {matchedFanworks.length > 0 && <><SectionLabel label="링크" count={matchedFanworks.length} />{matchedFanworks.map(f => <ResultItem key={f.id} icon="✦" title={f.title} sub={f.author} onClick={() => handleSetActiveTab('fanworks')} />)}</>}
                  </>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      {/* 업그레이드 모달 */}
      <UpgradeModal message={upgradeMsg} onClose={() => setUpgradeMsg(null)} />
      {/* 탭 이동 시 unsaved 가드 모달 (#9) — 현재 설정집 탭 unsaved에 한정 */}
      {pendingTab && (
        <div className="modal-backdrop">
          <div style={{ position: 'absolute', inset: 0 }} onClick={() => setPendingTab(null)} />
          <div className="modal" style={{ position: 'relative', zIndex: 1, maxWidth: 360 }}>
            <div className="modal-title">저장하지 않은 변경사항이 있어요</div>
            <p style={{ color: 'var(--text2)', fontSize: 13, marginBottom: 20 }}>
              현재 탭의 변경사항이 저장되지 않았어요. 그래도 다른 탭으로 이동하시겠어요?
            </p>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn" style={{ flex: 1 }} onClick={() => setPendingTab(null)}>취소</button>
              <button className="btn btn-danger" style={{ flex: 1 }}
                onClick={() => { const t = pendingTab; setPendingTab(null); setWorldUnsaved(false); applyTabChange(t); }}>
                이동하기
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

// ── 드래그 순서 훅 (모션 포함) ──
function useDragOrder(items, onReorder) {
  const dragItem = React.useRef(null);
  const [draggingIdx, setDraggingIdx] = React.useState(null);
  const [dragOverIdx, setDragOverIdx] = React.useState(null);

  const onDragStart = (idx) => { dragItem.current = idx; setDraggingIdx(idx); };
  const onDragEnter = (idx) => { setDragOverIdx(idx); };
  const onDragEnd = () => {
    const from = dragItem.current;
    const to = dragOverIdx;
    if (from !== null && to !== null && from !== to) {
      const next = [...items];
      const dragged = next.splice(from, 1)[0];
      next.splice(to, 0, dragged);
      onReorder(next);
    }
    dragItem.current = null;
    setDraggingIdx(null);
    setDragOverIdx(null);
  };

  const getItemStyle = (idx) => {
    if (draggingIdx === null || dragOverIdx === null || draggingIdx === dragOverIdx) {
      return { transition: 'transform 0.18s cubic-bezier(0.2,0,0,1)' };
    }
    if (idx === draggingIdx) return { opacity: 0.25, transition: 'opacity 0.15s' };
    const from = draggingIdx, to = dragOverIdx;
    if (from < to && idx > from && idx <= to)
      return { transform: 'translateY(-44px)', transition: 'transform 0.18s cubic-bezier(0.2,0,0,1)' };
    if (from > to && idx >= to && idx < from)
      return { transform: 'translateY(44px)', transition: 'transform 0.18s cubic-bezier(0.2,0,0,1)' };
    return { transition: 'transform 0.18s cubic-bezier(0.2,0,0,1)' };
  };

  return { onDragStart, onDragEnter, onDragEnd, draggingIdx, dragOverIdx, getItemStyle };
}

// ── 캐릭터 목록 ──
const CharacterList = forwardRef(function CharacterList({ characters, onSelect, selected, onDelete, onUpdate, onAdd, events, relations, foreshadows, reorderMode, onSaveOrder }, ref) {
  const [detailChar, setDetailChar] = useState(null);
  const [visible, setVisible] = useState(false);
  const [orderedChars, setOrderedChars] = useState(null);
  const displayChars = orderedChars || characters;
  const { onDragStart, onDragEnter, onDragEnd, draggingIdx, dragOverIdx, getItemStyle } = useDragOrder(displayChars, setOrderedChars);
  const prevReorderMode = React.useRef(false);
  React.useEffect(() => {
    if (reorderMode && !prevReorderMode.current) setOrderedChars([...characters]);
    // reorderMode 종료 시 저장
    if (!reorderMode && prevReorderMode.current && orderedChars) {
      onSaveOrder?.(orderedChars);
    }
    prevReorderMode.current = reorderMode;
  }, [reorderMode]);

  const openDetail = (c) => {
    setDetailChar(c);
    requestAnimationFrame(() => setVisible(true));
  };

  const closeDetail = () => {
    setVisible(false);
    setTimeout(() => setDetailChar(null), 300);
  };

  useImperativeHandle(ref, () => ({
    openNewChar: () => openDetail({ id: '__new__', name: '', role: '', age: '', affiliation: '', ability: '', description: '', tags: [] }),
  }));

  const [search, setSearch] = useState('');
  const filteredChars = (orderedChars || characters).filter(c =>
    c.name?.toLowerCase().includes(search.toLowerCase()) ||
    c.role?.toLowerCase().includes(search.toLowerCase()) ||
    c.tags?.some(t => t.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
      <div style={{ height: '100%', overflowY: 'auto', padding: 20 }}>
        <p style={{ color: 'var(--text3)', fontSize: 12, marginBottom: 16 }}>작품에 등장하는 캐릭터를 추가하고 세부 정보를 정리하세요</p>
        {characters.length === 0 ? (
          <div style={{ border: '1px dashed var(--border2)', borderRadius: 'var(--radius-lg)', padding: '60px 20px', textAlign: 'center' }}>
            <div style={{ fontSize: 28, marginBottom: 12, opacity: 0.3 }}>✦</div>
            <p style={{ color: 'var(--text2)', fontSize: 14, marginBottom: 20 }}>아직 추가된 캐릭터가 없어요</p>
            <button className="btn btn-primary" onClick={() => document.dispatchEvent(new CustomEvent('character:add'))}>첫 캐릭터 추가하기</button>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: 10 }}>
            {displayChars.map((c, cIdx) => (
              <div key={c.id} draggable={reorderMode}
                onDragStart={() => reorderMode && onDragStart(cIdx)}
                onDragEnter={() => reorderMode && onDragEnter(cIdx)}
                onDragEnd={reorderMode ? onDragEnd : undefined}
                onDragOver={e => reorderMode && e.preventDefault()}
                style={{
                  cursor: reorderMode ? 'grab' : 'default',
                  borderRadius: 'var(--radius-lg)',
                  outline: reorderMode && dragOverIdx === cIdx && draggingIdx !== cIdx ? '2px solid var(--accent)' : 'none',
                  ...(reorderMode ? getItemStyle(cIdx) : {}),
                }}
              >
                <CharacterCard character={c} isSelected={selected?.id === c.id}
                  onSelect={openDetail} onDelete={onDelete} />
              </div>
            ))}
          </div>
        )}
      </div>

      {detailChar && (
        <div style={{
          position: 'absolute', inset: 0, background: 'var(--bg)', zIndex: 20,
          transform: visible ? 'translateX(0)' : 'translateX(100%)',
          transition: 'transform 0.3s cubic-bezier(0.4,0,0.2,1)',
          overflowY: 'auto',
        }}>
          <CharacterDetailPage
            character={detailChar}
            characters={characters}
            events={events}
            relations={relations}
            foreshadows={foreshadows}
            onUpdate={(id, data) => { onUpdate(id, data); setDetailChar(prev => ({ ...prev, ...data })); }}
            onAdd={async (data) => { await onAdd(data); }}
            onDelete={(id) => { onDelete(id); closeDetail(); }}
            onClose={closeDetail}
          />
        </div>
      )}
    </div>
  );
});

// ── 캐릭터 상세 전용 정적 스타일/컴포넌트 ──
// 컴포넌트를 부모 함수 내부에 두면 매 렌더마다 새 컴포넌트로 인식되어
// 자식 input이 unmount/remount되며 포커스를 잃음 (#4/#4.5 원인). 반드시 외부에 정의.
const CHAR_INPUT_STYLE = { width: '100%', background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 12px', color: 'var(--text)', fontSize: 14, outline: 'none', boxSizing: 'border-box' };

function CharField({ label, children }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</div>
      {children}
    </div>
  );
}

// ── 캐릭터 상세 전체화면 ──
function CharacterDetailPage({ character: c, characters, events, relations, foreshadows, onUpdate, onAdd, onDelete, onClose }) {
  const isNew = c.id === '__new__';
  const ac = getAvatarColor(c.name || '?');
  const [pendingDelete, setPendingDelete] = useState(false);
  const [form, setForm] = useState({
    name: c.name || '', role: c.role || '', age: c.age || '',
    affiliation: c.affiliation || '', ability: c.ability || '',
    description: c.description || '', tags: c.tags || [],
  });
  const [newTag, setNewTag] = useState('');
  const [saved, setSaved] = useState(false);
  const [uploading, setUploading] = useState(false);

  const handlePhotoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      // 파일명을 'photo'로 고정해서 항상 같은 경로에 덮어쓰기 (삭제도 동일 경로)
      const storageRef = ref(storage, `characters/${c.id}/photo`);
      await uploadBytes(storageRef, file);
      const url = await getDownloadURL(storageRef);
      onUpdate(c.id, { photoURL: url });
      setUploading(false);
    } catch (err) {
      console.error(err);
      setUploading(false);
    }
  };

  const handlePhotoDelete = async () => {
    if (!c.photoURL) return;
    try {
      // URL이 아닌 Storage path로 참조해야 함
      const storageRef = ref(storage, `characters/${c.id}/photo`);
      await deleteObject(storageRef).catch(() => {});
    } catch {}
    onUpdate(c.id, { photoURL: '' });
  };

  const save = async () => {
    if (isNew) {
      if (!form.name.trim()) return;
      await onAdd(form);
      onClose();
    } else {
      onUpdate(c.id, form);
      setSaved(true);
      setTimeout(() => setSaved(false), 1500);
    }
  };

  const addTag = (e) => {
    e.preventDefault();
    if (!newTag.trim()) return;
    setForm(f => ({ ...f, tags: [...f.tags, newTag.trim()] }));
    setNewTag('');
  };

  const myRelations = (relations || []).filter(r => r.fromId === c.id || r.toId === c.id).map(r => {
    const otherId = r.fromId === c.id ? r.toId : r.fromId;
    const other = characters.find(ch => ch.id === otherId);
    return { ...r, other };
  }).filter(r => r.other);

  const myForeshadows = (foreshadows || []).filter(f => f.charIds?.includes(c.id));
  const timelineEpisodes = (events || []).filter(ev => ev.charIds?.includes(c.id)).map(ev => ev.episode).sort((a, b) => a - b);

  // (CharField, CHAR_INPUT_STYLE은 컴포넌트 외부에 정의됨 — 포커스 유지를 위해)
  return (
    <div style={{ maxWidth: 720, margin: '0 auto', padding: '24px 20px 60px' }}>
      {/* 상단 바 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 32 }}>
        <button className="btn btn-ghost" style={{ fontSize: 13, padding: '0 12px', height: 36 }} onClick={onClose}>← 목록</button>
        <div style={{ flex: 1 }} />
        {!isNew && (pendingDelete ? (
          <>
            <button className="btn" style={{ fontSize: 13, height: 36, padding: '0 14px' }} onClick={() => setPendingDelete(false)}>취소</button>
            <button className="btn btn-danger" style={{ fontSize: 13, height: 36, padding: '0 14px' }} onClick={() => { onDelete(c.id); onClose(); }}>정말 삭제</button>
          </>
        ) : (
          <button className="btn btn-danger" style={{ fontSize: 13, height: 36, padding: '0 14px' }} onClick={() => setPendingDelete(true)}>삭제</button>
        ))}
        <button className="btn btn-primary" style={{ fontSize: 13, height: 36, padding: '0 18px' }} onClick={save}>
          {isNew ? '추가' : saved ? '✓ 저장됨' : '저장'}
        </button>
      </div>

      {/* 아바타 + 이름 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 32 }}>
        {/* 사진 업로드 (신규 추가 시에는 숨김) */}
        <label style={{ position: 'relative', cursor: isNew ? 'default' : 'pointer', flexShrink: 0, pointerEvents: isNew ? 'none' : 'auto' }}>
          <input type="file" accept="image/*" style={{ display: 'none' }} onChange={handlePhotoUpload} disabled={isNew} />
          {c.photoURL ? (
            <img src={c.photoURL} alt={form.name}
              style={{ width: 72, height: 72, borderRadius: '50%', objectFit: 'cover', objectPosition: c.photoPosition || 'center top', border: '2px solid var(--border2)' }} />
          ) : (
            <div style={{ width: 72, height: 72, borderRadius: '50%', background: ac.bg, color: ac.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-serif)', fontSize: 28, border: '2px dashed var(--border2)' }}>
              {uploading ? '…' : form.name?.[0] || '?'}
            </div>
          )}
          {/* 호버 오버레이 */}
          <div style={{
            position: 'absolute', inset: 0, borderRadius: '50%',
            background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 11, color: '#fff', opacity: 0, transition: 'opacity 0.15s',
          }}
            onMouseEnter={e => e.currentTarget.style.opacity = 1}
            onMouseLeave={e => e.currentTarget.style.opacity = 0}
          >{uploading ? '업로드 중' : '사진 변경'}</div>
        </label>
        <div style={{ flex: 1 }}>
          <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
            style={{ ...CHAR_INPUT_STYLE, fontSize: 22, fontFamily: 'var(--font-serif)', fontWeight: 600, border: 'none', background: 'transparent', padding: '4px 0', borderBottom: '1px dashed var(--border2)', borderRadius: 0, width: '100%' }}
            placeholder="이름" />
          {c.photoURL && (
            <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              {/* 사진 위치 조정 */}
              <span style={{ fontSize: 11, color: 'var(--text3)' }}>사진 위치:</span>
              {[
                { label: '상단', value: 'center top' },
                { label: '중앙', value: 'center center' },
                { label: '하단', value: 'center bottom' },
              ].map(opt => (
                <button key={opt.value}
                  onClick={() => onUpdate(c.id, { photoPosition: opt.value })}
                  className={`btn${(c.photoPosition || 'center top') === opt.value ? ' btn-primary' : ' btn-ghost'}`}
                  style={{ fontSize: 10, height: 24, padding: '0 8px' }}>
                  {opt.label}
                </button>
              ))}
              <button onClick={handlePhotoDelete}
                style={{ fontSize: 11, color: 'var(--text3)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, textDecoration: 'underline' }}>
                삭제
              </button>
            </div>
          )}
        </div>
      </div>

      {/* 기본 정보 2열 */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 4 }}>
        <CharField label="역할"><input value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))} style={CHAR_INPUT_STYLE} placeholder="예: 주인공" /></CharField>
        <CharField label="나이"><input value={form.age} onChange={e => setForm(f => ({ ...f, age: e.target.value }))} style={CHAR_INPUT_STYLE} placeholder="예: 23세" /></CharField>
        <CharField label="소속"><input value={form.affiliation} onChange={e => setForm(f => ({ ...f, affiliation: e.target.value }))} style={CHAR_INPUT_STYLE} placeholder="예: 스코틀랜드 왕궁" /></CharField>
        <CharField label="능력/특기"><input value={form.ability} onChange={e => setForm(f => ({ ...f, ability: e.target.value }))} style={CHAR_INPUT_STYLE} placeholder="예: 정치" /></CharField>
      </div>

      {/* 인물 소개 */}
      <CharField label="인물 소개">
        <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
          rows={5} style={{ ...CHAR_INPUT_STYLE, resize: 'vertical', lineHeight: 1.7 }} placeholder="인물을 자유롭게 소개해주세요..." />
      </CharField>

      {/* 성격 태그 */}
      <CharField label="성격 태그">
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
          {form.tags.map((t, i) => (
            <span key={i} className="tag" style={{ background: 'var(--bg4)', color: 'var(--text2)', cursor: 'pointer', fontSize: 12 }}
              onClick={() => setForm(f => ({ ...f, tags: f.tags.filter((_, j) => j !== i) }))}>
              {t} ×
            </span>
          ))}
        </div>
        <form onSubmit={addTag} style={{ display: 'flex', gap: 8 }}>
          <input value={newTag} onChange={e => setNewTag(e.target.value)} placeholder="태그 입력 후 엔터" style={{ ...CHAR_INPUT_STYLE, flex: 1 }} />
          <button type="submit" className="btn" style={{ height: 38, padding: '0 14px' }}>+</button>
        </form>
      </CharField>

      {/* 등장 화수 — 타임라인 연동 */}
      <CharField label="등장 화수">
        {timelineEpisodes.length > 0 ? (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {timelineEpisodes.map(ep => {
              const ev = (events || []).find(e => e.charIds?.includes(c.id) && e.episode === ep);
              return (
                <div key={ep} style={{ background: 'var(--bg3)', borderRadius: 8, padding: '6px 12px', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Calendar size={11} color="var(--accent)" />
                  <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--accent)' }}>{ep}화</span>
                  {ev?.title && <span style={{ fontSize: 11, color: 'var(--text2)' }}>{ev.title}</span>}
                </div>
              );
            })}
          </div>
        ) : (
          <div style={{ fontSize: 12, color: 'var(--text3)', padding: '8px 0' }}>
            타임라인에서 이 캐릭터를 등장인물로 추가하면 여기에 자동으로 표시돼요
          </div>
        )}
      </CharField>

      {/* 관련 복선 */}
      {myForeshadows.length > 0 && (
        <CharField label={`관련 복선 (${myForeshadows.length})`}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {myForeshadows.map(fs => (
              <div key={fs.id} style={{ background: 'var(--bg3)', borderRadius: 8, padding: '10px 14px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                  <div style={{ fontSize: 13, fontWeight: 500 }}>{fs.title}</div>
                  <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 99,
                    background: (fs.resolved ?? !!fs.resolvedEp) ? 'var(--bg4)' : 'var(--accent-glow)',
                    color: (fs.resolved ?? !!fs.resolvedEp) ? 'var(--text3)' : 'var(--accent)' }}>
                    {(fs.resolved ?? !!fs.resolvedEp) ? '회수 완료' : '미회수'}
                  </span>
                </div>
                {(fs.mentions || []).length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                    {(fs.mentions || []).map((m, i) => (
                      <span key={i} style={{ fontSize: 10, background: 'var(--bg4)', color: 'var(--text2)', padding: '2px 8px', borderRadius: 6 }}>
                        {m.ep && `${m.ep}화`}{m.ep && m.note && ' · '}{m.note}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </CharField>
      )}

      {/* 관계 목록 */}
      {myRelations.length > 0 && (
        <CharField label={`관계 (${myRelations.length})`}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {myRelations.map(r => {
              const oac = getAvatarColor(r.other.name || '?');
              return (
                <div key={r.id} style={{ background: 'var(--bg3)', borderRadius: 8, padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 32, height: 32, borderRadius: '50%', background: oac.bg, color: oac.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontFamily: 'var(--font-serif)', flexShrink: 0 }}>
                    {r.other.name?.[0] || '?'}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 500 }}>{r.other.name}</div>
                    {r.label && <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 1 }}>{r.label}</div>}
                  </div>
                </div>
              );
            })}
          </div>
        </CharField>
      )}
    </div>
  );
}

function CharacterCard({ character: c, isSelected, onSelect, onDelete }) {
  const ac = getAvatarColor(c.name || '?');
  const { isMobile, isTablet } = useBreakpoint();
  const isTouch = isMobile || isTablet;
  const [hovered, setHovered] = React.useState(false);
  const [pendingDelete, setPendingDelete] = React.useState(false);

  return (
    <div onClick={() => onSelect(c)}
      onMouseEnter={isTouch ? undefined : () => setHovered(true)}
      onMouseLeave={isTouch ? undefined : () => setHovered(false)}
      style={{
        background: 'var(--bg2)',
        border: `1px solid ${isSelected ? 'var(--accent)' : 'var(--border)'}`,
        borderRadius: 'var(--radius-lg)',
        cursor: 'pointer',
        position: 'relative',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '16px 8px 10px',
        aspectRatio: '3/4',
        boxShadow: isSelected ? '0 0 0 2px var(--accent)' : 'none',
        transition: 'border-color 0.15s, box-shadow 0.15s',
      }}>
      {/* 원형 사진 or 아바타 */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%' }}>
        {c.photoURL ? (
          <img src={c.photoURL} alt={c.name}
            style={{
              width: '70%', aspectRatio: '1/1',
              borderRadius: '50%',
              objectFit: 'cover',
              objectPosition: c.photoPosition || 'center top',
              border: '2px solid var(--border2)',
            }} />
        ) : (
          <div style={{
            width: '70%', aspectRatio: '1/1',
            borderRadius: '50%',
            background: ac.bg, color: ac.color,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: 'var(--font-serif)', fontSize: 32,
            border: '2px dashed var(--border2)',
          }}>{c.name?.[0] || '?'}</div>
        )}
      </div>
      {/* 하단 이름 + 역할 */}
      <div style={{ textAlign: 'center', marginTop: 12, width: '100%' }}>
        <div style={{ fontWeight: 600, fontSize: 12, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.name}</div>
        {c.role && <div style={{ color: 'var(--text3)', fontSize: 10, marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.role}</div>}
        {c.tags?.length > 0 && (
          <div style={{ marginTop: 8, display: 'flex', flexWrap: 'wrap', gap: 3, justifyContent: 'center' }}>
            {c.tags.slice(0, 2).map((t, i) => <span key={i} className="tag" style={{ background: 'var(--bg4)', color: 'var(--text3)', fontSize: 10 }}>{t}</span>)}
          </div>
        )}
      </div>
      {/* 삭제 버튼 - 호버시에만 표시 */}
      {(hovered || pendingDelete) && (
        pendingDelete ? (
          <div style={{ position: 'absolute', top: 8, right: 8, display: 'flex', gap: 4, zIndex: 2 }}>
            <button className="btn" style={{ fontSize: 10, height: 24, padding: '0 6px' }} onClick={e => { e.stopPropagation(); setPendingDelete(false); }}>취소</button>
            <button className="btn btn-danger" style={{ fontSize: 10, height: 24, padding: '0 6px' }} onClick={e => { e.stopPropagation(); onDelete(c.id); }}>삭제</button>
          </div>
        ) : (
          <button className="btn btn-danger" style={{ position: 'absolute', top: 8, right: 8, fontSize: 11, height: 26, padding: '0 8px', zIndex: 2 }}
            onClick={e => { e.stopPropagation(); setPendingDelete(true); }}>삭제</button>
        )
      )}
    </div>
  );
}

// ── 세계관 ──
function WorldView({ docs, onAdd, onUpdate, onDelete, reorderMode, onSaveOrder, onUnsavedChange }) {
  const [selected, setSelected] = useState(null);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [saved, setSaved] = useState(true);
  const [orderedDocs, setOrderedDocs] = useState(null);
  const [pendingDeleteDocId, setPendingDeleteDocId] = useState(null);
  const [pendingDeleteEditor, setPendingDeleteEditor] = useState(false);
  const [showUnsaved, setShowUnsaved] = useState(false);

  // 부모(Project.jsx)에 unsaved 상태 전파 — 탭 이동 가드용
  // selected가 없으면(리스트 화면) saved 무관하게 false 처리
  React.useEffect(() => {
    onUnsavedChange?.(selected ? !saved : false);
  }, [saved, selected, onUnsavedChange]);
  const displayDocs = orderedDocs || docs;
  const { onDragStart, onDragEnter, onDragEnd, draggingIdx, dragOverIdx, getItemStyle } = useDragOrder(displayDocs, setOrderedDocs);
  const prevReorderModeW = React.useRef(false);
  React.useEffect(() => {
    if (reorderMode && !prevReorderModeW.current) setOrderedDocs([...docs]);
    if (!reorderMode && prevReorderModeW.current && orderedDocs) {
      onSaveOrder?.(orderedDocs);
    }
    prevReorderModeW.current = reorderMode;
  }, [reorderMode]);

  const selectDoc = d => { setSelected(d); setTitle(d.title); setContent(d.content || ''); setSaved(true); };
  const save = () => { if (selected) { onUpdate(selected.id, { title, content }); setSaved(true); } };
  const addNew = async () => {
    const ref = await onAdd('새 문서');
    if (!ref) return; // 제한 초과 등으로 생성 안 된 경우
    selectDoc({ id: ref.id, title: '새 문서', content: '' });
  };

  const addNewRef = React.useRef(addNew);
  React.useEffect(() => { addNewRef.current = addNew; });

  React.useEffect(() => {
    const handler = () => addNewRef.current();
    document.addEventListener('worlddoc:add', handler);
    return () => document.removeEventListener('worlddoc:add', handler);
  }, []);

  const handleDelete = (e, d) => {
    e.stopPropagation();
    setPendingDeleteDocId(d.id);
  };

  const confirmDeleteDoc = (id) => {
    onDelete(id);
    if (selected?.id === id) { setSelected(null); setTitle(''); setContent(''); setSaved(true); }
    setPendingDeleteDocId(null);
  };

  // 문서 편집 화면
  if (selected) return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', position: 'relative' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 20px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
        <button className="btn btn-ghost" style={{ fontSize: 12, padding: '0 10px', height: 32 }}
          onClick={() => { if (!saved) { setShowUnsaved(true); return; } setSelected(null); }}>← 목록</button>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
          <input value={title} onChange={e => { setTitle(e.target.value); setSaved(false); }}
            style={{ fontSize: 16, fontFamily: 'var(--font-serif)', background: 'transparent', border: 'none', color: 'var(--text)', outline: 'none', fontWeight: 600 }} />
          <span style={{ fontSize: 10, color: saved ? 'var(--text3)' : 'var(--accent)' }}>
            {saved ? '저장됨' : '저장되지 않은 변경사항이 있어요'}
          </span>
        </div>
        <button className="btn btn-primary" style={{ fontSize: 12, height: 32, padding: '0 14px' }}
          onClick={save} disabled={saved}>
          저장
        </button>
        {pendingDeleteEditor ? (
          <>
            <button className="btn" style={{ fontSize: 11, height: 28, padding: '0 8px' }} onClick={() => setPendingDeleteEditor(false)}>취소</button>
            <button className="btn btn-danger" style={{ fontSize: 11, height: 28, padding: '0 8px' }} onClick={() => { onDelete(selected.id); setSelected(null); setPendingDeleteEditor(false); }}>정말 삭제</button>
          </>
        ) : (
          <button className="btn btn-danger" style={{ fontSize: 11, height: 28, padding: '0 10px' }} onClick={() => setPendingDeleteEditor(true)}>삭제</button>
        )}
      </div>
      <textarea value={content} onChange={e => { setContent(e.target.value); setSaved(false); }}
        style={{ flex: 1, background: 'transparent', border: 'none', color: 'var(--text2)', fontSize: 14, lineHeight: 1.8, resize: 'none', outline: 'none', padding: '20px' }}
        placeholder="설정을 자유롭게 작성하세요..." />
      {/* 저장 안 된 채 ← 목록 누를 때 모달 (편집 화면에서도 보이도록 — #8 fix) */}
      {showUnsaved && (
        <div className="modal-backdrop">
          <div style={{ position: 'absolute', inset: 0 }} onClick={() => setShowUnsaved(false)} />
          <div className="modal" style={{ position: 'relative', zIndex: 1, maxWidth: 340 }}>
            <div className="modal-title">저장하지 않은 내용이 있어요</div>
            <p style={{ color: 'var(--text2)', fontSize: 13, marginBottom: 20 }}>변경 사항을 저장하지 않고 나가시겠어요?</p>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn" style={{ flex: 1 }} onClick={() => setShowUnsaved(false)}>취소</button>
              <button className="btn btn-danger" style={{ flex: 1 }} onClick={() => { setShowUnsaved(false); setSaved(true); setSelected(null); }}>나가기</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  // 문서 리스트 화면
  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: 20 }}>
      <p style={{ color: 'var(--text3)', fontSize: 12, marginBottom: 16 }}>세계관, 배경, 상징 등 작품 설정을 문서로 정리하세요</p>
      {docs.length === 0 ? (
        <div style={{ border: '1px dashed var(--border2)', borderRadius: 'var(--radius-lg)', padding: '60px 20px', textAlign: 'center' }}>
          <div style={{ fontSize: 28, marginBottom: 12, opacity: 0.3 }}>✦</div>
          <p style={{ color: 'var(--text2)', fontSize: 14, marginBottom: 20 }}>아직 작성된 문서가 없어요</p>
          <button className="btn btn-primary" onClick={() => document.dispatchEvent(new CustomEvent('worlddoc:add'))}>첫 문서 만들기</button>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 10 }}>
          {displayDocs.map((d, dIdx) => (
            <div key={d.id}
              draggable={reorderMode}
              onDragStart={() => reorderMode && onDragStart(dIdx)}
              onDragEnter={() => reorderMode && onDragEnter(dIdx)}
              onDragEnd={reorderMode ? onDragEnd : undefined}
              onDragOver={e => reorderMode && e.preventDefault()}
              style={{
                background: 'var(--bg2)',
                border: reorderMode && dragOverIdx === dIdx && draggingIdx !== dIdx ? '2px solid var(--accent)' : '1px solid var(--border)',
                borderRadius: 'var(--radius-lg)', padding: '14px 16px',
                display: 'flex', alignItems: 'center', gap: 12,
                cursor: reorderMode ? 'grab' : 'pointer',
                ...(reorderMode ? getItemStyle(dIdx) : {}),
              }}
              onClick={() => !reorderMode && selectDoc(d)}
            >
              <span style={{ fontSize: 18, flexShrink: 0, opacity: 0.5 }}>⊞</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.title}</div>
                {d.content && <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.content.slice(0, 60)}</div>}
              </div>
              {pendingDeleteDocId === d.id ? (
                <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                  <button className="btn" style={{ fontSize: 11, height: 30, padding: '0 8px' }} onClick={e => { e.stopPropagation(); setPendingDeleteDocId(null); }}>취소</button>
                  <button className="btn btn-danger" style={{ fontSize: 11, height: 30, padding: '0 8px' }} onClick={e => { e.stopPropagation(); confirmDeleteDoc(d.id); }}>정말 삭제</button>
                </div>
              ) : (
                <button className="btn btn-ghost" style={{ fontSize: 11, height: 30, padding: '0 10px', flexShrink: 0 }} onClick={e => handleDelete(e, d)}>삭제</button>
              )}
            </div>
          ))}
        </div>
      )}
      {/* 저장 안 된 내용 경고 */}
      {showUnsaved && (
        <div className="modal-backdrop">
          <div style={{ position: 'absolute', inset: 0 }} onClick={() => setShowUnsaved(false)} />
          <div className="modal" style={{ position: 'relative', zIndex: 1, maxWidth: 340 }}>
            <div className="modal-title">저장하지 않은 내용이 있어요</div>
            <p style={{ color: 'var(--text2)', fontSize: 13, marginBottom: 20 }}>변경 사항을 저장하지 않고 나가시겠어요?</p>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn" style={{ flex: 1 }} onClick={() => setShowUnsaved(false)}>취소</button>
              <button className="btn btn-danger" style={{ flex: 1 }} onClick={() => { setShowUnsaved(false); setSelected(null); }}>나가기</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── 복선 관리 ──
function ForeshadowView({ foreshadows, characters, onAdd, onUpdate, onDelete, reorderMode, onSaveOrder }) {
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ title: '', mentions: [], resolved: false, charIds: [] });
  const [orderedOpen, setOrderedOpen] = useState(null);
  const [orderedClosed, setOrderedClosed] = useState(null);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    const handler = () => setShowAdd(true);
    document.addEventListener('foreshadow:add', handler);
    return () => document.removeEventListener('foreshadow:add', handler);
  }, []);

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) return;
    await onAdd(form);
    setForm({ title: '', mentions: [], resolved: false, charIds: [] });
    setShowAdd(false);
    // 재정렬 로컬 state 초기화 → 새 항목이 즉시 목록에 보이도록
    setOrderedOpen(null);
    setOrderedClosed(null);
  };

  const openRaw = foreshadows.filter(f => !(f.resolved ?? !!f.resolvedEp));
  const closedRaw = foreshadows.filter(f => f.resolved ?? !!f.resolvedEp);
  const open = orderedOpen || openRaw;
  const closed = orderedClosed || closedRaw;
  const dragOpen = useDragOrder(open, setOrderedOpen);
  const dragClosed = useDragOrder(closed, setOrderedClosed);
  const prevReorderModeF = React.useRef(false);
  React.useEffect(() => {
    if (reorderMode && !prevReorderModeF.current) {
      setOrderedOpen([...openRaw]);
      setOrderedClosed([...closedRaw]);
    }
    if (!reorderMode && prevReorderModeF.current) {
      if (orderedOpen) onSaveOrder?.([...orderedOpen, ...(orderedClosed || closedRaw)]);
      // 저장 후 로컬 state 초기화 → 부모 state(낙관적 업데이트)가 이미 최신이므로
      // openRaw/closedRaw 기반으로 다시 렌더링하면 순서가 즉시 반영됨
      setOrderedOpen(null);
      setOrderedClosed(null);
    }
    prevReorderModeF.current = reorderMode;
  }, [reorderMode]); // eslint-disable-line

  return (
    <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', padding: 20, minWidth: 0, boxSizing: 'border-box' }}>
      <p style={{ color: 'var(--text3)', fontSize: 12, marginBottom: 16 }}>심어둔 복선과 회수 여부를 한눈에 관리하세요</p>
      {/* 필터 버튼 */}
      {foreshadows.length > 0 && (
        <div style={{ display: 'flex', gap: 6, marginBottom: 20 }}>
          {[
            { key: 'all', label: `전체 (${foreshadows.length})` },
            { key: 'open', label: `미회수 (${openRaw.length})` },
            { key: 'closed', label: `회수 완료 (${closedRaw.length})` },
          ].map(f => (
            <button key={f.key} onClick={() => setFilter(f.key)}
              className={`btn${filter === f.key ? ' btn-primary' : ''}`}
              style={{ fontSize: 12, height: 30, padding: '0 12px' }}>
              {f.label}
            </button>
          ))}
        </div>
      )}

      {foreshadows.length === 0 && (
        <div style={{ border: '1px dashed var(--border2)', borderRadius: 'var(--radius-lg)', padding: '60px 20px', textAlign: 'center' }}>
          <div style={{ fontSize: 28, marginBottom: 12, opacity: 0.3 }}>✦</div>
          <p style={{ color: 'var(--text2)', fontSize: 14, marginBottom: 20 }}>아직 추가된 복선이 없어요</p>
          <button className="btn btn-primary" onClick={() => document.dispatchEvent(new CustomEvent('foreshadow:add'))}>첫 복선 추가하기</button>
        </div>
      )}

      {(filter === 'all' || filter === 'open') && open.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <div className="section-label" style={{ marginBottom: 10 }}>미회수 ({open.length})</div>
          {open.map((fs, fsIdx) => (
            <div key={fs.id} draggable={reorderMode}
              onDragStart={() => reorderMode && dragOpen.onDragStart(fsIdx)}
              onDragEnter={() => reorderMode && dragOpen.onDragEnter(fsIdx)}
              onDragEnd={reorderMode ? dragOpen.onDragEnd : undefined}
              onDragOver={e => reorderMode && e.preventDefault()}
              style={{
                cursor: reorderMode ? 'grab' : 'default',
                borderRadius: 'var(--radius)',
                borderLeft: reorderMode && dragOpen.dragOverIdx === fsIdx && dragOpen.draggingIdx !== fsIdx ? '2px solid var(--accent)' : '2px solid transparent',
                ...(reorderMode ? dragOpen.getItemStyle(fsIdx) : {}),
              }}
            >
              <FSCard fs={fs} characters={characters} onUpdate={onUpdate} onDelete={onDelete} />
            </div>
          ))}
        </div>
      )}
      {(filter === 'all' || filter === 'closed') && closed.length > 0 && (
        <div>
          <div className="section-label" style={{ marginBottom: 10 }}>회수 완료 ({closed.length})</div>
          {closed.map((fs, fsIdx) => (
            <div key={fs.id} draggable={reorderMode}
              onDragStart={() => reorderMode && dragClosed.onDragStart(fsIdx)}
              onDragEnter={() => reorderMode && dragClosed.onDragEnter(fsIdx)}
              onDragEnd={reorderMode ? dragClosed.onDragEnd : undefined}
              onDragOver={e => reorderMode && e.preventDefault()}
              style={{
                cursor: reorderMode ? 'grab' : 'default',
                borderRadius: 'var(--radius)',
                borderLeft: reorderMode && dragClosed.dragOverIdx === fsIdx && dragClosed.draggingIdx !== fsIdx ? '2px solid var(--accent)' : '2px solid transparent',
                ...(reorderMode ? dragClosed.getItemStyle(fsIdx) : {}),
              }}
            >
              <FSCard fs={fs} characters={characters} onUpdate={onUpdate} onDelete={onDelete} />
            </div>
          ))}
        </div>
      )}

      {showAdd && (
        <div className="modal-backdrop" onClick={() => setShowAdd(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-title">복선 추가</div>
            <form onSubmit={handleAdd}>
              <div className="form-group">
                <label className="form-label">복선 내용</label>
                <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} style={{ width: '100%' }} placeholder="어떤 복선인가요?" autoFocus />
              </div>
              {/* 언급 회차 목록 */}
              <div className="form-group">
                <label className="form-label">언급 회차</label>
                <div style={{ background: 'var(--bg3)', borderRadius: 'var(--radius)', padding: '10px 12px' }}>
                  {form.mentions.map((m, i) => (
                    <div key={i} style={{ display: 'flex', gap: 6, marginBottom: 6, minWidth: 0 }}>
                      <input value={m.ep} onChange={e => { const v = e.target.value.replace(/[^0-9]/g, ''); setForm(f => ({ ...f, mentions: f.mentions.map((x, j) => j === i ? { ...x, ep: v } : x) })); }}
                        placeholder="화수" inputMode="numeric" style={{ width: 70, flexShrink: 0, minWidth: 0 }} />
                      <input value={m.note} onChange={e => setForm(f => ({ ...f, mentions: f.mentions.map((x, j) => j === i ? { ...x, note: e.target.value } : x) }))}
                        placeholder="어떻게 언급되었나요?" style={{ flex: 1, minWidth: 0 }} />
                      <button type="button" className="btn btn-ghost" style={{ padding: '0 8px', height: 40, fontSize: 16, flexShrink: 0 }}
                        onClick={() => setForm(f => ({ ...f, mentions: f.mentions.filter((_, j) => j !== i) }))}>×</button>
                    </div>
                  ))}
                  <button type="button" className="btn" style={{ fontSize: 12, width: '100%', marginTop: form.mentions.length > 0 ? 4 : 0 }}
                    onClick={() => setForm(f => ({ ...f, mentions: [...f.mentions, { ep: '', note: '' }] }))}>
                    + 언급 추가
                  </button>
                </div>
              </div>
              {/* 연결 캐릭터 (#11 — 추가 모달에 누락되어 있던 칸 복원) */}
              {characters.length > 0 && (
                <div className="form-group">
                  <label className="form-label">연결 캐릭터</label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                    {characters.map(c => {
                      const sel = form.charIds.includes(c.id);
                      const ac = getAvatarColor(c.name);
                      return (
                        <span key={c.id} className="tag"
                          onClick={() => setForm(f => ({ ...f, charIds: sel ? f.charIds.filter(id => id !== c.id) : [...f.charIds, c.id] }))}
                          style={{ background: sel ? ac.bg : 'var(--bg4)', color: sel ? ac.color : 'var(--text3)', cursor: 'pointer', border: sel ? `1px solid ${ac.color}40` : '1px solid transparent' }}>
                          {c.name}
                        </span>
                      );
                    })}
                  </div>
                </div>
              )}
              {/* 회수 여부 토글 */}
              <div className="form-group">
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <label className="form-label" style={{ margin: 0 }}>복선 회수</label>
                  <button type="button" onClick={() => setForm(f => ({ ...f, resolved: !f.resolved }))}
                    style={{ width: 44, height: 24, borderRadius: 99, border: 'none', cursor: 'pointer',
                      background: form.resolved ? 'var(--accent)' : 'var(--bg4)', position: 'relative', transition: 'background 0.2s', flexShrink: 0 }}>
                    <div style={{ width: 18, height: 18, borderRadius: '50%', background: '#fff',
                      position: 'absolute', top: 3, left: form.resolved ? 23 : 3, transition: 'left 0.2s' }} />
                  </button>
                  <span style={{ fontSize: 12, color: form.resolved ? 'var(--accent)' : 'var(--text3)' }}>
                    {form.resolved ? '완료' : '미회수'}
                  </span>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 20 }}>
                <button type="button" className="btn" onClick={() => setShowAdd(false)}>취소</button>
                <button type="submit" className="btn btn-primary">추가</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function FSCard({ fs, characters, onUpdate, onDelete }) {
  const [editing, setEditing] = useState(false);
  const [pendingDel, setPendingDel] = useState(false);
  const [form, setForm] = useState({
    title: fs.title,
    mentions: fs.mentions || (fs.plantedEp ? [{ ep: fs.plantedEp, note: '' }] : []),
    resolved: fs.resolved ?? !!fs.resolvedEp,
    charIds: fs.charIds || [],
  });
  const linked = characters.filter(c => fs.charIds?.includes(c.id));

  const save = () => { onUpdate(fs.id, form); setEditing(false); };

  if (editing) return (
    <div style={{ background: 'var(--bg2)', border: '1px solid var(--accent)', borderRadius: 'var(--radius)', padding: '14px', marginBottom: 8 }}>
      <div className="form-group">
        <label className="form-label">복선 내용</label>
        <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} style={{ width: '100%' }} autoFocus />
      </div>
      {/* 언급 회차 */}
      <div className="form-group">
        <label className="form-label">언급 회차</label>
        <div style={{ background: 'var(--bg3)', borderRadius: 'var(--radius)', padding: '10px 12px' }}>
          {form.mentions.map((m, i) => (
            <div key={i} style={{ display: 'flex', gap: 6, marginBottom: 6 }}>
              <input value={m.ep} onChange={e => { const v = e.target.value.replace(/[^0-9]/g, ''); setForm(f => ({ ...f, mentions: f.mentions.map((x, j) => j === i ? { ...x, ep: v } : x) })); }}
                placeholder="화수" inputMode="numeric" style={{ width: 70 }} />
              <input value={m.note} onChange={e => setForm(f => ({ ...f, mentions: f.mentions.map((x, j) => j === i ? { ...x, note: e.target.value } : x) }))}
                placeholder="어떻게 언급되었나요?" style={{ flex: 1 }} />
              <button type="button" className="btn btn-ghost" style={{ padding: '0 8px', height: 40, fontSize: 16 }}
                onClick={() => setForm(f => ({ ...f, mentions: f.mentions.filter((_, j) => j !== i) }))}>×</button>
            </div>
          ))}
          <button type="button" className="btn" style={{ fontSize: 12, width: '100%', marginTop: form.mentions.length > 0 ? 4 : 0 }}
            onClick={() => setForm(f => ({ ...f, mentions: [...f.mentions, { ep: '', note: '' }] }))}>
            + 언급 추가
          </button>
        </div>
      </div>
      {/* 연결 캐릭터 */}
      <div className="form-group">
        <label className="form-label">연결 캐릭터</label>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
          {characters.map(c => {
            const sel = form.charIds.includes(c.id);
            const ac = getAvatarColor(c.name);
            return <span key={c.id} className="tag" onClick={() => setForm(f => ({ ...f, charIds: sel ? f.charIds.filter(id => id !== c.id) : [...f.charIds, c.id] }))}
              style={{ background: sel ? ac.bg : 'var(--bg4)', color: sel ? ac.color : 'var(--text3)', cursor: 'pointer', border: sel ? `1px solid ${ac.color}40` : '1px solid transparent' }}>{c.name}</span>;
          })}
        </div>
      </div>
      {/* 회수 토글 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
        <span style={{ fontSize: 11, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 500 }}>복선 회수</span>
        <button type="button" onClick={() => setForm(f => ({ ...f, resolved: !f.resolved }))}
          style={{ width: 44, height: 24, borderRadius: 99, border: 'none', cursor: 'pointer',
            background: form.resolved ? 'var(--accent)' : 'var(--bg4)', position: 'relative', transition: 'background 0.2s', flexShrink: 0 }}>
          <div style={{ width: 18, height: 18, borderRadius: '50%', background: '#fff',
            position: 'absolute', top: 3, left: form.resolved ? 23 : 3, transition: 'left 0.2s' }} />
        </button>
        <span style={{ fontSize: 12, color: form.resolved ? 'var(--accent)' : 'var(--text3)' }}>
          {form.resolved ? '완료' : '미회수'}
        </span>
      </div>
      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
        <button className="btn" style={{ fontSize: 12 }} onClick={() => setEditing(false)}>취소</button>
        <button className="btn btn-primary" style={{ fontSize: 12 }} onClick={save}>저장</button>
      </div>
    </div>
  );

  const mentions = fs.mentions || (fs.plantedEp ? [{ ep: fs.plantedEp, note: '' }] : []);
  const isResolved = fs.resolved ?? !!fs.resolvedEp;

  return (
    <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '12px 14px', marginBottom: 8, overflow: 'hidden', wordBreak: 'break-word' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 13, fontWeight: 500, wordBreak: 'break-word' }}>{fs.title}</span>
            <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 99,
              background: isResolved ? 'var(--bg4)' : 'var(--accent-glow)',
              color: isResolved ? 'var(--text3)' : 'var(--accent)' }}>
              {isResolved ? '회수 완료' : '미회수'}
            </span>
          </div>
          {/* 언급 목록 */}
          {mentions.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 4 }}>
              {mentions.map((m, i) => (
                <span key={i} style={{ fontSize: 10, background: 'var(--bg3)', color: 'var(--text2)', padding: '2px 8px', borderRadius: 6 }}>
                  {m.ep && `${m.ep}화`}{m.ep && m.note && ' · '}{m.note}
                </span>
              ))}
            </div>
          )}
          {/* 연결 캐릭터 */}
          {linked.length > 0 && (
            <div style={{ marginTop: 6, display: 'flex', gap: 4, flexWrap: 'wrap' }}>
              {linked.map(c => { const ac = getAvatarColor(c.name); return <span key={c.id} className="tag" style={{ background: ac.bg, color: ac.color, fontSize: 10 }}>{c.name}</span>; })}
            </div>
          )}
        </div>
        <div style={{ display: 'flex', gap: 4, flexShrink: 0, alignItems: 'center' }}>
          {/* 인라인 회수 토글 */}
          <button onClick={() => onUpdate(fs.id, { resolved: !isResolved })}
            style={{ width: 36, height: 20, borderRadius: 99, border: 'none', cursor: 'pointer',
              background: isResolved ? 'var(--accent)' : 'var(--bg4)', position: 'relative', transition: 'background 0.2s', flexShrink: 0 }}>
            <div style={{ width: 14, height: 14, borderRadius: '50%', background: '#fff',
              position: 'absolute', top: 3, left: isResolved ? 19 : 3, transition: 'left 0.2s' }} />
          </button>
          <button className="btn btn-ghost" style={{ fontSize: 11, height: 30, padding: '0 10px' }} onClick={() => setEditing(true)}>수정</button>
          {pendingDel ? (
            <>
              <button className="btn" style={{ fontSize: 11, height: 30, padding: '0 8px' }} onClick={() => setPendingDel(false)}>취소</button>
              <button className="btn btn-danger" style={{ fontSize: 11, height: 30, padding: '0 8px' }} onClick={() => { onDelete(fs.id); setPendingDel(false); }}>정말 삭제</button>
            </>
          ) : (
            <button className="btn btn-danger" style={{ fontSize: 11, height: 30, padding: '0 10px' }} onClick={() => setPendingDel(true)}>삭제</button>
          )}
        </div>
      </div>
    </div>
  );
}

// ── 캐릭터 추가 모달 ──
function AddCharModal({ onClose, onAdd }) {
  const [form, setForm] = useState({ name: '', role: '', age: '', affiliation: '', ability: '', description: '', tags: [] });
  const [newTag, setNewTag] = useState('');
  const f = key => ({ value: form[key], onChange: e => setForm(p => ({ ...p, [key]: e.target.value })) });
  const addTag = e => { e.preventDefault(); if (!newTag.trim()) return; setForm(p => ({ ...p, tags: [...p.tags, newTag.trim()] })); setNewTag(''); };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-title">캐릭터 추가</div>
        <div className="form-row">
          <div className="form-group"><label className="form-label">이름 *</label><input {...f('name')} style={{ width: '100%' }} autoFocus /></div>
          <div className="form-group"><label className="form-label">역할</label><input {...f('role')} placeholder="예: 주인공" style={{ width: '100%' }} /></div>
        </div>
        <div className="form-row">
          <div className="form-group"><label className="form-label">나이</label><input {...f('age')} style={{ width: '100%' }} /></div>
          <div className="form-group"><label className="form-label">소속</label><input {...f('affiliation')} style={{ width: '100%' }} /></div>
        </div>
        <div className="form-group"><label className="form-label">능력/특기</label><input {...f('ability')} style={{ width: '100%' }} /></div>
        <div className="form-group"><label className="form-label">인물 소개</label><textarea {...f('description')} rows={2} style={{ width: '100%' }} /></div>
        <div className="form-group">
          <label className="form-label">성격 태그</label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 6 }}>
            {form.tags.map((t, i) => <span key={i} className="tag" style={{ background: 'var(--bg4)', color: 'var(--text2)', cursor: 'pointer' }} onClick={() => setForm(p => ({ ...p, tags: p.tags.filter((_, j) => j !== i) }))}>{t} ×</span>)}
          </div>
          <form onSubmit={addTag} style={{ display: 'flex', gap: 6 }}>
            <input value={newTag} onChange={e => setNewTag(e.target.value)} placeholder="태그 추가 후 엔터" style={{ flex: 1 }} />
            <button type="submit" className="btn" style={{ height: 40, padding: '0 12px' }}>+</button>
          </form>
        </div>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 20 }}>
          <button className="btn" onClick={onClose}>취소</button>
          <button className="btn btn-primary" onClick={() => { if (form.name.trim()) onAdd(form); }} disabled={!form.name.trim()}>추가</button>
        </div>
      </div>
    </div>
  );
}

// ── 공유 모달 ──
function ShareModal({ projectId, project, onClose, onUpdate, activeTab }) {
  const [shareEnabled, setShareEnabled] = useState(project?.shareEnabled || false);
  const [shareTab, setShareTab] = useState(project?.shareTab || 'all');
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const [capturing, setCapturing] = useState(false);
  const [captureError, setCaptureError] = useState('');
  const [shareMode, setShareMode] = useState('link'); // 'link' | 'image'

  const currentTabUrl = `${window.location.origin}/shared/${projectId}?tab=${activeTab}`;
  const shareUrl = shareTab === 'all'
    ? `${window.location.origin}/shared/${projectId}`
    : shareTab === 'current'
      ? currentTabUrl
      : `${window.location.origin}/shared/${projectId}?tab=${shareTab}`;

  const toggleShare = async () => {
    setSaving(true);
    const next = !shareEnabled;
    await updateDoc(doc(db, 'projects', projectId), { shareEnabled: next });
    setShareEnabled(next);
    onUpdate({ shareEnabled: next });
    setSaving(false);
  };

  const handleTabChange = async (tab) => {
    setShareTab(tab);
    if (tab !== 'current') {
      await updateDoc(doc(db, 'projects', projectId), { shareTab: tab });
      onUpdate({ shareTab: tab });
    }
  };

  const copyLink = () => {
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const captureImage = async () => {
    setCapturing(true);
    setCaptureError('');
    try {
      const html2canvas = (await import('html2canvas')).default;
      const target = document.getElementById('project-main-content');
      if (!target) { setCaptureError('캡처할 화면을 찾을 수 없어요.'); setCapturing(false); return; }
      const canvas = await html2canvas(target, { backgroundColor: '#0d0d0f', scale: 2, useCORS: true });
      const link = document.createElement('a');
      link.download = `cartographic-${activeTab}-${Date.now()}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch (e) {
      console.error(e);
      setCaptureError('이미지 저장에 실패했어요.');
    } finally {
      setCapturing(false);
    }
  };

  const SHARE_TABS = [
    { id: 'all', label: '전체 공유', desc: '캐릭터, 세계관, 복선, 타임라인 모두' },
    { id: 'current', label: '현재 탭만', desc: `지금 보고 있는 탭만 (${activeTab})` },
    { id: 'characters', label: '캐릭터만', desc: '캐릭터 목록과 상세 정보만' },
    { id: 'world', label: '세계관만', desc: '설정집 문서만' },
    { id: 'foreshadow', label: '복선만', desc: '복선 목록만' },
    { id: 'timeline', label: '타임라인만', desc: '타임라인 이벤트만' },
  ];

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 440 }}>
        <div className="modal-title">공유 설정</div>

        {/* 공유 방식 선택 */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          <button onClick={() => setShareMode('link')} style={{ flex: 1, height: 36, borderRadius: 'var(--radius)', border: `1px solid ${shareMode === 'link' ? 'var(--accent)' : 'var(--border)'}`, background: shareMode === 'link' ? 'var(--accent-glow, rgba(139,124,248,0.08))' : 'transparent', color: shareMode === 'link' ? 'var(--accent)' : 'var(--text2)', fontSize: 13, cursor: 'pointer', fontWeight: shareMode === 'link' ? 500 : 400 }}>
            🔗 링크로 공유
          </button>
          <button onClick={() => setShareMode('image')} style={{ flex: 1, height: 36, borderRadius: 'var(--radius)', border: `1px solid ${shareMode === 'image' ? 'var(--accent)' : 'var(--border)'}`, background: shareMode === 'image' ? 'var(--accent-glow, rgba(139,124,248,0.08))' : 'transparent', color: shareMode === 'image' ? 'var(--accent)' : 'var(--text2)', fontSize: 13, cursor: 'pointer', fontWeight: shareMode === 'image' ? 500 : 400 }}>
            🖼 이미지로 저장
          </button>
        </div>

        {shareMode === 'link' && (
          <>
            {/* 공유 토글 */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 0', borderBottom: '1px solid var(--border)' }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 500 }}>읽기 전용 링크</div>
                <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 3 }}>협업자가 설정을 열람할 수 있어요</div>
              </div>
              <button onClick={toggleShare} disabled={saving} style={{ width: 44, height: 24, borderRadius: 99, border: 'none', cursor: 'pointer', background: shareEnabled ? 'var(--accent)' : 'var(--bg4)', position: 'relative', transition: 'background 0.2s', flexShrink: 0 }}>
                <div style={{ width: 18, height: 18, borderRadius: '50%', background: '#fff', position: 'absolute', top: 3, left: shareEnabled ? 23 : 3, transition: 'left 0.2s' }} />
              </button>
            </div>

            {shareEnabled && (
              <>
                <div style={{ marginTop: 16, marginBottom: 16 }}>
                  <div style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 8 }}>공유할 탭 선택</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {SHARE_TABS.map(t => (
                      <button key={t.id} onClick={() => handleTabChange(t.id)} style={{
                        display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px',
                        borderRadius: 'var(--radius)', border: `1px solid ${shareTab === t.id ? 'var(--accent)' : 'var(--border)'}`,
                        background: shareTab === t.id ? 'var(--accent-glow, rgba(139,124,248,0.08))' : 'transparent',
                        cursor: 'pointer', textAlign: 'left', transition: 'all 0.15s',
                      }}>
                        <div style={{ width: 16, height: 16, borderRadius: '50%', border: `2px solid ${shareTab === t.id ? 'var(--accent)' : 'var(--border2)'}`, background: shareTab === t.id ? 'var(--accent)' : 'transparent', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          {shareTab === t.id && <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#fff' }} />}
                        </div>
                        <div>
                          <div style={{ fontSize: 13, fontWeight: shareTab === t.id ? 500 : 400, color: 'var(--text)' }}>{t.label}</div>
                          <div style={{ fontSize: 11, color: 'var(--text3)' }}>{t.desc}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
                <div style={{ borderTop: '1px solid var(--border)', paddingTop: 16 }}>
                  <label className="form-label">공유 링크</label>
                  <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
                    <input readOnly value={shareUrl} style={{ flex: 1, fontSize: 12, color: 'var(--text2)', cursor: 'text' }} onClick={e => e.target.select()} />
                    <button className="btn btn-primary" style={{ flexShrink: 0, fontSize: 12, padding: '0 14px' }} onClick={copyLink}>
                      {copied ? '✓ 복사됨' : '복사'}
                    </button>
                  </div>
                  <div style={{ marginTop: 10, padding: '10px 12px', background: 'var(--bg3)', borderRadius: 'var(--radius)', fontSize: 12, color: 'var(--text3)', lineHeight: 1.6 }}>
                    링크를 받은 사람은 선택한 탭을 <strong style={{ color: 'var(--text2)' }}>읽기 전용</strong>으로 볼 수 있어요.
                  </div>
                </div>
              </>
            )}
          </>
        )}

        {shareMode === 'image' && (
          <div style={{ padding: '16px 0' }}>
            <div style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 16, lineHeight: 1.7 }}>
              현재 화면을 이미지로 저장해요.<br />
              <span style={{ fontSize: 12, color: 'var(--text3)' }}>관계도, 타임라인 등 현재 보이는 화면 그대로 캡처돼요.</span>
            </div>
            <button className="btn btn-primary" style={{ width: '100%', height: 42, fontSize: 14, justifyContent: 'center' }}
              onClick={captureImage} disabled={capturing}>
              {capturing ? '캡처 중...' : '현재 화면 이미지로 저장'}
            </button>
            {captureError && <p style={{ fontSize: 12, color: 'var(--coral, #f87171)', marginTop: 8 }}>{captureError}</p>}
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 20 }}>
          <button className="btn" onClick={onClose}>닫기</button>
        </div>
      </div>
    </div>
  );
}

function HamburgerIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <line x1="3" y1="5" x2="15" y2="5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      <line x1="3" y1="9" x2="15" y2="9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      <line x1="3" y1="13" x2="15" y2="13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  );
}
