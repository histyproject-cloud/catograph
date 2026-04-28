import React, { useState, useCallback, memo } from 'react';
import { useBreakpoint } from '../hooks/useBreakpoint';

const AVATAR_COLORS = [
  { bg: 'rgba(139,124,248,0.18)', color: '#a89cf8' },
  { bg: 'rgba(45,212,191,0.18)', color: '#2dd4bf' },
  { bg: 'rgba(245,158,11,0.18)', color: '#f59e0b' },
  { bg: 'rgba(248,113,113,0.18)', color: '#f87171' },
  { bg: 'rgba(74,222,128,0.18)', color: '#4ade80' },
];

export function getAvatarColor(name = '') {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length];
}

// ── 공통 패널 내용 ──
function PanelContent({ character, onUpdate, onClose, foreshadows, onAddForeshadow, onUpdateForeshadow, onDeleteForeshadow, isMobile }) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState(null);
  const [newTag, setNewTag] = useState('');
  const [showAddFS, setShowAddFS] = useState(false);
  const [fsForm, setFsForm] = useState({ title: '', plantedEp: '', resolvedEp: '' });

  const ac = getAvatarColor(character.name);
  const charFS = foreshadows.filter(f => f.charIds?.includes(character.id));

  const startEdit = () => {
    setForm({ name: character.name || '', role: character.role || '', age: character.age || '', affiliation: character.affiliation || '', ability: character.ability || '', description: character.description || '', tags: [...(character.tags || [])] });
    setEditing(true);
  };

  const saveEdit = useCallback(() => { onUpdate(character.id, form); setEditing(false); }, [character.id, form, onUpdate]);
  const cancelEdit = useCallback(() => setEditing(false), []);

  const addTag = (e) => {
    e.preventDefault();
    if (!newTag.trim()) return;
    setForm(f => ({ ...f, tags: [...f.tags, newTag.trim()] }));
    setNewTag('');
  };

  const addFS = async (e) => {
    e.preventDefault();
    if (!fsForm.title.trim()) return;
    try {
      await onAddForeshadow({ ...fsForm, charIds: [character.id] });
      setFsForm({ title: '', plantedEp: '', resolvedEp: '' });
      setShowAddFS(false);
    } catch (err) {
      console.error('복선 추가 실패:', err);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* 헤더 */}
      <div style={{ padding: '16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
        {character.photoURL ? (
          <img src={character.photoURL} alt={character.name}
            style={{ width: 40, height: 40, borderRadius: '50%', objectFit: 'cover', objectPosition: 'center top', flexShrink: 0, border: '2px solid var(--border2)' }} />
        ) : (
          <div style={{ width: 40, height: 40, borderRadius: '50%', background: ac.bg, color: ac.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-serif)', fontSize: 16, flexShrink: 0 }}>
            {character.name?.[0] || '?'}
          </div>
        )}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 500, fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{character.name}</div>
          <div style={{ color: 'var(--text3)', fontSize: 11 }}>{character.role || '역할 미설정'}</div>
        </div>
        <div style={{ display: 'flex', gap: 4 }}>
          {!editing && <button className="btn btn-ghost" style={{ fontSize: 12, height: 32, padding: '0 10px' }} onClick={startEdit}>편집</button>}
          <button className="btn btn-ghost" style={{ fontSize: 18, height: 32, width: 32, padding: 0 }} onClick={onClose}>×</button>
        </div>
      </div>

      {/* 내용 */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '14px 16px' }}>
        {editing ? (
          <EditForm form={form} setForm={setForm} newTag={newTag} setNewTag={setNewTag} addTag={addTag} onSave={saveEdit} onCancel={cancelEdit} />
        ) : (
          <>
            {[{ label: '나이', value: character.age }, { label: '소속', value: character.affiliation }, { label: '능력', value: character.ability }].filter(f => f.value).length > 0 && (
              <Section title="기본 설정">
                {[{ label: '나이', value: character.age }, { label: '소속', value: character.affiliation }, { label: '능력', value: character.ability }].filter(f => f.value).map(f => (
                  <div key={f.label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 6 }}>
                    <span style={{ color: 'var(--text3)' }}>{f.label}</span>
                    <span style={{ color: 'var(--text2)', textAlign: 'right', maxWidth: 160 }}>{f.value}</span>
                  </div>
                ))}
              </Section>
            )}
            {character.description && (
              <Section title="인물 소개">
                <p style={{ color: 'var(--text2)', fontSize: 12, lineHeight: 1.7 }}>{character.description}</p>
              </Section>
            )}
            {character.tags?.length > 0 && (
              <Section title="성격 태그">
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                  {character.tags.map((t, i) => <span key={i} className="tag" style={{ background: 'var(--bg4)', color: 'var(--text2)', fontSize: 11 }}>{t}</span>)}
                </div>
              </Section>
            )}
            <Section title="연결된 복선" action={<button className="btn btn-ghost" style={{ fontSize: 11, height: 26, padding: '0 8px' }} onClick={() => setShowAddFS(true)}>+ 추가</button>}>
              {charFS.length === 0 && !showAddFS && <p style={{ color: 'var(--text3)', fontSize: 12 }}>연결된 복선이 없어요</p>}
              {charFS.map(fs => <FSItem key={fs.id} fs={fs} onUpdate={onUpdateForeshadow} onDelete={onDeleteForeshadow} />)}
              {showAddFS && (
                <form onSubmit={addFS} style={{ marginTop: 8 }}>
                  <input value={fsForm.title} onChange={e => setFsForm(f => ({ ...f, title: e.target.value }))} placeholder="복선 내용" style={{ width: '100%', marginBottom: 6 }} autoFocus />
                  <div style={{ display: 'flex', gap: 6, marginBottom: 6 }}>
                    <input value={fsForm.plantedEp} onChange={e => setFsForm(f => ({ ...f, plantedEp: e.target.value }))} placeholder="심은 화수" style={{ flex: 1 }} />
                    <input value={fsForm.resolvedEp} onChange={e => setFsForm(f => ({ ...f, resolvedEp: e.target.value }))} placeholder="회수 화수" style={{ flex: 1 }} />
                  </div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button type="button" className="btn btn-ghost" style={{ flex: 1, fontSize: 12 }} onClick={() => setShowAddFS(false)}>취소</button>
                    <button type="submit" className="btn btn-primary" style={{ flex: 1, fontSize: 12 }}>저장</button>
                  </div>
                </form>
              )}
            </Section>
          </>
        )}
      </div>
    </div>
  );
}

function FSItem({ fs, onUpdate, onDelete }) {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState({ title: fs.title, plantedEp: fs.plantedEp || '', resolvedEp: fs.resolvedEp || '' });

  if (editing) return (
    <div style={{ background: 'var(--bg3)', borderRadius: 8, padding: 8, marginBottom: 6 }}>
      <input value={val.title} onChange={e => setVal(v => ({ ...v, title: e.target.value }))} style={{ width: '100%', marginBottom: 6 }} />
      <div style={{ display: 'flex', gap: 6, marginBottom: 6 }}>
        <input value={val.plantedEp} onChange={e => setVal(v => ({ ...v, plantedEp: e.target.value }))} placeholder="심은 화수" style={{ flex: 1 }} />
        <input value={val.resolvedEp} onChange={e => setVal(v => ({ ...v, resolvedEp: e.target.value }))} placeholder="회수 화수" style={{ flex: 1 }} />
      </div>
      <div style={{ display: 'flex', gap: 6 }}>
        <button className="btn btn-ghost" style={{ fontSize: 11, flex: 1 }} onClick={() => setEditing(false)}>취소</button>
        <button className="btn btn-primary" style={{ fontSize: 11, flex: 1 }} onClick={() => { onUpdate(fs.id, val); setEditing(false); }}>저장</button>
      </div>
    </div>
  );

  return (
    <div style={{ background: 'var(--bg3)', borderRadius: 8, padding: '8px 10px', marginBottom: 6, display: 'flex', gap: 8, alignItems: 'flex-start' }}>
      <div style={{ flex: 1, cursor: 'pointer' }} onClick={() => setEditing(true)}>
        <div style={{ fontSize: 12, color: 'var(--text)' }}>{fs.title}</div>
        <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>
          {fs.plantedEp && `${fs.plantedEp}화 심음`}{fs.plantedEp && ' → '}{fs.resolvedEp ? `${fs.resolvedEp}화 회수` : fs.plantedEp ? '미회수' : ''}
        </div>
      </div>
      <button className="btn-ghost" style={{ padding: '2px 4px', fontSize: 14, color: 'var(--text3)', border: 'none', background: 'none', cursor: 'pointer' }} onClick={() => onDelete(fs.id)}>×</button>
    </div>
  );
}

const EditForm = memo(function EditForm({ form, setForm, newTag, setNewTag, addTag, onSave, onCancel }) {
  const f = key => ({ value: form[key], onChange: e => setForm(p => ({ ...p, [key]: e.target.value })) });
  return (
    <div>
      <div className="form-group"><label className="form-label">이름</label><input {...f('name')} style={{ width: '100%' }} /></div>
      <div className="form-group"><label className="form-label">역할</label><input {...f('role')} style={{ width: '100%' }} /></div>
      <div className="form-row">
        <div className="form-group"><label className="form-label">나이</label><input {...f('age')} style={{ width: '100%' }} /></div>
        <div className="form-group"><label className="form-label">소속</label><input {...f('affiliation')} style={{ width: '100%' }} /></div>
      </div>
      <div className="form-group"><label className="form-label">능력</label><input {...f('ability')} style={{ width: '100%' }} /></div>
      <div className="form-group"><label className="form-label">소개</label><textarea {...f('description')} rows={3} style={{ width: '100%' }} /></div>
      <div className="form-group">
        <label className="form-label">태그</label>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 6 }}>
          {form.tags.map((t, i) => <span key={i} className="tag" style={{ background: 'var(--bg4)', color: 'var(--text2)', cursor: 'pointer' }} onClick={() => setForm(p => ({ ...p, tags: p.tags.filter((_, j) => j !== i) }))}>{t} ×</span>)}
        </div>
        <form onSubmit={addTag} style={{ display: 'flex', gap: 6 }}>
          <input value={newTag} onChange={e => setNewTag(e.target.value)} placeholder="태그 추가 후 엔터" style={{ flex: 1 }} />
          <button type="submit" className="btn" style={{ height: 40, padding: '0 12px' }}>+</button>
        </form>
      </div>
      <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
        <button className="btn" style={{ flex: 1 }} onClick={onCancel}>취소</button>
        <button className="btn btn-primary" style={{ flex: 1 }} onClick={onSave}>저장</button>
      </div>
    </div>
  );
});

function Section({ title, children, action }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <span className="section-label">{title}</span>
        {action}
      </div>
      {children}
    </div>
  );
}

// ── 반응형 래퍼 ──
export default function DetailPanel(props) {
  const { isMobile, isTablet } = useBreakpoint();

  if (isMobile) {
    return (
      <>
        <div className="bottom-sheet-backdrop" onClick={props.onClose} />
        <div className="bottom-sheet">
          <div className="bottom-sheet-handle" />
          <PanelContent {...props} isMobile />
        </div>
      </>
    );
  }

  if (isTablet) {
    return (
      <>
        <div style={{ position: 'fixed', inset: 0, zIndex: 99 }} onClick={props.onClose} />
        <div className="overlay-panel">
          <PanelContent {...props} />
        </div>
      </>
    );
  }

  // 데스크톱: 우측 고정 패널
  return (
    <div style={{ width: 'var(--detail-w)', borderLeft: '1px solid var(--border)', background: 'var(--bg2)', flexShrink: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
      <PanelContent {...props} />
    </div>
  );
}
