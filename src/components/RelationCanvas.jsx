import React, { useRef, useState, useCallback, useEffect } from 'react';
import { getAvatarColor } from './DetailPanel';
import { useBreakpoint } from '../hooks/useBreakpoint';

const CARD_W = 110;
const CARD_H = 90;

// 두 관계선이 같은 캐릭터 쌍인지 체크
function isPair(relA, relB) {
  return (relA.fromId === relB.toId && relA.toId === relB.fromId);
}

// 수직 오프셋 계산 (평행 화살표용)
function getOffset(fx, fy, tx, ty, dist) {
  const dx = tx - fx, dy = ty - fy;
  const len = Math.sqrt(dx * dx + dy * dy) || 1;
  return { ox: (-dy / len) * dist, oy: (dx / len) * dist };
}

export default function RelationCanvas({ characters, relations, selectedChar, connectMode, connectFrom, onCharClick, onUpdatePosition, onDeleteRelation, onUpdateRelation }) {
  const canvasRef = useRef(null);
  const { isMobile, isTablet } = useBreakpoint();

  const [dragging, setDragging] = useState(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [localPositions, setLocalPositions] = useState({});
  const [hoveredRel, setHoveredRel] = useState(null);
  const [relMenu, setRelMenu] = useState(null);
  const [editingRelLabel, setEditingRelLabel] = useState('');
  const [editingRelColor, setEditingRelColor] = useState('');

  const REL_COLORS = [
    { value: '', label: '기본', color: 'rgba(255,255,255,0.25)' },
    { value: '#a89cf8', label: '보라' },
    { value: '#2dd4bf', label: '청록' },
    { value: '#f87171', label: '빨강' },
    { value: '#f59e0b', label: '주황' },
    { value: '#4ade80', label: '초록' },
    { value: '#60a5fa', label: '파랑' },
    { value: '#f472b6', label: '분홍' },
  ];

  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [scale, setScale] = useState(1);
  const isPanning = useRef(false);
  const lastPan = useRef({ x: 0, y: 0 });
  const lastPinchDist = useRef(null);

  const getPos = useCallback((char) =>
    localPositions[char.id] || char.position || { x: 80 + Math.random() * 300, y: 80 + Math.random() * 200 },
    [localPositions]
  );

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
    setLocalPositions(p => ({ ...p, [dragging]: { x: (e.clientX - rect.left) / scale - pan.x / scale - dragOffset.x, y: (e.clientY - rect.top) / scale - pan.y / scale - dragOffset.y } }));
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

  const onTouchStartCard = (e, char) => {
    e.stopPropagation();
    if (connectMode) { onCharClick(char); return; }
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

  const handleRelClick = (e, rel) => {
    e.stopPropagation();
    const rect = canvasRef.current.getBoundingClientRect();
    setRelMenu({ relId: rel.id, label: rel.label || '', x: e.clientX - rect.left, y: e.clientY - rect.top, fromId: rel.fromId, toId: rel.toId });
    setEditingRelLabel(rel.label || '');
    setEditingRelColor(rel.color || '');
  };

  const handleRelTouch = (e, rel) => {
    e.stopPropagation();
    e.preventDefault();
    const t = e.changedTouches[0];
    const rect = canvasRef.current.getBoundingClientRect();
    setRelMenu({ relId: rel.id, label: rel.label || '', x: t.clientX - rect.left, y: t.clientY - rect.top, fromId: rel.fromId, toId: rel.toId });
    setEditingRelLabel(rel.label || '');
    setEditingRelColor(rel.color || '');
  };

  // 같은 쌍 관계 찾기 (양방향 감지)
  const getPairOffset = (rel) => {
    const hasPair = relations.some(r => r.id !== rel.id && isPair(r, rel));
    return hasPair ? 10 : 0;
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
        <svg style={{ position: 'absolute', top: 0, left: 0, width: '9999px', height: '9999px', overflow: 'visible' }}>
          <defs>
            <marker id="arr" markerWidth="5" markerHeight="5" refX="4" refY="2.5" orient="auto">
              <path d="M0,0 L5,2.5 L0,5 Z" fill="rgba(255,255,255,0.25)" />
            </marker>
            <marker id="arr-hover" markerWidth="5" markerHeight="5" refX="4" refY="2.5" orient="auto">
              <path d="M0,0 L5,2.5 L0,5 Z" fill="rgba(248,113,113,0.9)" />
            </marker>
            <marker id="arr-selected" markerWidth="5" markerHeight="5" refX="4" refY="2.5" orient="auto">
              <path d="M0,0 L5,2.5 L0,5 Z" fill="#8b7cf8" />
            </marker>
          </defs>

          {relations.map(rel => {
            const from = characters.find(c => c.id === rel.fromId);
            const to = characters.find(c => c.id === rel.toId);
            if (!from || !to) return null;

            const fp = getPos(from), tp = getPos(to);
            const fcx = fp.x + CARD_W / 2, fcy = fp.y + CARD_H / 2;
            const tcx = tp.x + CARD_W / 2, tcy = tp.y + CARD_H / 2;

            // 화살표가 카드 엣지에서 시작/끝나도록 — 카드 경계 교차점 계산
            const clipToRect = (ox, oy, tx, ty, rw, rh) => {
              const dx = tx - ox, dy = ty - oy;
              const absDx = Math.abs(dx), absDy = Math.abs(dy);
              let t;
              if (absDx === 0 && absDy === 0) return { x: ox, y: oy };
              const tX = absDx > 0 ? (rw / 2) / absDx : Infinity;
              const tY = absDy > 0 ? (rh / 2) / absDy : Infinity;
              t = Math.min(tX, tY);
              return { x: ox + dx * t, y: oy + dy * t };
            };

            const startPt = clipToRect(fcx, fcy, tcx, tcy, CARD_W, CARD_H);
            const endPt   = clipToRect(tcx, tcy, fcx, fcy, CARD_W, CARD_H);

            // 같은 쌍이면 평행 오프셋 적용
            const offsetDist = getPairOffset(rel);
            const { ox, oy } = getOffset(startPt.x, startPt.y, endPt.x, endPt.y, offsetDist);

            const x1 = startPt.x + ox, y1 = startPt.y + oy;
            const x2 = endPt.x + ox,   y2 = endPt.y + oy;
            const mx = (x1 + x2) / 2,  my = (y1 + y2) / 2;

            const isHovered = hoveredRel === rel.id;
            const isSelected = relMenu?.relId === rel.id;

            // 라벨 위치: 선의 수직 방향으로 띄움 (양방향이면 바깥쪽으로)
            const ddx = x2 - x1, ddy = y2 - y1;
            const len = Math.sqrt(ddx * ddx + ddy * ddy) || 1;
            const perpX = (-ddy / len), perpY = (ddx / len);
            const lx = mx + perpX * 14;
            const ly = my + perpY * 14;

            // 양방향 쌍 여부 — 중간 공유 라벨 표시용

            const relColor = rel.color || 'rgba(255,255,255,0.3)';
            const lineColor = isSelected ? '#8b7cf8' : isHovered ? 'rgba(248,113,113,0.8)' : relColor;
            const markerColor = isSelected ? '#8b7cf8' : isHovered ? 'rgba(248,113,113,0.9)' : relColor;
            const markerId = `arr-${rel.id}`;

            return (
              <g key={rel.id}
                onMouseEnter={() => setHoveredRel(rel.id)}
                onMouseLeave={() => setHoveredRel(null)}
                onClick={e => handleRelClick(e, rel)}
                onTouchEnd={e => handleRelTouch(e, rel)}
                style={{ cursor: 'pointer' }}
              >
                <defs>
                  <marker id={markerId} markerWidth="5" markerHeight="5" refX="4" refY="2.5" orient="auto">
                    <path d="M0,0 L5,2.5 L0,5 Z" fill={markerColor} />
                  </marker>
                </defs>
                {/* 히트 영역 */}
                <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="transparent" strokeWidth="18" />
                {/* 화살표 선 */}
                <line
                  x1={x1} y1={y1}
                  x2={x2 - (ddx / len) * 3} y2={y2 - (ddy / len) * 3}
                  stroke={lineColor}
                  strokeWidth={isHovered || isSelected ? 2 : 1.5}
                  markerEnd={isSelected ? 'url(#arr-selected)' : isHovered ? 'url(#arr-hover)' : `url(#${markerId})`}
                />
                {/* 개별 라벨 — 선 옆에 */}
                {rel.label && (
                  <>
                    <rect
                      x={lx - rel.label.length * 3.5 - 6} y={ly - 9}
                      width={rel.label.length * 7 + 12} height={17}
                      rx="4"
                      fill="rgba(12,12,16,0.88)"
                      stroke={rel.color ? rel.color + '55' : 'rgba(255,255,255,0.08)'} strokeWidth="1"
                      style={{ pointerEvents: 'none' }}
                    />
                    <text x={lx} y={ly + 4} textAnchor="middle" fontSize="10"
                      fill={isSelected ? '#a89cf8' : isHovered ? 'rgba(248,113,113,0.95)' : rel.color || 'rgba(255,255,255,0.65)'}
                      style={{ userSelect: 'none', pointerEvents: 'none' }}
                    >{rel.label}</text>
                  </>
                )}

                {/* 호버/선택 시 편집 아이콘 */}
                {(isHovered || isSelected) && (
                  <g style={{ pointerEvents: 'none' }}>
                    <circle cx={mx} cy={my} r="10"
                      fill={isSelected ? 'rgba(139,124,248,0.2)' : 'rgba(248,113,113,0.12)'}
                      stroke={isSelected ? '#8b7cf8' : 'rgba(248,113,113,0.5)'} strokeWidth="1"
                    />
                    <text x={mx} y={my + 4} textAnchor="middle" fontSize="11"
                      fill={isSelected ? '#a89cf8' : 'rgba(248,113,113,0.9)'}
                    >✎</text>
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
                background: connectMode ? (isConnFrom ? 'rgba(45,212,191,0.12)' : 'var(--bg2)') : 'var(--bg2)',
                border: `1.5px solid ${isSelected ? 'var(--accent)' : isConnFrom ? 'var(--teal)' : connectMode ? 'rgba(139,124,248,0.35)' : 'var(--border2)'}`,
                borderRadius: 'var(--radius-lg)', padding: '10px 8px',
                cursor: connectMode ? 'pointer' : 'grab',
                boxShadow: isSelected ? '0 0 0 3px var(--accent-glow)' : 'none',
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
              {char.photoURL ? (
                <img src={char.photoURL} alt={char.name}
                  style={{ width: 34, height: 34, borderRadius: '50%', objectFit: 'cover', objectPosition: 'center top', margin: '0 auto 6px', display: 'block', border: `1px solid ${ac.color}40` }} />
              ) : (
                <div style={{ width: 34, height: 34, borderRadius: '50%', background: ac.bg, color: ac.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-serif)', fontSize: 14, margin: '0 auto 6px' }}>
                  {char.name?.[0] || '?'}
                </div>
              )}
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
          {connectFrom ? '관계를 받을 캐릭터를 탭하세요 →' : '관계의 시작 캐릭터를 탭하세요'}
        </div>
      )}

      {/* 관계선 편집 팝업 */}
      {relMenu && (
        <>
          <div style={{ position: 'absolute', inset: 0, zIndex: 19 }} onClick={() => setRelMenu(null)} />
          <div style={{
            position: 'absolute',
            left: Math.min(relMenu.x, (canvasRef.current?.clientWidth || 300) - 220),
            top: Math.min(relMenu.y + 12, (canvasRef.current?.clientHeight || 400) - 180),
            background: 'var(--bg2)', border: '1px solid var(--border2)',
            borderRadius: 'var(--radius-lg)', padding: 14, zIndex: 20,
            width: 220, boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
            animation: 'slideUp 0.15s ease'
          }} onClick={e => e.stopPropagation()}>
            {/* 방향 표시 */}
            {relMenu.fromId && relMenu.toId && (() => {
              const fromChar = characters.find(c => c.id === relMenu.fromId);
              const toChar = characters.find(c => c.id === relMenu.toId);
              if (!fromChar || !toChar) return null;
              return (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10, padding: '6px 8px', background: 'var(--bg3)', borderRadius: 8 }}>
                  <span style={{ fontSize: 11, fontWeight: 500, color: 'var(--accent)' }}>{fromChar.name}</span>
                  <span style={{ fontSize: 12, color: 'var(--text3)' }}>→</span>
                  <span style={{ fontSize: 11, fontWeight: 500, color: 'var(--text2)' }}>{toChar.name}</span>
                </div>
              );
            })()}
            <div style={{ fontSize: 10, color: 'var(--text3)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>관계 설명</div>
            <input
              value={editingRelLabel}
              onChange={e => setEditingRelLabel(e.target.value)}
              placeholder="예: 사랑, 의심, 적대"
              style={{ width: '100%', marginBottom: 10 }}
              autoFocus
              onKeyDown={e => {
                if (e.key === 'Enter') { onUpdateRelation(relMenu.relId, { label: editingRelLabel, color: editingRelColor }); setRelMenu(null); }
                if (e.key === 'Escape') setRelMenu(null);
              }}
            />
            <div style={{ fontSize: 10, color: 'var(--text3)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>선 색상</div>
            <div style={{ display: 'flex', gap: 5, marginBottom: 12, flexWrap: 'wrap' }}>
              {REL_COLORS.map(rc => (
                <div key={rc.value}
                  onClick={() => setEditingRelColor(rc.value)}
                  title={rc.label}
                  style={{
                    width: 22, height: 22, borderRadius: '50%', cursor: 'pointer',
                    background: rc.color || rc.value,
                    border: editingRelColor === rc.value ? '2px solid #fff' : '2px solid transparent',
                    boxShadow: editingRelColor === rc.value ? '0 0 0 1px rgba(255,255,255,0.4)' : 'none',
                    transition: 'border 0.1s',
                  }}
                />
              ))}
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              <button className="btn btn-danger" style={{ fontSize: 11, flex: 1, height: 30 }}
                onClick={() => { if (window.confirm('이 관계선을 삭제할까요?')) { onDeleteRelation(relMenu.relId); setRelMenu(null); } }}>
                삭제
              </button>
              <button className="btn btn-primary" style={{ fontSize: 11, flex: 1, height: 30 }}
                onClick={() => { onUpdateRelation(relMenu.relId, { label: editingRelLabel, color: editingRelColor }); setRelMenu(null); }}>
                저장
              </button>
            </div>
          </div>
        </>
      )}

      {characters.length === 0 && (
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
          <div style={{ border: '1px dashed var(--border2)', borderRadius: 'var(--radius-lg)', padding: '60px 20px', textAlign: 'center', pointerEvents: 'auto' }}>
            <div style={{ fontSize: 28, marginBottom: 12, opacity: 0.3 }}>✦</div>
            <p style={{ color: 'var(--text2)', fontSize: 14, marginBottom: 20 }}>캐릭터를 추가해서 관계도를 시작하세요</p>
            <button className="btn btn-primary" onClick={() => document.dispatchEvent(new CustomEvent('character:add'))}>첫 캐릭터 추가하기</button>
          </div>
        </div>
      )}
    </div>
  );
}
