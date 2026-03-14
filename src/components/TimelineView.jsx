import React, { useState } from 'react';
import { getAvatarColor } from './DetailPanel';

export default function TimelineView({ events, characters, foreshadows, onAdd, onUpdate, onDelete }) {
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ episode: '', title: '', description: '', charIds: [], foreshadowIds: [], type: 'event' });
  const [expandedId, setExpandedId] = useState(null);

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!form.title.trim() || !form.episode) return;
    await onAdd({ ...form, episode: Number(form.episode) });
    setForm({ episode: '', title: '', description: '', charIds: [], foreshadowIds: [], type: 'event' });
    setShowAdd(false);
  };

  const sorted = [...events].sort((a, b) => (a.episode || 0) - (b.episode || 0));

  const TYPE_COLORS = {
    event: { bg: 'rgba(139,124,248,0.15)', color: '#a89cf8', label: '사건' },
    foreshadow_plant: { bg: 'rgba(245,158,11,0.15)', color: '#f59e0b', label: '복선 심기' },
    foreshadow_resolve: { bg: 'rgba(74,222,128,0.15)', color: '#4ade80', label: '복선 회수' },
    character: { bg: 'rgba(45,212,191,0.15)', color: '#2dd4bf', label: '캐릭터 등장' },
    twist: { bg: 'rgba(248,113,113,0.15)', color: '#f87171', label: '반전' },
  };

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: 22 }}>타임라인</h2>
        <button className="btn btn-primary" style={{ fontSize: 13 }} onClick={() => setShowAdd(true)}>+ 이벤트 추가</button>
      </div>

      {sorted.length === 0 && !showAdd ? (
        <div style={{ color: 'var(--text3)', textAlign: 'center', padding: 60, fontSize: 13 }}>
          화수별 이벤트를 추가해보세요
        </div>
      ) : (
        <div style={{ position: 'relative', paddingLeft: 32 }}>
          {/* 타임라인 세로선 */}
          <div style={{ position: 'absolute', left: 10, top: 8, bottom: 8, width: 1, background: 'var(--border2)' }} />

          {sorted.map((ev, idx) => {
            const tc = TYPE_COLORS[ev.type] || TYPE_COLORS.event;
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
                  style={{
                    background: 'var(--bg2)', border: '1px solid var(--border)',
                    borderRadius: 'var(--radius)', padding: '12px 14px',
                    cursor: 'pointer', transition: 'border-color 0.15s'
                  }}
                  onClick={() => setExpandedId(isExpanded ? null : ev.id)}
                  onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--border2)'}
                  onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <span style={{ fontSize: 11, color: 'var(--text3)', fontWeight: 500, minWidth: 36 }}>{ev.episode}화</span>
                    <span className="tag" style={{ background: tc.bg, color: tc.color, fontSize: 10 }}>{tc.label}</span>
                    <span style={{ fontSize: 13, fontWeight: 500, flex: 1 }}>{ev.title}</span>
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
                        <button className="btn btn-ghost" style={{ fontSize: 11, height: 28, padding: '0 10px' }} onClick={e => { e.stopPropagation(); /* TODO: edit */ }}>편집</button>
                        <button className="btn btn-danger" style={{ fontSize: 11, height: 28, padding: '0 10px' }} onClick={e => { e.stopPropagation(); onDelete(ev.id); }}>삭제</button>
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
        <div className="modal-backdrop" onClick={() => setShowAdd(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-title">이벤트 추가</div>
            <form onSubmit={handleAdd}>
              <div className="form-row">
                <div className="form-group" style={{ maxWidth: 100 }}>
                  <label className="form-label">화수 *</label>
                  <input type="number" value={form.episode} onChange={e => setForm(f => ({ ...f, episode: e.target.value }))} style={{ width: '100%' }} placeholder="예: 3" autoFocus />
                </div>
                <div className="form-group">
                  <label className="form-label">유형</label>
                  <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}
                    style={{ width: '100%', background: 'var(--bg3)', border: '1px solid var(--border2)', borderRadius: 'var(--radius)', color: 'var(--text)', padding: '8px 12px', outline: 'none' }}>
                    {Object.entries(TYPE_COLORS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                  </select>
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">제목 *</label>
                <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} style={{ width: '100%' }} placeholder="예: 솔음, 괴담 속으로 빙의" />
              </div>
              <div className="form-group">
                <label className="form-label">설명</label>
                <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={2} style={{ width: '100%' }} placeholder="이벤트 상세 내용..." />
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
                        <span key={fs.id} className="tag" onClick={() => setForm(f => ({ ...f, foreshadowIds: selected ? f.foreshadowIds.filter(id => id !== fs.id) : [...f.foreshadowIds, fs.id] }))}
                          style={{ background: selected ? 'rgba(245,158,11,0.15)' : 'var(--bg4)', color: selected ? '#f59e0b' : 'var(--text3)', cursor: 'pointer', border: selected ? '1px solid rgba(245,158,11,0.3)' : '1px solid transparent', fontSize: 11 }}>
                          {fs.title}
                        </span>
                      );
                    })}
                  </div>
                </div>
              )}
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 20 }}>
                <button type="button" className="btn" onClick={() => setShowAdd(false)}>취소</button>
                <button type="submit" className="btn btn-primary" disabled={!form.title.trim() || !form.episode}>추가</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
