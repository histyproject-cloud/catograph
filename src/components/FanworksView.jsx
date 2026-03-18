import React, { useState } from 'react';

function useDragOrder(items, onReorder) {
  const dragItem = React.useRef(null);
  const dragOver = React.useRef(null);
  const onDragStart = (idx) => { dragItem.current = idx; };
  const onDragEnter = (idx) => { dragOver.current = idx; };
  const onDragEnd = () => {
    if (dragItem.current === null || dragOver.current === null || dragItem.current === dragOver.current) {
      dragItem.current = null; dragOver.current = null; return;
    }
    const next = [...items];
    const dragged = next.splice(dragItem.current, 1)[0];
    next.splice(dragOver.current, 0, dragged);
    onReorder(next);
    dragItem.current = null; dragOver.current = null;
  };
  return { onDragStart, onDragEnter, onDragEnd };
}

export default function FanworksView({ fanworks, onAdd, onUpdate, onDelete, reorderMode }) {
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ title: '', url: '', author: '', type: '그림' });
  const [editId, setEditId] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [customType, setCustomType] = useState('');
  const [editCustomType, setEditCustomType] = useState('');

  const TYPES = ['그림', '소설', '영상'];

  React.useEffect(() => {
    const handler = () => setShowAdd(true);
    document.addEventListener('fanworks:add', handler);
    return () => document.removeEventListener('fanworks:add', handler);
  }, []);
  const [orderedFanworks, setOrderedFanworks] = React.useState(null);
  const displayFanworks = orderedFanworks || fanworks;
  const { onDragStart, onDragEnter, onDragEnd, draggingIdx, dragOverIdx } = useDragOrder(displayFanworks, setOrderedFanworks);

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!form.title.trim() || !form.url.trim()) return;
    let url = form.url.trim();
    if (!url.startsWith('http://') && !url.startsWith('https://')) url = 'https://' + url;
    await onAdd({ ...form, url });
    setForm({ title: '', url: '', author: '', type: '팬픽' });
    setShowAdd(false);
  };

  const startEdit = (fw) => {
    setEditId(fw.id);
    setEditForm({ title: fw.title, url: fw.url, author: fw.author || '', type: fw.type || '그림' });
  };

  const saveEdit = async () => {
    await onUpdate(editId, editForm);
    setEditId(null);
  };

  const handleOpen = (url) => {
    let u = url;
    if (!u.startsWith('http://') && !u.startsWith('https://')) u = 'https://' + u;
    window.open(u, '_blank', 'noopener,noreferrer');
  };

  const TYPE_COLORS = {
    '그림': { bg: 'rgba(45,212,191,0.15)', color: '#2dd4bf' },
    '소설': { bg: 'rgba(139,124,248,0.15)', color: '#a89cf8' },
    '영상': { bg: 'rgba(248,113,113,0.15)', color: '#f87171' },
    '기타': { bg: 'rgba(88,88,100,0.2)', color: '#9d9caa' },
  };

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: 20 }}>
      <p style={{ color: 'var(--text3)', fontSize: 12, marginBottom: 20 }}>팬픽, 팬아트, 번역 등 링크를 저장해두세요</p>

      {fanworks.length === 0 && !showAdd && (
        <div style={{ border: '1px dashed var(--border2)', borderRadius: 'var(--radius-lg)', padding: '60px 20px', textAlign: 'center' }}>
          <div style={{ fontSize: 28, marginBottom: 12, opacity: 0.3 }}>✦</div>
          <p style={{ color: 'var(--text2)', fontSize: 14, marginBottom: 20 }}>아직 저장된 2차창작물이 없어요</p>
          <button className="btn btn-primary" onClick={() => setShowAdd(true)}>첫 작품 추가하기</button>
        </div>
      )}

      <div style={{ display: 'grid', gap: 10 }}>
        {displayFanworks.map((fw, fwIdx) => {
          const tc = TYPE_COLORS[fw.type] || TYPE_COLORS['기타'];
          if (editId === fw.id) return (
            <div key={fw.id} style={{ background: 'var(--bg2)', border: '1px solid var(--accent)', borderRadius: 'var(--radius-lg)', padding: 16 }}>
              <div className="form-group">
                <label className="form-label">제목</label>
                <input value={editForm.title} onChange={e => setEditForm(f => ({ ...f, title: e.target.value }))} style={{ width: '100%' }} autoFocus />
              </div>
              <div className="form-group">
                <label className="form-label">링크</label>
                <input value={editForm.url} onChange={e => setEditForm(f => ({ ...f, url: e.target.value }))} placeholder="https://..." style={{ width: '100%' }} />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">작가/출처</label>
                  <input value={editForm.author} onChange={e => setEditForm(f => ({ ...f, author: e.target.value }))} placeholder="닉네임" style={{ width: '100%' }} />
                </div>
                <div className="form-group">
                  <label className="form-label">유형</label>
                  <select value={TYPES.includes(editForm.type) ? editForm.type : 'custom'}
                    onChange={e => {
                      if (e.target.value === 'custom') { setEditForm(f => ({ ...f, type: editCustomType || '' })); }
                      else { setEditForm(f => ({ ...f, type: e.target.value })); setEditCustomType(''); }
                    }}
                    style={{ width: '100%', background: 'var(--bg3)', border: '1px solid var(--border2)', borderRadius: 'var(--radius)', color: 'var(--text)', padding: '8px 12px', outline: 'none', fontSize: 16 }}>
                    {TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                    <option value="custom">✏️ 직접 입력</option>
                  </select>
                  {(!TYPES.includes(editForm.type)) && (
                    <input value={editCustomType} onChange={e => { setEditCustomType(e.target.value); setEditForm(f => ({ ...f, type: e.target.value })); }}
                      placeholder="유형 직접 입력" style={{ width: '100%', marginTop: 6 }} />
                  )}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                <button className="btn" style={{ fontSize: 12 }} onClick={() => setEditId(null)}>취소</button>
                <button className="btn btn-primary" style={{ fontSize: 12 }} onClick={saveEdit}>저장</button>
              </div>
            </div>
          );

          return (
            <div key={fw.id}
              draggable={reorderMode}
              onDragStart={() => reorderMode && onDragStart(fwIdx)}
              onDragEnter={() => reorderMode && onDragEnter(fwIdx)}
              onDragEnd={reorderMode ? onDragEnd : undefined}
              onDragOver={e => reorderMode && e.preventDefault()}
              style={{
                background: 'var(--bg2)',
                border: reorderMode && dragOverIdx === fwIdx && draggingIdx !== fwIdx ? '1px solid var(--accent)' : '1px solid var(--border)',
                borderRadius: 'var(--radius-lg)', padding: '14px 16px',
                display: 'flex', alignItems: 'center', gap: 12,
                cursor: reorderMode ? 'grab' : 'default',
                opacity: reorderMode && draggingIdx === fwIdx ? 0.35 : 1,
                transform: reorderMode && dragOverIdx === fwIdx && draggingIdx !== fwIdx ? 'translateX(8px)' : 'translateX(0)',
                transition: 'border-color 0.12s, opacity 0.15s, transform 0.15s',
              }}
            >
              {/* 클릭 영역 */}
              <div style={{ flex: 1, cursor: 'pointer', minWidth: 0 }} onClick={() => handleOpen(fw.url)}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <span className="tag" style={{ background: tc.bg, color: tc.color, fontSize: 10, flexShrink: 0 }}>{fw.type || '기타'}</span>
                  <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{fw.title}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  {fw.author && <span style={{ fontSize: 12, color: 'var(--text3)' }}>{fw.author}</span>}
                  {fw.author && <span style={{ color: 'var(--text3)', fontSize: 10 }}>·</span>}
                  <span style={{ fontSize: 11, color: 'var(--accent)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{fw.url}</span>
                </div>
              </div>
              {/* 버튼 */}
              <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                <button className="btn btn-ghost" style={{ fontSize: 11, height: 30, padding: '0 10px' }} onClick={() => startEdit(fw)}>수정</button>
                <button className="btn btn-danger" style={{ fontSize: 11, height: 30, padding: '0 10px' }} onClick={() => { if (window.confirm('삭제할까요?')) onDelete(fw.id); }}>삭제</button>
              </div>
            </div>
          );
        })}
      </div>

      {/* 추가 모달 */}
      {showAdd && (
        <div className="modal-backdrop">
          <div style={{ position: 'absolute', inset: 0 }} onClick={() => setShowAdd(false)} />
          <div className="modal" onClick={e => e.stopPropagation()} style={{ position: 'relative', zIndex: 1 }}>
            <div className="modal-title">2차창작물 추가</div>
            <form onSubmit={handleAdd}>
              <div className="form-group">
                <label className="form-label">제목 *</label>
                <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="예: 현대 AU" style={{ width: '100%' }} autoFocus />
              </div>
              <div className="form-group">
                <label className="form-label">링크를 입력하세요 *</label>
                <input value={form.url} onChange={e => setForm(f => ({ ...f, url: e.target.value }))} placeholder="https://..." style={{ width: '100%' }} />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">작가/출처</label>
                  <input value={form.author} onChange={e => setForm(f => ({ ...f, author: e.target.value }))} placeholder="닉네임 (선택)" style={{ width: '100%' }} />
                </div>
                <div className="form-group">
                  <label className="form-label">유형</label>
                  <select value={TYPES.includes(form.type) ? form.type : 'custom'}
                    onChange={e => {
                      if (e.target.value === 'custom') { setForm(f => ({ ...f, type: customType || '' })); }
                      else { setForm(f => ({ ...f, type: e.target.value })); setCustomType(''); }
                    }}
                    style={{ width: '100%', background: 'var(--bg3)', border: '1px solid var(--border2)', borderRadius: 'var(--radius)', color: 'var(--text)', padding: '8px 12px', outline: 'none', fontSize: 16 }}>
                    {TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                    <option value="custom">✏️ 직접 입력</option>
                  </select>
                  {(!TYPES.includes(form.type)) && (
                    <input value={customType} onChange={e => { setCustomType(e.target.value); setForm(f => ({ ...f, type: e.target.value })); }}
                      placeholder="유형 직접 입력" style={{ width: '100%', marginTop: 6 }} />
                  )}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 20 }}>
                <button type="button" className="btn" onClick={() => setShowAdd(false)}>취소</button>
                <button type="submit" className="btn btn-primary" disabled={!form.title.trim() || !form.url.trim()}>추가</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
