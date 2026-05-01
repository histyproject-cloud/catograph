import React, { useState } from 'react';
import { getAvatarColor } from './DetailPanel';

// ── 드래그 순서 훅 (모션 포함) ──
// canDrop(a, b): 두 아이템 사이 드롭 가능 여부 (같은 화수끼리만 등). 미지정 시 항상 허용.
function useDragOrder(items, onReorder, canDrop) {
  const dragItem = React.useRef(null);
  const [draggingIdx, setDraggingIdx] = React.useState(null);
  const [dragOverIdx, setDragOverIdx] = React.useState(null);

  const onDragStart = (idx) => { dragItem.current = idx; setDraggingIdx(idx); };
  const onDragEnter = (idx) => {
    // 다른 그룹(예: 다른 화수)으로는 드롭 자체가 안 되도록 시각 이동도 차단
    const from = dragItem.current;
    if (canDrop && from !== null && items[from] && items[idx] && !canDrop(items[from], items[idx])) {
      return;
    }
    setDragOverIdx(idx);
  };
  const onDragEnd = () => {
    const from = dragItem.current;
    const to = dragOverIdx;
    if (from !== null && to !== null && from !== to) {
      if (!canDrop || canDrop(items[from], items[to])) {
        const next = [...items];
        const dragged = next.splice(from, 1)[0];
        next.splice(to, 0, dragged);
        onReorder(next);
      }
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

export default function TimelineView({ events, characters, foreshadows, onAdd, onUpdate, onUpdateForeshadow, onDelete, reorderMode, onSaveOrder }) {
  const [showAdd, setShowAdd] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [pendingDeleteId, setPendingDeleteId] = useState(null);
  const [form, setForm] = useState({ episode: '', title: '', description: '', charIds: [], foreshadowIds: [], type: 'event' });
  const [expandedId, setExpandedId] = useState(null);
  const [customType, setCustomType] = useState('');
  // #12 — 복선을 새로 연결할 때 해당 복선의 언급 화수에도 추가할지 묻는 모달
  const [pendingMentionFS, setPendingMentionFS] = useState(null); // { fs, ep }
  const [formError, setFormError] = useState('');

  const openAdd = () => { setForm({ episode: '', title: '', description: '', charIds: [], foreshadowIds: [], type: 'event' }); setEditTarget(null); setFormError(''); setShowAdd(true); };

  React.useEffect(() => {
    const handler = () => openAdd();
    document.addEventListener('timeline:add', handler);
    return () => document.removeEventListener('timeline:add', handler);
  }, []);
  const openEdit = (ev) => { setForm({ episode: String(ev.episode), title: ev.title, description: ev.description || '', charIds: ev.charIds || [], foreshadowIds: ev.foreshadowIds || [], type: ev.type || 'event' }); setEditTarget(ev); setShowAdd(true); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    // silent-fail-prevention: 검증 실패 시 inline 메시지로 안내
    if (!form.title.trim()) { setFormError('제목을 입력해주세요'); return; }
    if (!form.episode) { setFormError('화수를 입력해주세요 (1~999)'); return; }
    const ep = Number(form.episode);
    if (!Number.isFinite(ep) || ep < 1 || ep > 999) { setFormError('화수는 1~999 사이 숫자만 입력해주세요'); return; }
    setFormError('');
    if (editTarget) {
      await onUpdate(editTarget.id, { ...form, episode: ep });
    } else {
      await onAdd({ ...form, episode: ep });
    }
    setForm({ episode: '', title: '', description: '', charIds: [], foreshadowIds: [], type: 'event' });
    setShowAdd(false);
    setEditTarget(null);
  };

  const [orderedEvents, setOrderedEvents] = React.useState(null);
  // reorderMode 아닐 때는 화수 기준 정렬, reorderMode일 때만 드래그 순서 유지
  const sortedByEpisode = [...events].sort((a, b) => (a.episode || 0) - (b.episode || 0));
  const displayEvents = reorderMode ? (orderedEvents || sortedByEpisode) : sortedByEpisode;
  const sorted = displayEvents;

  // reorderMode 진입 시만 초기화, 종료 시 유지
  const prevReorderMode = React.useRef(false);
  React.useEffect(() => {
    if (reorderMode && !prevReorderMode.current) {
      setOrderedEvents([...sortedByEpisode]);
    }
    if (!reorderMode && prevReorderMode.current && orderedEvents) {
      onSaveOrder?.(orderedEvents);
    }
    prevReorderMode.current = reorderMode;
  }, [reorderMode]);

  // 같은 화수(episode) 안에서만 순서 이동 가능 (#2)
  const { onDragStart, onDragEnter, onDragEnd, draggingIdx, dragOverIdx, getItemStyle } = useDragOrder(
    sorted,
    setOrderedEvents,
    (a, b) => (a?.episode ?? null) === (b?.episode ?? null)
  );

  const TYPE_COLORS = {
    event: { bg: 'rgba(139,124,248,0.15)', color: '#a89cf8', label: '사건' },
    foreshadow_plant: { bg: 'rgba(245,158,11,0.15)', color: '#f59e0b', label: '복선 심기' },
    foreshadow_resolve: { bg: 'rgba(74,222,128,0.15)', color: '#4ade80', label: '복선 회수' },
    character: { bg: 'rgba(45,212,191,0.15)', color: '#2dd4bf', label: '캐릭터 등장' },
    twist: { bg: 'rgba(248,113,113,0.15)', color: '#f87171', label: '반전' },
  };

  // 커스텀 유형도 같은 텍스트면 같은 색 배정
  const CUSTOM_PALETTE = [
    { bg: 'rgba(96,165,250,0.15)', color: '#60a5fa' },
    { bg: 'rgba(244,114,182,0.15)', color: '#f472b6' },
    { bg: 'rgba(251,191,36,0.15)', color: '#fbbf24' },
    { bg: 'rgba(167,139,250,0.15)', color: '#a78bfa' },
    { bg: 'rgba(52,211,153,0.15)', color: '#34d399' },
    { bg: 'rgba(251,113,133,0.15)', color: '#fb7185' },
  ];

  const getTypeColor = (type) => {
    if (TYPE_COLORS[type]) return TYPE_COLORS[type];
    let hash = 0;
    for (let i = 0; i < type.length; i++) hash = type.charCodeAt(i) + ((hash << 5) - hash);
    return CUSTOM_PALETTE[Math.abs(hash) % CUSTOM_PALETTE.length];
  };

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: 20 }}>
      <p style={{ color: 'var(--text3)', fontSize: 12, marginBottom: 16 }}>화수별 주요 사건과 복선을 시간 순서로 정리하세요</p>
      {sorted.length === 0 && !showAdd ? (
        <div style={{ border: '1px dashed var(--border2)', borderRadius: 'var(--radius-lg)', padding: '60px 20px', textAlign: 'center' }}>
          <div style={{ fontSize: 28, marginBottom: 12, opacity: 0.3 }}>✦</div>
          <p style={{ color: 'var(--text2)', fontSize: 14, marginBottom: 20 }}>아직 추가된 타임라인이 없어요</p>
          <button className="btn btn-primary" onClick={() => document.dispatchEvent(new CustomEvent('timeline:add'))}>첫 타임라인 추가하기</button>
        </div>
      ) : (
        <div style={{ position: 'relative', paddingLeft: 32 }}>
          {/* 타임라인 세로선 */}
          <div style={{ position: 'absolute', left: 10, top: 8, bottom: 8, width: 1, background: 'var(--border2)' }} />

          {sorted.map((ev, idx) => {
            const tc = getTypeColor(ev.type || 'event');
            const linkedChars = characters.filter(c => ev.charIds?.includes(c.id));
            const linkedFS = foreshadows.filter(f => ev.foreshadowIds?.includes(f.id));
            const isExpanded = expandedId === ev.id;

            return (
              <div key={ev.id} style={{ position: 'relative', marginBottom: 16 }}>
                {/* 타임라인 점 */}
                <div style={{
                  position: 'absolute', left: -26, top: 14,
                  width: 10, height: 10, borderRadius: '50%',
                  background: tc.color, border: '2px solid var(--bg)',
                  boxShadow: `0 0 0 2px ${tc.color}40`
                }} />

                <div
                  draggable={reorderMode}
                  onDragStart={() => reorderMode && onDragStart(idx)}
                  onDragEnter={() => reorderMode && onDragEnter(idx)}
                  onDragEnd={reorderMode ? onDragEnd : undefined}
                  onDragOver={e => reorderMode && e.preventDefault()}
                  style={{
                    background: 'var(--bg2)',
                    border: reorderMode && dragOverIdx === idx && draggingIdx !== idx ? '2px solid var(--accent)' : '1px solid var(--border)',
                    borderRadius: 'var(--radius)', padding: '12px 14px',
                    cursor: reorderMode ? 'grab' : 'pointer',
                    ...(reorderMode ? getItemStyle(idx) : {}),
                  }}
                  onClick={() => !reorderMode && setExpandedId(isExpanded ? null : ev.id)}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <span style={{ fontSize: 11, color: 'var(--text3)', fontWeight: 500, minWidth: 36 }}>{ev.episode}화</span>
                    <span className="tag" style={{ background: tc.bg, color: tc.color, fontSize: 10 }}>{tc.label}</span>
                    <span style={{ fontSize: 13, fontWeight: 500, flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ev.title}</span>
                    <span style={{ color: 'var(--text3)', fontSize: 14 }}>{isExpanded ? '▲' : '▼'}</span>
                  </div>

                  {isExpanded && (
                    <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid var(--border)' }}>
                      {ev.description && (
                        <p style={{ color: 'var(--text2)', fontSize: 12, lineHeight: 1.7, marginBottom: 10 }}>{ev.description}</p>
                      )}
                      {linkedChars.length > 0 && (
                        <div style={{ marginBottom: 8 }}>
                          <div style={{ fontSize: 10, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 5 }}>등장 캐릭터</div>
                          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                            {linkedChars.map(c => {
                              const ac = getAvatarColor(c.name);
                              return <span key={c.id} className="tag" style={{ background: ac.bg, color: ac.color, fontSize: 11 }}>{c.name}</span>;
                            })}
                          </div>
                        </div>
                      )}
                      {linkedFS.length > 0 && (
                        <div style={{ marginBottom: 8 }}>
                          <div style={{ fontSize: 10, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 5 }}>연결된 복선</div>
                          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                            {linkedFS.map(f => <span key={f.id} className="tag" style={{ background: 'rgba(245,158,11,0.12)', color: '#f59e0b', fontSize: 11 }}>{f.title}</span>)}
                          </div>
                        </div>
                      )}
                      <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
                        <button className="btn btn-ghost" style={{ fontSize: 11, height: 28, padding: '0 10px' }} onClick={e => { e.stopPropagation(); openEdit(ev); }}>편집</button>
                        {pendingDeleteId === ev.id ? (
                          <>
                            <button className="btn" style={{ fontSize: 11, height: 28, padding: '0 10px' }} onClick={e => { e.stopPropagation(); setPendingDeleteId(null); }}>취소</button>
                            <button className="btn btn-danger" style={{ fontSize: 11, height: 28, padding: '0 10px' }} onClick={e => { e.stopPropagation(); onDelete(ev.id); setPendingDeleteId(null); }}>정말 삭제</button>
                          </>
                        ) : (
                          <button className="btn btn-danger" style={{ fontSize: 11, height: 28, padding: '0 10px' }} onClick={e => { e.stopPropagation(); setPendingDeleteId(ev.id); }}>삭제</button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 추가 모달 */}
      {showAdd && (
        <div className="modal-backdrop" onClick={() => { setShowAdd(false); setEditTarget(null); }}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-title">{editTarget ? '타임라인 수정' : '타임라인 추가'}</div>
            <form onSubmit={handleSubmit}>
              <div className="form-row">
                <div className="form-group" style={{ maxWidth: 100 }}>
                  <label className="form-label">화수 *</label>
                  <input
                    type="number"
                    min="1"
                    max="999"
                    value={form.episode}
                    onChange={e => {
                      const v = e.target.value;
                      if (v === '') return setForm(f => ({ ...f, episode: '' }));
                      const n = Number(v);
                      if (!Number.isFinite(n)) return;
                      // 1~999로 clamp (b1922e10 회귀 fix)
                      setForm(f => ({ ...f, episode: String(Math.min(999, Math.max(1, Math.floor(n)))) }));
                    }}
                    style={{ width: '100%' }}
                    placeholder="예: 3화"
                    autoFocus
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">유형</label>
                  <input value={form.type === 'event' ? '' : form.type}
                    onChange={e => setForm(f => ({ ...f, type: e.target.value || 'event' }))}
                    placeholder="예: 사건, 복선, 반전..."
                    style={{ width: '100%', background: 'var(--bg3)', border: '1px solid var(--border2)', borderRadius: 'var(--radius)', color: 'var(--text)', padding: '8px 12px', outline: 'none' }} />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">제목 *</label>
                <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} style={{ width: '100%' }} placeholder="예: 맥베스, 덩컨 왕을 살해" />
              </div>
              <div className="form-group">
                <label className="form-label">설명</label>
                <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={2} style={{ width: '100%' }} placeholder="상세 내용" />
              </div>
              {/* 캐릭터 연결 */}
              <div className="form-group">
                <label className="form-label">등장 캐릭터</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {characters.map(c => {
                    const selected = form.charIds.includes(c.id);
                    const ac = getAvatarColor(c.name);
                    return (
                      <span key={c.id} className="tag" onClick={() => setForm(f => ({ ...f, charIds: selected ? f.charIds.filter(id => id !== c.id) : [...f.charIds, c.id] }))}
                        style={{ background: selected ? ac.bg : 'var(--bg4)', color: selected ? ac.color : 'var(--text3)', cursor: 'pointer', border: selected ? `1px solid ${ac.color}40` : '1px solid transparent' }}>
                        {c.name}
                      </span>
                    );
                  })}
                </div>
              </div>
              {/* 복선 연결 */}
              {foreshadows.length > 0 && (
                <div className="form-group">
                  <label className="form-label">연결된 복선</label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {foreshadows.map(fs => {
                      const selected = form.foreshadowIds.includes(fs.id);
                      return (
                        <span key={fs.id} className="tag" onClick={() => {
                          // #12 — 복선을 새로 연결하는 경우(OFF→ON), 현재 화수 입력되어 있고
                          // 그 복선에 해당 화수 언급이 없으면 모달로 자동 추가 여부 묻기
                          if (!selected && form.episode && String(form.episode).trim() !== '' && onUpdateForeshadow) {
                            const epNum = Number(form.episode);
                            if (Number.isFinite(epNum) && !(fs.mentions || []).some(m => Number(m.ep) === epNum)) {
                              setPendingMentionFS({ fs, ep: epNum });
                            }
                          }
                          setForm(f => ({ ...f, foreshadowIds: selected ? f.foreshadowIds.filter(id => id !== fs.id) : [...f.foreshadowIds, fs.id] }));
                        }}
                          style={{ background: selected ? 'rgba(245,158,11,0.15)' : 'var(--bg4)', color: selected ? '#f59e0b' : 'var(--text3)', cursor: 'pointer', border: selected ? '1px solid rgba(245,158,11,0.3)' : '1px solid transparent', fontSize: 11 }}>
                          {fs.title}
                        </span>
                      );
                    })}
                  </div>
                </div>
              )}
              {formError && (
                <div style={{ color: '#ef4444', fontSize: 13, marginTop: 12, padding: '8px 12px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 6 }}>
                  ⚠ {formError}
                </div>
              )}
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 20 }}>
                <button type="button" className="btn" onClick={() => { setShowAdd(false); setEditTarget(null); setFormError(''); }}>취소</button>
                <button type="submit" className="btn btn-primary">{editTarget ? '저장' : '추가'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* #12 — 복선 언급 화수 자동 추가 확인 모달 */}
      {pendingMentionFS && (
        <div className="modal-backdrop" onClick={() => setPendingMentionFS(null)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 380 }}>
            <div className="modal-title">복선 언급에도 추가할까요?</div>
            <p style={{ color: 'var(--text2)', fontSize: 13, lineHeight: 1.7, marginBottom: 18 }}>
              "<strong style={{ color: 'var(--text)' }}>{pendingMentionFS.fs.title}</strong>" 복선의
              {' '}<strong style={{ color: 'var(--accent)' }}>{pendingMentionFS.ep}화</strong> 언급에도 자동으로 추가할까요?
            </p>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn" style={{ flex: 1 }} onClick={() => setPendingMentionFS(null)}>아니요</button>
              <button className="btn btn-primary" style={{ flex: 1 }}
                onClick={async () => {
                  const { fs, ep } = pendingMentionFS;
                  const newMentions = [...(fs.mentions || []), { ep: String(ep), note: '' }];
                  await onUpdateForeshadow(fs.id, { mentions: newMentions });
                  setPendingMentionFS(null);
                }}>
                추가하기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
