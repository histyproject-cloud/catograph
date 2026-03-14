import React, { useRef, useState, useCallback, useEffect } from 'react';
import { getAvatarColor } from './DetailPanel';
import { useBreakpoint } from '../hooks/useBreakpoint';

const CARD_W = 110;
const CARD_H = 90;

export default function RelationCanvas({ characters, relations, selectedChar, connectMode, connectFrom, onCharClick, onUpdatePosition, onDeleteRelation, onUpdateRelation }) {
  const canvasRef = useRef(null);
  const { isMobile, isTablet } = useBreakpoint();

  const [dragging, setDragging] = useState(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [localPositions, setLocalPositions] = useState({});
  const [hoveredRel, setHoveredRel] = useState(null);
  const [relMenu, setRelMenu] = useState(null); // { relId, x, y, label }
  const [editingRelLabel, setEditingRelLabel] = useState('');

  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [scale, setScale] = useState(1);
  const isPanning = useRef(false);
  const lastPan = useRef({ x: 0, y: 0 });
  const lastPinchDist = useRef(null);

  const getPos = useCallback((char) =>
    localPositions[char.id] || char.position || { x: 80 + Math.random() * 300, y: 80 + Math.random() * 200 },
    [localPositions]
  );

  // ── 마우스 이벤트 ──
  const onMouseDownCard = (e, char) => {
    if (connectMode) { onCharClick(char); return; }
    e.stopPropagation();
    const rect = canvasRef.current.getBoundingClientRect();
    const pos = getPos(char);
    setDragging(char.id);
    setDragOffset({ x: (e.clientX - rect.left) / scale - pan.x / scale - pos.x, y: (e.clientY - rect.top) / scale - pan.y / scale - pos.y });
  };

  const onMouseMoveCanvas = useCallback((e) => {
    if (!dragging) return;
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = (e.clientX - rect.left) / scale - pan.x / scale - dragOffset.x;
    const y = (e.clientY - rect.top) / scale - pan.y / scale - dragOffset.y;
    setLocalPositions(p => ({ ...p, [dragging]: { x, y } }));
  }, [dragging, dragOffset, scale, pan]);

  const onMouseUpCanvas = useCallback(() => {
    if (dragging && localPositions[dragging]) onUpdatePosition(dragging, localPositions[dragging]);
    setDragging(null);
  }, [dragging, localPositions, onUpdatePosition]);

  const onMouseDownCanvas = (e) => {
    if (e.button === 1 || e.target === canvasRef.current || e.target.tagName === 'svg') {
      isPanning.current = true;
      lastPan.current = { x: e.clientX - pan.x, y: e.clientY - pan.y };
      e.preventDefault();
    }
  };

  useEffect(() => {
    const onMove = (e) => { if (!isPanning.current) return; setPan({ x: e.clientX - lastPan.current.x, y: e.clientY - lastPan.current.y }); };
    const onUp = () => { isPanning.current = false; };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
  }, []);

  const onWheel = (e) => {
    e.preventDefault();
    setScale(s => Math.max(0.4, Math.min(2.5, s * (e.deltaY > 0 ? 0.9 : 1.1))));
  };

  // ── 터치 이벤트 ──
  const onTouchStartCard = (e, char) => {
    // connectMode일 때 반드시 먼저 stopPropagation
    e.stopPropagation();
    if (connectMode) {
      onCharClick(char);
      return;
    }
    if (e.touches.length !== 1) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const t = e.touches[0];
    const pos = getPos(char);
    setDragging(char.id);
    setDragOffset({ x: (t.clientX - rect.left) / scale - pan.x / scale - pos.x, y: (t.clientY - rect.top) / scale - pan.y / scale - pos.y });
  };

  const onTouchMoveCanvas = (e) => {
    if (e.touches.length === 2) {
      const d = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
      if (lastPinchDist.current !== null) setScale(s => Math.max(0.4, Math.min(2.5, s * d / lastPinchDist.current)));
      lastPinchDist.current = d;
      return;
    }
    lastPinchDist.current = null;

    if (!dragging && e.touches.length === 1) {
      if (!isPanning.current) { isPanning.current = true; lastPan.current = { x: e.touches[0].clientX - pan.x, y: e.touches[0].clientY - pan.y }; }
      setPan({ x: e.touches[0].clientX - lastPan.current.x, y: e.touches[0].clientY - lastPan.current.y });
      return;
    }
    if (dragging && e.touches.length === 1) {
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return;
      const t = e.touches[0];
      setLocalPositions(p => ({ ...p, [dragging]: { x: (t.clientX - rect.left) / scale - pan.x / scale - dragOffset.x, y: (t.clientY - rect.top) / scale - pan.y / scale - dragOffset.y } }));
    }
  };

  const onTouchEndCanvas = () => {
    if (dragging && localPositions[dragging]) onUpdatePosition(dragging, localPositions[dragging]);
    setDragging(null);
    isPanning.current = false;
    lastPinchDist.current = null;
  };

  // 관계선 클릭 핸들러
  const handleRelClick = (e, rel) => {
    e.stopPropagation();
    const rect = canvasRef.current.getBoundingClientRect();
    setRelMenu({ relId: rel.id, label: rel.label || '', x: e.clientX - rect.left, y: e.clientY - rect.top });
    setEditingRelLabel(rel.label || '');
  };

  // 관계선 터치 핸들러 (모바일)
  const handleRelTouch = (e, rel) => {
    e.stopPropagation();
    e.preventDefault();
    const t = e.changedTouches[0];
    const rect = canvasRef.current.getBoundingClientRect();
    setRelMenu({ relId: rel.id, label: rel.label || '', x: t.clientX - rect.left, y: t.clientY - rect.top });
    setEditingRelLabel(rel.label || '');
  };

  return (
    <div
      ref={canvasRef}
      onMouseMove={onMouseMoveCanvas}
      onMouseUp={onMouseUpCanvas}
      onMouseDown={onMouseDownCanvas}
      onWheel={onWheel}
      onTouchMove={onTouchMoveCanvas}
      onTouchEnd={onTouchEndCanvas}
      onClick={() => setRelMenu(null)}
      style={{
        flex: 1, position: 'relative', overflow: 'hidden',
        background: 'var(--bg)',
        backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.03) 1px, transparent 1px)',
        backgroundSize: '28px 28px',
        cursor: connectMode ? 'crosshair' : dragging ? 'grabbing' : 'default',
        touchAction: 'none', userSelect: 'none',
      }}
    >
      <div style={{ position: 'absolute', inset: 0, transform: `translate(${pan.x}px, ${pan.y}px) scale(${scale})`, transformOrigin: '0 0' }}>
        {/* SVG 관계선 */}
        <svg style={{ position: 'absolute', top: 0, left: 0, width: '9999px', height: '9999px', overflow: 'visible' }}>
          <defs>
            <marker id="arr" markerWidth="7" markerHeight="7" refX="6" refY="3" orient="auto">
              <path d="M0,0 L7,3 L0,6 Z" fill="rgba(255,255,255,0.2)" />
            </marker>
            <marker id="arr-hover" markerWidth="7" markerHeight="7" refX="6" refY="3" orient="auto">
              <path d="M0,0 L7,3 L0,6 Z" fill="rgba(248,113,113,0.8)" />
            </marker>
          </defs>
          {relations.map(rel => {
            const from = characters.find(c => c.id === rel.fromId);
            const to = characters.find(c => c.id === rel.toId);
            if (!from || !to) return null;
            const fp = getPos(from), tp = getPos(to);
            const fx = fp.x + CARD_W / 2, fy = fp.y + CARD_H / 2;
            const tx = tp.x + CARD_W / 2, ty = tp.y + CARD_H / 2;
            const mx = (fx + tx) / 2, my = (fy + ty) / 2;
            const isHovered = hoveredRel === rel.id;
            const isSelected = relMenu?.relId === rel.id;
            return (
              <g key={rel.id}
                onMouseEnter={() => setHoveredRel(rel.id)}
                onMouseLeave={() => setHoveredRel(null)}
                onClick={e => handleRelClick(e, rel)}
                onTouchEnd={e => handleRelTouch(e, rel)}
                style={{ cursor: 'pointer' }}
              >
                <line x1={fx} y1={fy} x2={tx} y2={ty} stroke="transparent" strokeWidth="20" />
                <line x1={fx} y1={fy} x2={tx} y2={ty}
                  stroke={isSelected ? 'var(--accent)' : isHovered ? 'rgba(248,113,113,0.7)' : 'rgba(255,255,255,0.12)'}
                  strokeWidth={isHovered || isSelected ? 2 : 1.5}
                  markerEnd={isHovered ? 'url(#arr-hover)' : 'url(#arr)'}
                />
                {rel.label && (
                  <text x={mx} y={my - 6} textAnchor="middle" fontSize="11"
                    fill={isSelected ? 'var(--accent)' : isHovered ? 'rgba(248,113,113,0.9)' : 'rgba(255,255,255,0.3)'}
                    style={{ userSelect: 'none', pointerEvents: 'none' }}
                  >{rel.label}</text>
                )}
                {(isHovered || isSelected) && (
                  <g style={{ pointerEvents: 'none' }}>
                    <circle cx={mx} cy={my} r="10" fill={isSelected ? 'rgba(139,124,248,0.2)' : 'rgba(248,113,113,0.15)'} stroke={isSelected ? 'var(--accent)' : 'rgba(248,113,113,0.4)'} strokeWidth="1" />
                    <text x={mx} y={my + 4} textAnchor="middle" fontSize="11" fill={isSelected ? 'var(--accent)' : 'rgba(248,113,113,0.9)'}>✎</text>
                  </g>
                )}
              </g>
            );
          })}
        </svg>

        {/* 캐릭터 카드 */}
        {characters.map(char => {
          const pos = getPos(char);
          const ac = getAvatarColor(char.name || '?');
          const isSelected = selectedChar?.id === char.id;
          const isConnFrom = connectFrom === char.id;
          return (
            <div
              key={char.id}
              onMouseDown={e => onMouseDownCard(e, char)}
              onClick={() => !connectMode && onCharClick(char)}
              onTouchStart={e => onTouchStartCard(e, char)}
              style={{
                position: 'absolute', left: pos.x, top: pos.y, width: CARD_W,
                background: connectMode ? (isConnFrom ? 'rgba(45,212,191,0.15)' : 'var(--bg2)') : 'var(--bg2)',
                border: `1.5px solid ${isSelected ? 'var(--accent)' : isConnFrom ? 'var(--teal)' : connectMode ? 'rgba(139,124,248,0.4)' : 'var(--border2)'}`,
                borderRadius: 'var(--radius-lg)', padding: '10px 8px',
                cursor: connectMode ? 'pointer' : 'grab',
                boxShadow: isSelected ? '0 0 0 3px var(--accent-glow)' : connectMode ? '0 0 0 2px rgba(139,124,248,0.1)' : 'none',
                transition: 'border-color 0.15s, box-shadow 0.15s',
                zIndex: dragging === char.id ? 10 : 1,
                touchAction: 'none',
              }}
            >
              {connectMode && (
                <div style={{ position: 'absolute', top: -8, right: -8, width: 16, height: 16, borderRadius: '50%', background: isConnFrom ? 'var(--teal)' : 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, color: '#fff', fontWeight: 700 }}>
                  {isConnFrom ? '1' : '+'}
                </div>
              )}
              <div style={{ width: 34, height: 34, borderRadius: '50%', background: ac.bg, color: ac.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-serif)', fontSize: 14, margin: '0 auto 6px' }}>
                {char.name?.[0] || '?'}
              </div>
              <div style={{ fontSize: 11, fontWeight: 500, textAlign: 'center', color: 'var(--text)', lineHeight: 1.3 }}>{char.name}</div>
              <div style={{ fontSize: 10, textAlign: 'center', color: 'var(--text3)', marginTop: 2 }}>{char.role}</div>
            </div>
          );
        })}
      </div>

      {/* 줌 컨트롤 */}
      <div style={{ position: 'absolute', bottom: 16, right: 16, display: 'flex', flexDirection: 'column', gap: 4, zIndex: 10 }}>
        <button className="btn-icon" style={{ fontSize: 16 }} onClick={() => setScale(s => Math.min(2.5, s * 1.2))}>+</button>
        <button className="btn-icon" style={{ fontSize: 12, color: 'var(--text3)' }} onClick={() => { setScale(1); setPan({ x: 0, y: 0 }); }}>↺</button>
        <button className="btn-icon" style={{ fontSize: 16 }} onClick={() => setScale(s => Math.max(0.4, s * 0.8))}>−</button>
      </div>

      {/* 연결 모드 안내 */}
      {connectMode && (
        <div style={{ position: 'absolute', top: 12, left: '50%', transform: 'translateX(-50%)', background: 'var(--bg2)', border: '1px solid var(--accent)', borderRadius: 99, padding: '6px 16px', fontSize: 12, color: 'var(--accent)', zIndex: 10, whiteSpace: 'nowrap' }}>
          {connectFrom ? '연결할 대상 캐릭터를 탭하세요' : '시작 캐릭터를 탭하세요'}
        </div>
      )}

      {/* 관계선 편집 팝업 */}
      {relMenu && (
        <>
          <div style={{ position: 'absolute', inset: 0, zIndex: 19 }} onClick={() => setRelMenu(null)} />
          <div style={{
            position: 'absolute',
            left: Math.min(relMenu.x, (canvasRef.current?.clientWidth || 300) - 200),
            top: relMenu.y + 12,
            background: 'var(--bg2)', border: '1px solid var(--border2)',
            borderRadius: 'var(--radius-lg)', padding: 14, zIndex: 20,
            width: 200, boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
            animation: 'slideUp 0.15s ease'
          }} onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>관계 설명</div>
            <input
              value={editingRelLabel}
              onChange={e => setEditingRelLabel(e.target.value)}
              placeholder="예: 동료, 적대, 연인..."
              style={{ width: '100%', marginBottom: 10 }}
              autoFocus
              onKeyDown={e => {
                if (e.key === 'Enter') { onUpdateRelation(relMenu.relId, { label: editingRelLabel }); setRelMenu(null); }
                if (e.key === 'Escape') setRelMenu(null);
              }}
            />
            <div style={{ display: 'flex', gap: 6 }}>
              <button className="btn btn-danger" style={{ fontSize: 11, flex: 1, height: 30 }}
                onClick={() => { if (window.confirm('관계선을 삭제할까요?')) { onDeleteRelation(relMenu.relId); setRelMenu(null); } }}>
                삭제
              </button>
              <button className="btn btn-primary" style={{ fontSize: 11, flex: 1, height: 30 }}
                onClick={() => { onUpdateRelation(relMenu.relId, { label: editingRelLabel }); setRelMenu(null); }}>
                저장
              </button>
            </div>
          </div>
        </>
      )}

      {characters.length === 0 && (
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <p style={{ color: 'var(--text3)', fontSize: 13 }}>캐릭터를 추가해서 관계도를 시작하세요</p>
        </div>
      )}
    </div>
  );
}




export default function RelationCanvas({ characters, relations, selectedChar, connectMode, connectFrom, onCharClick, onUpdatePosition, onDeleteRelation }) {
  const canvasRef = useRef(null);
  const { isMobile, isTablet } = useBreakpoint();

  // 드래그 상태
  const [dragging, setDragging] = useState(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [localPositions, setLocalPositions] = useState({});
  const [hoveredRel, setHoveredRel] = useState(null);
  const [relContextMenu, setRelContextMenu] = useState(null); // { relId, x, y }

  // 캔버스 팬 (핀치줌/스크롤 팬)
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [scale, setScale] = useState(1);
  const isPanning = useRef(false);
  const lastPan = useRef({ x: 0, y: 0 });
  const lastPinchDist = useRef(null);

  const getPos = useCallback((char) =>
    localPositions[char.id] || char.position || { x: 80 + Math.random() * 300, y: 80 + Math.random() * 200 },
    [localPositions]
  );

  // ── 마우스 이벤트 ──
  const onMouseDownCard = (e, char) => {
    if (connectMode) { onCharClick(char); return; }
    e.stopPropagation();
    const rect = canvasRef.current.getBoundingClientRect();
    const pos = getPos(char);
    setDragging(char.id);
    setDragOffset({ x: (e.clientX - rect.left) / scale - pan.x / scale - pos.x, y: (e.clientY - rect.top) / scale - pan.y / scale - pos.y });
  };

  const onMouseMoveCanvas = useCallback((e) => {
    if (!dragging) return;
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = (e.clientX - rect.left) / scale - pan.x / scale - dragOffset.x;
    const y = (e.clientY - rect.top) / scale - pan.y / scale - dragOffset.y;
    setLocalPositions(p => ({ ...p, [dragging]: { x, y } }));
  }, [dragging, dragOffset, scale, pan]);

  const onMouseUpCanvas = useCallback(() => {
    if (dragging && localPositions[dragging]) onUpdatePosition(dragging, localPositions[dragging]);
    setDragging(null);
  }, [dragging, localPositions, onUpdatePosition]);

  // 캔버스 팬 (마우스 중간 버튼 또는 빈 영역 드래그)
  const onMouseDownCanvas = (e) => {
    if (e.button === 1 || e.target === canvasRef.current || e.target.tagName === 'svg') {
      isPanning.current = true;
      lastPan.current = { x: e.clientX - pan.x, y: e.clientY - pan.y };
      e.preventDefault();
    }
  };

  useEffect(() => {
    const onMove = (e) => {
      if (!isPanning.current) return;
      setPan({ x: e.clientX - lastPan.current.x, y: e.clientY - lastPan.current.y });
    };
    const onUp = () => { isPanning.current = false; };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
  }, []);

  // 휠 줌
  const onWheel = (e) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    setScale(s => Math.max(0.4, Math.min(2.5, s * delta)));
  };

  // ── 터치 이벤트 ──
  const onTouchStartCard = (e, char) => {
    if (connectMode) { onCharClick(char); return; }
    if (e.touches.length !== 1) return;
    e.stopPropagation();
    const rect = canvasRef.current.getBoundingClientRect();
    const t = e.touches[0];
    const pos = getPos(char);
    setDragging(char.id);
    setDragOffset({ x: (t.clientX - rect.left) / scale - pan.x / scale - pos.x, y: (t.clientY - rect.top) / scale - pan.y / scale - pos.y });
  };

  const onTouchMoveCanvas = (e) => {
    if (e.touches.length === 2) {
      // 핀치줌
      const d = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
      if (lastPinchDist.current !== null) {
        const delta = d / lastPinchDist.current;
        setScale(s => Math.max(0.4, Math.min(2.5, s * delta)));
      }
      lastPinchDist.current = d;
      return;
    }
    lastPinchDist.current = null;

    if (!dragging && e.touches.length === 1) {
      // 캔버스 팬
      if (!isPanning.current) {
        isPanning.current = true;
        lastPan.current = { x: e.touches[0].clientX - pan.x, y: e.touches[0].clientY - pan.y };
      }
      setPan({ x: e.touches[0].clientX - lastPan.current.x, y: e.touches[0].clientY - lastPan.current.y });
      return;
    }

    if (dragging && e.touches.length === 1) {
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return;
      const t = e.touches[0];
      const x = (t.clientX - rect.left) / scale - pan.x / scale - dragOffset.x;
      const y = (t.clientY - rect.top) / scale - pan.y / scale - dragOffset.y;
      setLocalPositions(p => ({ ...p, [dragging]: { x, y } }));
    }
  };

  const onTouchEndCanvas = () => {
    if (dragging && localPositions[dragging]) onUpdatePosition(dragging, localPositions[dragging]);
    setDragging(null);
    isPanning.current = false;
    lastPinchDist.current = null;
  };

  return (
    <div
      ref={canvasRef}
      onMouseMove={onMouseMoveCanvas}
      onMouseUp={onMouseUpCanvas}
      onMouseDown={onMouseDownCanvas}
      onWheel={onWheel}
      onTouchMove={onTouchMoveCanvas}
      onTouchEnd={onTouchEndCanvas}
      style={{
        flex: 1, position: 'relative', overflow: 'hidden',
        background: 'var(--bg)',
        backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.03) 1px, transparent 1px)',
        backgroundSize: '28px 28px',
        cursor: connectMode ? 'crosshair' : dragging ? 'grabbing' : 'default',
        touchAction: 'none',
        userSelect: 'none',
      }}
    >
      {/* 변환 레이어 */}
      <div style={{ position: 'absolute', inset: 0, transform: `translate(${pan.x}px, ${pan.y}px) scale(${scale})`, transformOrigin: '0 0' }}>
        {/* SVG 관계선 */}
        <svg style={{ position: 'absolute', top: 0, left: 0, width: '9999px', height: '9999px', overflow: 'visible' }}>
          <defs>
            <marker id="arr" markerWidth="7" markerHeight="7" refX="6" refY="3" orient="auto">
              <path d="M0,0 L7,3 L0,6 Z" fill="rgba(255,255,255,0.2)" />
            </marker>
            <marker id="arr-hover" markerWidth="7" markerHeight="7" refX="6" refY="3" orient="auto">
              <path d="M0,0 L7,3 L0,6 Z" fill="rgba(248,113,113,0.8)" />
            </marker>
          </defs>
          {relations.map(rel => {
            const from = characters.find(c => c.id === rel.fromId);
            const to = characters.find(c => c.id === rel.toId);
            if (!from || !to) return null;
            const fp = getPos(from), tp = getPos(to);
            const fx = fp.x + CARD_W / 2, fy = fp.y + CARD_H / 2;
            const tx = tp.x + CARD_W / 2, ty = tp.y + CARD_H / 2;
            const mx = (fx + tx) / 2, my = (fy + ty) / 2;
            const isHovered = hoveredRel === rel.id;
            return (
              <g key={rel.id}
                onMouseEnter={() => setHoveredRel(rel.id)}
                onMouseLeave={() => setHoveredRel(null)}
                onClick={e => { e.stopPropagation(); setRelContextMenu({ relId: rel.id, x: e.clientX, y: e.clientY }); }}
                style={{ cursor: 'pointer' }}
              >
                {/* 히트 영역 (투명, 클릭 감지용) */}
                <line x1={fx} y1={fy} x2={tx} y2={ty} stroke="transparent" strokeWidth="16" />
                {/* 실제 선 */}
                <line x1={fx} y1={fy} x2={tx} y2={ty}
                  stroke={isHovered ? 'rgba(248,113,113,0.7)' : 'rgba(255,255,255,0.1)'}
                  strokeWidth={isHovered ? 2 : 1.5}
                  markerEnd={isHovered ? 'url(#arr-hover)' : 'url(#arr)'}
                  style={{ transition: 'stroke 0.15s' }}
                />
                {rel.label && <text x={mx} y={my - 6} textAnchor="middle" fontSize="11" fill={isHovered ? 'rgba(248,113,113,0.9)' : 'rgba(255,255,255,0.28)'} style={{ userSelect: 'none', pointerEvents: 'none' }}>{rel.label}</text>}
                {isHovered && (
                  <g style={{ pointerEvents: 'none' }}>
                    <circle cx={mx} cy={my} r="10" fill="rgba(248,113,113,0.15)" stroke="rgba(248,113,113,0.4)" strokeWidth="1" />
                    <text x={mx} y={my + 4} textAnchor="middle" fontSize="12" fill="rgba(248,113,113,0.9)">×</text>
                  </g>
                )}
              </g>
            );
          })}
        </svg>

        {/* 캐릭터 카드 */}
        {characters.map(char => {
          const pos = getPos(char);
          const ac = getAvatarColor(char.name || '?');
          const isSelected = selectedChar?.id === char.id;
          const isConnFrom = connectFrom === char.id;

          return (
            <div
              key={char.id}
              onMouseDown={e => onMouseDownCard(e, char)}
              onClick={() => !connectMode && onCharClick(char)}
              onTouchStart={e => onTouchStartCard(e, char)}
              style={{
                position: 'absolute',
                left: pos.x, top: pos.y,
                width: CARD_W,
                background: 'var(--bg2)',
                border: `1px solid ${isSelected ? 'var(--accent)' : isConnFrom ? 'var(--teal)' : 'var(--border2)'}`,
                borderRadius: 'var(--radius-lg)',
                padding: '10px 8px',
                cursor: connectMode ? 'pointer' : 'grab',
                boxShadow: isSelected ? '0 0 0 3px var(--accent-glow)' : 'none',
                transition: 'border-color 0.15s, box-shadow 0.15s',
                zIndex: dragging === char.id ? 10 : 1,
                touchAction: 'none',
              }}
            >
              <div style={{ width: 34, height: 34, borderRadius: '50%', background: ac.bg, color: ac.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-serif)', fontSize: 14, margin: '0 auto 6px' }}>
                {char.name?.[0] || '?'}
              </div>
              <div style={{ fontSize: 11, fontWeight: 500, textAlign: 'center', color: 'var(--text)', lineHeight: 1.3 }}>{char.name}</div>
              <div style={{ fontSize: 10, textAlign: 'center', color: 'var(--text3)', marginTop: 2 }}>{char.role}</div>
            </div>
          );
        })}
      </div>

      {/* 줌 컨트롤 */}
      <div style={{ position: 'absolute', bottom: 16, right: 16, display: 'flex', flexDirection: 'column', gap: 4, zIndex: 10 }}>
        <button className="btn-icon" style={{ fontSize: 16 }} onClick={() => setScale(s => Math.min(2.5, s * 1.2))}>+</button>
        <button className="btn-icon" style={{ fontSize: 12, color: 'var(--text3)' }} onClick={() => { setScale(1); setPan({ x: 0, y: 0 }); }}>↺</button>
        <button className="btn-icon" style={{ fontSize: 16 }} onClick={() => setScale(s => Math.max(0.4, s * 0.8))}>−</button>
      </div>

      {characters.length === 0 && (
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <p style={{ color: 'var(--text3)', fontSize: 13 }}>캐릭터를 추가해서 관계도를 시작하세요</p>
        </div>
      )}

      {/* 관계선 삭제 컨텍스트 메뉴 */}
      {relContextMenu && (
        <>
          <div style={{ position: 'fixed', inset: 0, zIndex: 200 }} onClick={() => setRelContextMenu(null)} />
          <div style={{
            position: 'fixed', left: relContextMenu.x, top: relContextMenu.y,
            background: 'var(--bg2)', border: '1px solid var(--border2)',
            borderRadius: 'var(--radius)', padding: 4, zIndex: 201,
            boxShadow: '0 8px 24px rgba(0,0,0,0.4)', minWidth: 120,
            animation: 'fadeIn 0.1s ease'
          }}>
            <button
              onClick={() => { onDeleteRelation(relContextMenu.relId); setRelContextMenu(null); }}
              style={{ width: '100%', textAlign: 'left', padding: '7px 12px', borderRadius: 6, fontSize: 13, color: 'var(--coral)', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(248,113,113,0.1)'}
              onMouseLeave={e => e.currentTarget.style.background = 'none'}
            >
              <span style={{ fontSize: 14 }}>×</span> 관계선 삭제
            </button>
          </div>
        </>
      )}
    </div>
  );
}
