import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useCharacters, useRelations, useForeshadows, useWorldDocs, useTimelineEvents } from '../hooks/useProject';
import { useBreakpoint } from '../hooks/useBreakpoint';
import Navigation from '../components/Navigation';
import DetailPanel, { getAvatarColor } from '../components/DetailPanel';
import RelationCanvas from '../components/RelationCanvas';
import TimelineView from '../components/TimelineView';

export default function Project({ user }) {
  const { id: projectId } = useParams();
  const navigate = useNavigate();
  const { isMobile, isTablet, isDesktop } = useBreakpoint();

  const [project, setProject] = useState(null);
  const [activeTab, setActiveTab] = useState('relation');
  const [selectedChar, setSelectedChar] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [connectMode, setConnectMode] = useState(false);
  const [connectFrom, setConnectFrom] = useState(null);
  const [showRelModal, setShowRelModal] = useState(null);
  const [relLabel, setRelLabel] = useState('');
  const [showAddChar, setShowAddChar] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);

  const { characters, addCharacter, updateCharacter, deleteCharacter } = useCharacters(projectId);
  const { relations, addRelation, updateRelation, deleteRelation } = useRelations(projectId);
  const { foreshadows, addForeshadow, updateForeshadow, deleteForeshadow } = useForeshadows(projectId);
  const { docs: worldDocs, addWorldDoc, updateWorldDoc, deleteWorldDoc } = useWorldDocs(projectId);
  const { events, addEvent, updateEvent, deleteEvent } = useTimelineEvents(projectId);

  useEffect(() => {
    getDoc(doc(db, 'projects', projectId)).then(d => { if (d.exists()) setProject(d.data()); });
  }, [projectId]);

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
    await addRelation(showRelModal.fromId, showRelModal.toId, relLabel);
    setRelLabel(''); setShowRelModal(null);
  };

  const selectedCharObj = characters.find(c => c.id === selectedChar?.id);

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
        <span style={{ fontFamily: 'var(--font-serif)', fontSize: 15, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {project?.name || '...'}
        </span>
        {/* 액션 버튼들 */}
        {activeTab === 'relation' && (
          <button
            className={`btn ${connectMode ? 'btn-primary' : ''}`}
            style={{ fontSize: 12, padding: '0 10px', height: 34 }}
            onClick={() => { setConnectMode(v => !v); setConnectFrom(null); }}
          >
            {isMobile ? '연결' : connectMode ? (connectFrom ? '대상 선택' : '시작 선택') : '관계 연결'}
          </button>
        )}
        <button className="btn btn-primary" style={{ fontSize: 12, padding: '0 10px', height: 34 }} onClick={() => setShowAddChar(true)}>
          {isMobile ? '+' : '+ 캐릭터'}
        </button>
        <button className="btn" style={{ fontSize: 12, padding: '0 10px', height: 34 }} onClick={() => setShowShareModal(true)}>
          {isMobile ? '공유' : '🔗 공유'}
        </button>
      </header>

      {/* 바디 */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden', paddingBottom: bottomPad }}>
        {/* 사이드바 / 탭바 네비게이션 */}
        <Navigation
          activeTab={activeTab} setActiveTab={setActiveTab}
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
            />
          )}
          {activeTab === 'characters' && (
            <CharacterList characters={characters} onSelect={handleCharClick} selected={selectedChar} onDelete={deleteCharacter} />
          )}
          {activeTab === 'world' && (
            <WorldView docs={worldDocs} onAdd={addWorldDoc} onUpdate={updateWorldDoc} onDelete={deleteWorldDoc} />
          )}
          {activeTab === 'foreshadow' && (
            <ForeshadowView foreshadows={foreshadows} characters={characters} onAdd={addForeshadow} onUpdate={updateForeshadow} onDelete={deleteForeshadow} />
          )}
          {activeTab === 'timeline' && (
            <TimelineView
              events={events} characters={characters} foreshadows={foreshadows}
              onAdd={addEvent} onUpdate={updateEvent} onDelete={deleteEvent}
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
          activeTab={activeTab} setActiveTab={setActiveTab}
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
            <div className="form-group">
              <label className="form-label">관계 설명</label>
              <input value={relLabel} onChange={e => setRelLabel(e.target.value)} placeholder="예: 동료, 적대, 연인" style={{ width: '100%' }} autoFocus onKeyDown={e => e.key === 'Enter' && handleAddRelation()} />
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
    </div>
  );
}

// ── 캐릭터 목록 ──
function CharacterList({ characters, onSelect, selected, onDelete }) {
  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: 20 }}>
      {characters.length === 0 ? (
        <div style={{ color: 'var(--text3)', textAlign: 'center', padding: 60, fontSize: 13 }}>캐릭터가 없어요</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 12 }}>
          {characters.map(c => {
            const ac = getAvatarColor(c.name || '?');
            return (
              <div key={c.id} onClick={() => onSelect(c)} style={{ background: 'var(--bg2)', border: `1px solid ${selected?.id === c.id ? 'var(--accent)' : 'var(--border)'}`, borderRadius: 'var(--radius-lg)', padding: 14, cursor: 'pointer' }}>
                <div style={{ width: 38, height: 38, borderRadius: '50%', background: ac.bg, color: ac.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-serif)', fontSize: 16, marginBottom: 8 }}>{c.name?.[0] || '?'}</div>
                <div style={{ fontWeight: 500, fontSize: 13 }}>{c.name}</div>
                <div style={{ color: 'var(--text3)', fontSize: 11, marginTop: 2 }}>{c.role}</div>
                {c.tags?.length > 0 && (
                  <div style={{ marginTop: 8, display: 'flex', flexWrap: 'wrap', gap: 3 }}>
                    {c.tags.slice(0, 3).map((t, i) => <span key={i} className="tag" style={{ background: 'var(--bg4)', color: 'var(--text3)', fontSize: 10 }}>{t}</span>)}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── 세계관 ──
function WorldView({ docs, onAdd, onUpdate, onDelete }) {
  const [selected, setSelected] = useState(null);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const { isMobile } = useBreakpoint();
  const [showDocList, setShowDocList] = useState(!isMobile);

  const selectDoc = d => { setSelected(d); setTitle(d.title); setContent(d.content || ''); if (isMobile) setShowDocList(false); };
  const save = () => { if (selected) onUpdate(selected.id, { title, content }); };
  const addNew = async () => { const ref = await onAdd('새 문서'); selectDoc({ id: ref.id, title: '새 문서', content: '' }); };

  const docList = (
    <div style={{ width: isMobile ? '100%' : 190, borderRight: isMobile ? 'none' : '1px solid var(--border)', background: 'var(--bg2)', overflowY: 'auto', padding: 8, flexShrink: 0 }}>
      <button className="btn btn-ghost" style={{ width: '100%', fontSize: 12, marginBottom: 8, justifyContent: 'flex-start' }} onClick={addNew}>+ 새 문서</button>
      {docs.map(d => (
        <button key={d.id} onClick={() => selectDoc(d)} style={{ width: '100%', textAlign: 'left', padding: '8px 10px', borderRadius: 8, fontSize: 13, background: selected?.id === d.id ? 'var(--bg3)' : 'transparent', color: selected?.id === d.id ? 'var(--text)' : 'var(--text2)', border: 'none', cursor: 'pointer', display: 'block', marginBottom: 2 }}>{d.title}</button>
      ))}
    </div>
  );

  const editor = (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: 20, overflow: 'hidden' }}>
      {isMobile && (
        <button className="btn btn-ghost" style={{ alignSelf: 'flex-start', marginBottom: 12, fontSize: 12 }} onClick={() => setShowDocList(true)}>← 목록</button>
      )}
      {selected ? (
        <>
          <input value={title} onChange={e => setTitle(e.target.value)} onBlur={save} style={{ fontSize: 20, fontFamily: 'var(--font-serif)', background: 'transparent', border: 'none', color: 'var(--text)', marginBottom: 14, outline: 'none', borderBottom: '1px solid var(--border)', paddingBottom: 10 }} />
          <textarea value={content} onChange={e => setContent(e.target.value)} onBlur={save} style={{ flex: 1, background: 'transparent', border: 'none', color: 'var(--text2)', fontSize: 14, lineHeight: 1.8, resize: 'none', outline: 'none' }} placeholder="세계관 설정을 자유롭게 작성하세요..." />
        </>
      ) : (
        <div style={{ color: 'var(--text3)', textAlign: 'center', marginTop: 60, fontSize: 13 }}>문서를 선택하거나 새로 만드세요</div>
      )}
    </div>
  );

  if (isMobile) return <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>{showDocList ? docList : editor}</div>;
  return <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>{docList}{editor}</div>;
}

// ── 복선 관리 ──
function ForeshadowView({ foreshadows, characters, onAdd, onUpdate, onDelete }) {
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ title: '', plantedEp: '', resolvedEp: '', charIds: [] });

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) return;
    await onAdd(form);
    setForm({ title: '', plantedEp: '', resolvedEp: '', charIds: [] });
    setShowAdd(false);
  };

  const open = foreshadows.filter(f => !f.resolvedEp);
  const closed = foreshadows.filter(f => f.resolvedEp);

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: 22 }}>복선 관리</h2>
        <button className="btn btn-primary" style={{ fontSize: 13 }} onClick={() => setShowAdd(true)}>+ 복선 추가</button>
      </div>

      {foreshadows.length === 0 && <div style={{ color: 'var(--text3)', textAlign: 'center', padding: 60, fontSize: 13 }}>복선을 추가해보세요</div>}

      {open.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <div className="section-label" style={{ marginBottom: 10 }}>미회수 ({open.length})</div>
          {open.map(fs => <FSCard key={fs.id} fs={fs} characters={characters} onUpdate={onUpdate} onDelete={onDelete} />)}
        </div>
      )}
      {closed.length > 0 && (
        <div>
          <div className="section-label" style={{ marginBottom: 10 }}>회수 완료 ({closed.length})</div>
          {closed.map(fs => <FSCard key={fs.id} fs={fs} characters={characters} onUpdate={onUpdate} onDelete={onDelete} />)}
        </div>
      )}

      {showAdd && (
        <div className="modal-backdrop" onClick={() => setShowAdd(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-title">복선 추가</div>
            <form onSubmit={handleAdd}>
              <div className="form-group"><label className="form-label">복선 내용</label><input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} style={{ width: '100%' }} placeholder="예: 바이올린 소리 언급" autoFocus /></div>
              <div className="form-row">
                <div className="form-group"><label className="form-label">심은 화수</label><input value={form.plantedEp} onChange={e => setForm(f => ({ ...f, plantedEp: e.target.value }))} style={{ width: '100%' }} placeholder="예: 3화" /></div>
                <div className="form-group"><label className="form-label">회수 화수</label><input value={form.resolvedEp} onChange={e => setForm(f => ({ ...f, resolvedEp: e.target.value }))} style={{ width: '100%' }} placeholder="미회수면 비워두기" /></div>
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
  const linked = characters.filter(c => fs.charIds?.includes(c.id));
  return (
    <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 13, fontWeight: 500 }}>{fs.title}</div>
        <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 3 }}>{fs.plantedEp && `${fs.plantedEp} 심음`}{fs.plantedEp && ' → '}{fs.resolvedEp ? `${fs.resolvedEp} 회수` : '미회수'}</div>
        {linked.length > 0 && (
          <div style={{ marginTop: 6, display: 'flex', gap: 4, flexWrap: 'wrap' }}>
            {linked.map(c => { const ac = getAvatarColor(c.name); return <span key={c.id} className="tag" style={{ background: ac.bg, color: ac.color, fontSize: 10 }}>{c.name}</span>; })}
          </div>
        )}
      </div>
      <button className="btn btn-danger" style={{ fontSize: 11, height: 30, padding: '0 10px', flexShrink: 0 }} onClick={() => onDelete(fs.id)}>삭제</button>
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
          <div className="form-group"><label className="form-label">역할</label><input {...f('role')} placeholder="주인공, 악역..." style={{ width: '100%' }} /></div>
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
              링크를 받은 사람은 캐릭터 설정, 세계관, 복선을 <strong style={{ color: 'var(--text2)' }}>읽기 전용</strong>으로 볼 수 있어요. 편집은 불가능해요.
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
