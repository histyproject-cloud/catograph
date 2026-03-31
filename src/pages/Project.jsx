import React, { useState, useEffect } from 'react';
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
  const [activeTab, setActiveTab] = useState('relation');
  const [seenTabs] = useState(() => new Set(['relation']));
  const [overlayTab, setOverlayTab] = useState('relation');
  const [showOverlay, setShowOverlay] = useState(true);
  const handleSetActiveTab = (tab) => {
    setActiveTab(tab);
    setReorderMode(false);
    setSelectedChar(null);
    if (!seenTabs.has(tab)) {
      seenTabs.add(tab);
      setOverlayTab(tab);
      setShowOverlay(true);
    }
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
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
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

  const { characters, addCharacter, updateCharacter, deleteCharacter } = useCharacters(projectId);
  const { relations, addRelation, updateRelation, deleteRelation } = useRelations(projectId);
  const { foreshadows, addForeshadow, updateForeshadow, deleteForeshadow } = useForeshadows(projectId);
  const { docs: worldDocs, addWorldDoc, updateWorldDoc, deleteWorldDoc } = useWorldDocs(projectId);
  const { events, addEvent, updateEvent, deleteEvent } = useTimelineEvents(projectId);
  const { fanworks, addFanwork, updateFanwork, deleteFanwork } = useFanworks(projectId);
  const selectedCharObj = characters.find(c => c.id === selectedChar?.id) ?? selectedChar;
  
  useEffect(() => {
    getDoc(doc(db, 'projects', projectId)).then(d => { if (d.exists()) setProject(d.data()); });
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
      await updateDoc(doc(db, 'projects', projectId), { name: titleInput.trim() });
      setProject(p => ({ ...p, name: titleInput.trim() }));
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
        <button className="btn btn-ghost" style={{ fontSize: 12, padding: '0 8px' }} onClick={() => navigate('/')}>← 홈</button>
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
        {/* 액션 버튼들 - 탭에 따라 다르게 */}
        {activeTab === 'relation' && (
          <button
            className={`btn ${connectMode ? 'btn-primary' : ''}`}
            style={{ fontSize: 13, padding: '0 14px', height: 36 }}
            onClick={() => { setConnectMode(v => !v); setConnectFrom(null); }}
          >
            {isMobile ? '연결' : connectMode ? (connectFrom ? '대상 선택' : '시작 선택') : '관계 연결'}
          </button>
        )}
        {(activeTab === 'relation' || activeTab === 'characters') && (
          <button className="btn btn-primary" style={{ fontSize: 13, padding: '0 14px', height: 36 }}
            onClick={() => { if (checkLimit(characters.length, 'characters')) setShowAddChar(true); }}>
            + 캐릭터
          </button>
        )}
        {activeTab === 'world' && (
          <button className="btn btn-primary" style={{ fontSize: 13, padding: '0 14px', height: 36 }}
            onClick={() => { if (checkLimit(worldDocs.length, 'worldDocs')) document.dispatchEvent(new CustomEvent('worlddoc:add')); }}>
            + 새 문서
          </button>
        )}
        {activeTab === 'foreshadow' && (
          <button className="btn btn-primary" style={{ fontSize: 13, padding: '0 14px', height: 36 }}
            onClick={() => document.dispatchEvent(new CustomEvent('foreshadow:add'))}>
            + 복선 추가
          </button>
        )}
        {activeTab === 'timeline' && (
          <button className="btn btn-primary" style={{ fontSize: 13, padding: '0 14px', height: 36 }}
            onClick={() => document.dispatchEvent(new CustomEvent('timeline:add'))}>
            + 타임라인 추가
          </button>
        )}
        {activeTab === 'fanworks' && (
          <button className="btn btn-primary" style={{ fontSize: 13, padding: '0 14px', height: 36 }}
            onClick={() => document.dispatchEvent(new CustomEvent('fanworks:add'))}>
            + 링크 추가
          </button>
        )}
        {['characters', 'world', 'foreshadow', 'timeline', 'fanworks'].includes(activeTab) && (
          <button
            className={`btn${reorderMode ? ' btn-primary' : ''}`}
            style={{ fontSize: 13, padding: '0 14px', height: 36, background: reorderMode ? 'rgba(139,124,248,0.25)' : undefined, borderColor: reorderMode ? 'var(--accent)' : undefined }}
            onClick={toggleReorderMode}
          >
            {reorderMode ? '✓ 수정 종료' : '⠿ 위치 수정'}
          </button>
        )}
        <button className="btn" style={{ fontSize: 13, padding: '0 14px', height: 36 }} onClick={() => setShowShareModal(true)}>
          {isMobile ? '공유' : '공유'}
        </button>
        <a href="/how-to.html" target="_blank" rel="noopener noreferrer"
          style={{ fontSize: 13, color: 'var(--text3)', textDecoration: 'none', padding: '0 12px', height: 36, display: 'flex', alignItems: 'center', borderRadius: 'var(--radius)', border: '1px solid var(--border)', transition: 'all 0.2s', flexShrink: 0 }}
          onMouseEnter={e => { e.currentTarget.style.color = 'var(--text)'; e.currentTarget.style.borderColor = 'var(--border2)'; }}
          onMouseLeave={e => { e.currentTarget.style.color = 'var(--text3)'; e.currentTarget.style.borderColor = 'var(--border)'; }}>
          이용방법
        </a>
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
                <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 8 }}>{user?.email}</div>
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
        <main style={{ flex: 1, overflow: 'hidden', display: 'flex', minWidth: 0 }}>
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
            <CharacterList characters={characters} onSelect={handleCharClick} selected={selectedChar} onDelete={deleteCharacter} onUpdate={updateCharacter} events={events} relations={relations} foreshadows={foreshadows} reorderMode={reorderMode}
              onSaveOrder={(ordered) => ordered.forEach((c, i) => updateCharacter(c.id, { order: i }))} />
          )}
          {activeTab === 'world' && (
            <WorldView docs={worldDocs} onAdd={(title) => { if (checkLimit(worldDocs.length, 'worldDocs')) return addWorldDoc(title); }} onUpdate={updateWorldDoc} onDelete={deleteWorldDoc} reorderMode={reorderMode}
              onSaveOrder={(ordered) => ordered.forEach((d, i) => updateWorldDoc(d.id, { order: i }))} />
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
              onUpdate={updateEvent} onDelete={deleteEvent}
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

      {/* 바텀 탭바 (모바일/태블릿) */}
      {(isMobile || isTablet) && (
        <Navigation
          activeTab={activeTab} setActiveTab={handleSetActiveTab}
          characters={characters} selectedChar={selectedChar} onSelectChar={handleCharClick}
          projectName={project?.name || ''}
          sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen}
        />
      )}

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
                    {matchedFS.length > 0 && <><SectionLabel label="복선" count={matchedFS.length} />{matchedFS.map(f => <ResultItem key={f.id} icon="⟡" title={f.title} sub={f.resolved ? '회수 완료' : '미회수'} onClick={() => handleSetActiveTab('foreshadow')} />)}</>}
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

      {/* 맥베스 예시 온보딩 오버레이 */}
      {showOverlay && <TabExampleOverlay tab={overlayTab} onClose={() => setShowOverlay(false)} />}
    </div>
  );
}

// ── 탭 예시 오버레이 ──
const TAB_OVERLAY_DATA = {
  relation:   { name: '인물 관계도', src: '/screenshots/relation.png',   dir: 'horizontal', desc: '캐릭터 간 관계가 색상별 선으로 표시돼요' },
  characters: { name: '캐릭터',     src: '/screenshots/character.png',  dir: 'horizontal', desc: '프로필 사진과 역할이 카드로 표시돼요' },
  world:      { name: '설정집',     src: '/screenshots/world.png',      dir: 'horizontal', desc: '주제별 문서를 자유롭게 추가하고 정렬할 수 있어요' },
  foreshadow: { name: '복선',       src: '/screenshots/foreshadow.png', dir: 'horizontal', desc: '미회수/회수 완료 상태를 토글로 관리해요' },
  timeline:   { name: '타임라인',   src: '/screenshots/timeline.png',   dir: 'horizontal', desc: '화수별 사건이 시간순으로 정렬돼요' },
  fanworks:   { name: '링크',       src: '/screenshots/link.png',       dir: 'horizontal', desc: '유형별로 색상 태그가 붙어요' },
};

function TabExampleOverlay({ tab, onClose }) {
  const data = TAB_OVERLAY_DATA[tab];
  const imgRef = React.useRef(null);
  const shotRef = React.useRef(null);
  const animRef = React.useRef(null);

  React.useEffect(() => {
    if (!imgRef.current || !shotRef.current) return;
    const img = imgRef.current;
    const shot = shotRef.current;

    const startPan = () => {
      const excess = img.naturalWidth * (shot.offsetHeight / img.naturalHeight) - shot.offsetWidth;
      if (excess <= 0) return;
      let startTs = null;
      const duration = 10000;
      let forward = true;

      const step = (ts) => {
        if (!startTs) startTs = ts;
        const raw = Math.min((ts - startTs) / duration, 1);
        const t = forward ? raw : 1 - raw;
        const smooth = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
        if (img.parentElement) img.style.transform = `translateX(${-excess * smooth}px)`;
        if (raw < 1) {
          animRef.current = requestAnimationFrame(step);
        } else {
          forward = !forward;
          startTs = null;
          animRef.current = requestAnimationFrame(step);
        }
      };
      animRef.current = requestAnimationFrame(step);
    };

    if (img.complete && img.naturalWidth) startPan();
    else img.addEventListener('load', startPan);
    return () => cancelAnimationFrame(animRef.current);
  }, [tab]);

  if (!data) return null;

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: 'var(--bg)',
      display: 'flex', flexDirection: 'column',
      animation: 'overlayFadeIn 0.2s ease',
    }}>
      <style>{`
        @keyframes overlayFadeIn { from { opacity: 0 } to { opacity: 1 } }
        @keyframes overlayPulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:0.4;transform:scale(0.6)} }
      `}</style>

      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 20px', height: 52,
        borderBottom: '1px solid var(--border)', flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--accent)', display: 'inline-block', animation: 'overlayPulse 2s ease-in-out infinite' }} />
          <span style={{ fontSize: 12, color: 'var(--accent2)', letterSpacing: '0.05em', fontWeight: 500 }}>
            맥베스 예시 — {data.name}
          </span>
        </div>
        <button
          onClick={onClose}
          style={{ background: 'var(--accent)', border: 'none', borderRadius: 8, color: '#fff', fontSize: 13, fontWeight: 500, padding: '8px 18px', cursor: 'pointer', fontFamily: 'inherit' }}
          onMouseEnter={e => e.currentTarget.style.opacity = '0.85'}
          onMouseLeave={e => e.currentTarget.style.opacity = '1'}
        >
          예시 닫기
        </button>
      </div>

      <div ref={shotRef} style={{ flex: 1, overflow: 'hidden', position: 'relative', background: '#06060f' }}>
        <img
          ref={imgRef}
          src={data.src}
          alt={data.name}
          style={{ position: 'absolute', top: 0, left: 0, height: '100%', width: 'auto', maxWidth: 'none', willChange: 'transform' }}
        />
      </div>

      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 20px', height: 44,
        borderTop: '1px solid var(--border)', flexShrink: 0,
      }}>
        <span style={{ fontSize: 12, color: 'var(--text3)' }}>{data.desc}</span>
        <span style={{ fontSize: 11, color: 'var(--text3)' }}>맥베스(Shakespeare) 예시 데이터</span>
      </div>
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
function CharacterList({ characters, onSelect, selected, onDelete, onUpdate, events, relations, foreshadows, reorderMode, onSaveOrder }) {
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
            onDelete={(id) => { onDelete(id); closeDetail(); }}
            onClose={closeDetail}
          />
        </div>
      )}
    </div>
  );
}

// ── 캐릭터 상세 전체화면 ──
function CharacterDetailPage({ character: c, characters, events, relations, foreshadows, onUpdate, onDelete, onClose }) {
  const ac = getAvatarColor(c.name || '?');
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

  const save = () => {
    onUpdate(c.id, form);
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
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

  const inputStyle = { width: '100%', background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 12px', color: 'var(--text)', fontSize: 14, outline: 'none', boxSizing: 'border-box' };

  const Field = ({ label, children }) => (
    <div style={{ marginBottom: 20 }}>
      <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</div>
      {children}
    </div>
  );

  return (
    <div style={{ maxWidth: 720, margin: '0 auto', padding: '24px 20px 60px' }}>
      {/* 상단 바 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 32 }}>
        <button className="btn btn-ghost" style={{ fontSize: 13, padding: '0 12px', height: 36 }} onClick={onClose}>← 목록</button>
        <div style={{ flex: 1 }} />
        <button className="btn btn-danger" style={{ fontSize: 13, height: 36, padding: '0 14px' }}
          onClick={() => { if (window.confirm(`'${c.name}' 삭제할까요?`)) onDelete(c.id); }}>삭제</button>
        <button className="btn btn-primary" style={{ fontSize: 13, height: 36, padding: '0 18px' }} onClick={save}>
          {saved ? '✓ 저장됨' : '저장'}
        </button>
      </div>

      {/* 아바타 + 이름 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 32 }}>
        {/* 사진 업로드 */}
        <label style={{ position: 'relative', cursor: 'pointer', flexShrink: 0 }}>
          <input type="file" accept="image/*" style={{ display: 'none' }} onChange={handlePhotoUpload} />
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
            style={{ ...inputStyle, fontSize: 22, fontFamily: 'var(--font-serif)', fontWeight: 600, border: 'none', background: 'transparent', padding: '4px 0', borderBottom: '1px dashed var(--border2)', borderRadius: 0, width: '100%' }}
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
        <Field label="역할"><input value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))} style={inputStyle} placeholder="예: 주인공" /></Field>
        <Field label="나이"><input value={form.age} onChange={e => setForm(f => ({ ...f, age: e.target.value }))} style={inputStyle} placeholder="예: 23세" /></Field>
        <Field label="소속"><input value={form.affiliation} onChange={e => setForm(f => ({ ...f, affiliation: e.target.value }))} style={inputStyle} placeholder="예: 스코틀랜드 왕궁" /></Field>
        <Field label="능력/특기"><input value={form.ability} onChange={e => setForm(f => ({ ...f, ability: e.target.value }))} style={inputStyle} placeholder="예: 정치" /></Field>
      </div>

      {/* 인물 소개 */}
      <Field label="인물 소개">
        <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
          rows={5} style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.7 }} placeholder="인물을 자유롭게 소개해주세요..." />
      </Field>

      {/* 성격 태그 */}
      <Field label="성격 태그">
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
          {form.tags.map((t, i) => (
            <span key={i} className="tag" style={{ background: 'var(--bg4)', color: 'var(--text2)', cursor: 'pointer', fontSize: 12 }}
              onClick={() => setForm(f => ({ ...f, tags: f.tags.filter((_, j) => j !== i) }))}>
              {t} ×
            </span>
          ))}
        </div>
        <form onSubmit={addTag} style={{ display: 'flex', gap: 8 }}>
          <input value={newTag} onChange={e => setNewTag(e.target.value)} placeholder="태그 입력 후 엔터" style={{ ...inputStyle, flex: 1 }} />
          <button type="submit" className="btn" style={{ height: 38, padding: '0 14px' }}>+</button>
        </form>
      </Field>

      {/* 등장 화수 — 타임라인 연동 */}
      <Field label="등장 화수">
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
      </Field>

      {/* 관련 복선 */}
      {myForeshadows.length > 0 && (
        <Field label={`관련 복선 (${myForeshadows.length})`}>
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
        </Field>
      )}

      {/* 관계 목록 */}
      {myRelations.length > 0 && (
        <Field label={`관계 (${myRelations.length})`}>
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
        </Field>
      )}
    </div>
  );
}

function CharacterCard({ character: c, isSelected, onSelect, onDelete }) {
  const ac = getAvatarColor(c.name || '?');
  const [hovered, setHovered] = React.useState(false);

  return (
    <div onClick={() => onSelect(c)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
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
        {c.role && <div style={{ color: 'var(--text3)', fontSize: 10, marginTop: 2 }}>{c.role}</div>}
        {c.tags?.length > 0 && (
          <div style={{ marginTop: 8, display: 'flex', flexWrap: 'wrap', gap: 3, justifyContent: 'center' }}>
            {c.tags.slice(0, 2).map((t, i) => <span key={i} className="tag" style={{ background: 'var(--bg4)', color: 'var(--text3)', fontSize: 10 }}>{t}</span>)}
          </div>
        )}
      </div>
      {/* 삭제 버튼 - 호버시에만 표시 */}
      {hovered && (
        <button className="btn btn-danger" style={{ position: 'absolute', top: 8, right: 8, fontSize: 11, height: 26, padding: '0 8px', zIndex: 2 }}
          onClick={e => { e.stopPropagation(); if (window.confirm(`'${c.name}' 삭제할까요?`)) onDelete(c.id); }}>삭제</button>
      )}
    </div>
  );
}

// ── 세계관 ──
function WorldView({ docs, onAdd, onUpdate, onDelete, reorderMode, onSaveOrder }) {
  const [selected, setSelected] = useState(null);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [saved, setSaved] = useState(true);
  const [orderedDocs, setOrderedDocs] = useState(null);
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
    if (window.confirm(`'${d.title}' 삭제할까요?`)) {
      onDelete(d.id);
      if (selected?.id === d.id) { setSelected(null); setTitle(''); setContent(''); setSaved(true); }
    }
  };

  // 문서 편집 화면
  if (selected) return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 20px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
        <button className="btn btn-ghost" style={{ fontSize: 12, padding: '0 10px', height: 32 }}
          onClick={() => { if (!saved && !window.confirm('저장하지 않은 내용이 있어요. 나가시겠어요?')) return; setSelected(null); }}>← 목록</button>
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
        <button className="btn btn-danger" style={{ fontSize: 11, height: 28, padding: '0 10px' }}
          onClick={() => { if (window.confirm(`'${title}' 삭제할까요?`)) { onDelete(selected.id); setSelected(null); } }}>삭제</button>
      </div>
      <textarea value={content} onChange={e => { setContent(e.target.value); setSaved(false); }}
        style={{ flex: 1, background: 'transparent', border: 'none', color: 'var(--text2)', fontSize: 14, lineHeight: 1.8, resize: 'none', outline: 'none', padding: '20px' }}
        placeholder="설정을 자유롭게 작성하세요..." />
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
              <button className="btn btn-ghost" style={{ fontSize: 11, height: 30, padding: '0 10px', flexShrink: 0 }} onClick={e => handleDelete(e, d)}>삭제</button>
            </div>
          ))}
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
  };

  const openRaw = foreshadows.filter(f => !f.resolved);
  const closedRaw = foreshadows.filter(f => f.resolved);
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
    }
    prevReorderModeF.current = reorderMode;
  }, [reorderMode]);

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: 20 }}>
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
                    <div key={i} style={{ display: 'flex', gap: 6, marginBottom: 6 }}>
                      <input value={m.ep} onChange={e => setForm(f => ({ ...f, mentions: f.mentions.map((x, j) => j === i ? { ...x, ep: e.target.value } : x) }))}
                        placeholder="화수" style={{ width: 70 }} />
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
              <input value={m.ep} onChange={e => setForm(f => ({ ...f, mentions: f.mentions.map((x, j) => j === i ? { ...x, ep: e.target.value } : x) }))}
                placeholder="화수" style={{ width: 70 }} />
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
    <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '12px 14px', marginBottom: 8 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <span style={{ fontSize: 13, fontWeight: 500 }}>{fs.title}</span>
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
          <button className="btn btn-danger" style={{ fontSize: 11, height: 30, padding: '0 10px' }} onClick={() => { if (window.confirm('복선을 삭제할까요?')) onDelete(fs.id); }}>삭제</button>
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
function ShareModal({ projectId, project, onClose, onUpdate }) {
  const [shareEnabled, setShareEnabled] = useState(project?.shareEnabled || false);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);

  const shareUrl = `${window.location.origin}/shared/${projectId}`;

  const toggleShare = async () => {
    setSaving(true);
    const next = !shareEnabled;
    await updateDoc(doc(db, 'projects', projectId), { shareEnabled: next });
    setShareEnabled(next);
    onUpdate({ shareEnabled: next });
    setSaving(false);
  };

  const copyLink = () => {
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 400 }}>
        <div className="modal-title">공유 설정</div>

        {/* 공유 토글 */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 0', borderBottom: '1px solid var(--border)' }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 500 }}>읽기 전용 링크</div>
            <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 3 }}>웹툰 작가 등 협업자가 설정을 열람할 수 있어요</div>
          </div>
          <button
            onClick={toggleShare}
            disabled={saving}
            style={{
              width: 44, height: 24, borderRadius: 99, border: 'none', cursor: 'pointer',
              background: shareEnabled ? 'var(--accent)' : 'var(--bg4)',
              position: 'relative', transition: 'background 0.2s', flexShrink: 0
            }}
          >
            <div style={{
              width: 18, height: 18, borderRadius: '50%', background: '#fff',
              position: 'absolute', top: 3,
              left: shareEnabled ? 23 : 3,
              transition: 'left 0.2s'
            }} />
          </button>
        </div>

        {/* 링크 복사 */}
        {shareEnabled && (
          <div style={{ marginTop: 16 }}>
            <label className="form-label">공유 링크</label>
            <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
              <input
                readOnly value={shareUrl}
                style={{ flex: 1, fontSize: 12, color: 'var(--text2)', cursor: 'text' }}
                onClick={e => e.target.select()}
              />
              <button className="btn btn-primary" style={{ flexShrink: 0, fontSize: 12, padding: '0 14px' }} onClick={copyLink}>
                {copied ? '✓ 복사됨' : '복사'}
              </button>
            </div>
            <div style={{ marginTop: 10, padding: '10px 12px', background: 'var(--bg3)', borderRadius: 'var(--radius)', fontSize: 12, color: 'var(--text3)', lineHeight: 1.6 }}>
              링크를 받은 사람은 캐릭터 설정, 설정집, 복선을 <strong style={{ color: 'var(--text2)' }}>읽기 전용</strong>으로 볼 수 있어요. 편집은 불가능해요.
            </div>
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
