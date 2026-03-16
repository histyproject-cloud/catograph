import React from 'react';
import { useBreakpoint } from '../hooks/useBreakpoint';
import { getAvatarColor } from './DetailPanel';

const TABS = [
  { id: 'relation', label: '관계도', icon: RelIcon },
  { id: 'characters', label: '캐릭터', icon: CharIcon },
  { id: 'world', label: '세계관', icon: WorldIcon },
  { id: 'foreshadow', label: '복선', icon: FSIcon },
  { id: 'timeline', label: '타임라인', icon: TimelineIcon },
  { id: 'fanworks', label: '2차창작', icon: FanIcon },
];

// ── 아이콘 컴포넌트들 ──
function RelIcon() {
  return <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><circle cx="4" cy="9" r="2.5" stroke="currentColor" strokeWidth="1.3"/><circle cx="14" cy="4" r="2.5" stroke="currentColor" strokeWidth="1.3"/><circle cx="14" cy="14" r="2.5" stroke="currentColor" strokeWidth="1.3"/><line x1="6.2" y1="8" x2="11.8" y2="5" stroke="currentColor" strokeWidth="1"/><line x1="6.2" y1="10" x2="11.8" y2="13" stroke="currentColor" strokeWidth="1"/></svg>;
}
function CharIcon() {
  return <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><circle cx="9" cy="6.5" r="3" stroke="currentColor" strokeWidth="1.3"/><path d="M3 16c0-3.31 2.69-6 6-6s6 2.69 6 6" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></svg>;
}
function WorldIcon() {
  return <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><circle cx="9" cy="9" r="6.5" stroke="currentColor" strokeWidth="1.3"/><ellipse cx="9" cy="9" rx="3" ry="6.5" stroke="currentColor" strokeWidth="1"/><line x1="2.5" y1="9" x2="15.5" y2="9" stroke="currentColor" strokeWidth="1"/></svg>;
}
function FSIcon() {
  return <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M9 3v2M9 13v2M3 9h2M13 9h2" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/><circle cx="9" cy="9" r="3" stroke="currentColor" strokeWidth="1.3"/></svg>;
}
function TimelineIcon() {
  return <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><line x1="3" y1="9" x2="15" y2="9" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/><circle cx="6" cy="9" r="2" fill="currentColor" opacity="0.6"/><circle cx="9" cy="9" r="2" fill="currentColor"/><circle cx="12" cy="9" r="2" fill="currentColor" opacity="0.6"/><line x1="6" y1="5" x2="6" y2="7" stroke="currentColor" strokeWidth="1" strokeLinecap="round"/><line x1="12" y1="11" x2="12" y2="13" stroke="currentColor" strokeWidth="1" strokeLinecap="round"/></svg>;
}
function FanIcon() {
  return <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M9 3.5L10.5 7h3.5l-2.8 2.1 1 3.4L9 10.5l-3.2 2 1-3.4L4 7h3.5z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round"/></svg>;
}

// ── 데스크톱 사이드바 ──
function DesktopSidebar({ activeTab, setActiveTab, characters, selectedChar, onSelectChar, projectName }) {
  return (
    <aside style={{
      width: 'var(--sidebar-w)', flexShrink: 0,
      borderRight: '1px solid var(--border)',
      background: 'var(--bg2)',
      display: 'flex', flexDirection: 'column',
      overflowY: 'auto',
    }}>
      <div style={{ padding: '14px 12px 8px', borderBottom: '1px solid var(--border)' }}>
        <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{projectName}</div>
      </div>
      <nav style={{ padding: 8 }}>
        {TABS.map(tab => {
          const Icon = tab.icon;
          return (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{
              width: '100%', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 8,
              padding: '8px 10px', borderRadius: 8, fontSize: 13, marginBottom: 2,
              background: activeTab === tab.id ? 'var(--bg3)' : 'transparent',
              color: activeTab === tab.id ? 'var(--text)' : 'var(--text2)',
              fontWeight: activeTab === tab.id ? 500 : 400,
              border: 'none', cursor: 'pointer', transition: 'all 0.1s'
            }}>
              <Icon />{tab.label}
            </button>
          );
        })}
      </nav>
      {activeTab === 'relation' && characters.length > 0 && (
        <div style={{ padding: '8px 12px', borderTop: '1px solid var(--border)' }}>
          <div className="section-label" style={{ marginBottom: 8 }}>등장인물</div>
          {characters.map(c => {
            const ac = getAvatarColor(c.name);
            return (
              <div key={c.id} onClick={() => onSelectChar(c)} style={{
                display: 'flex', alignItems: 'center', gap: 8, padding: '6px 8px',
                borderRadius: 8, cursor: 'pointer', marginBottom: 2,
                background: selectedChar?.id === c.id ? 'var(--bg3)' : 'transparent'
              }}>
                <div style={{ width: 24, height: 24, borderRadius: '50%', background: ac.bg, color: ac.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, flexShrink: 0 }}>{c.name?.[0]}</div>
                <div>
                  <div style={{ fontSize: 12 }}>{c.name}</div>
                  <div style={{ fontSize: 10, color: 'var(--text3)' }}>{c.role}</div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </aside>
  );
}

// ── 모바일/태블릿 바텀 탭바 ──
function BottomTabBar({ activeTab, setActiveTab }) {
  return (
    <nav style={{
      position: 'fixed', bottom: 0, left: 0, right: 0,
      height: 'var(--bottombar-h)',
      background: 'var(--bg2)',
      borderTop: '1px solid var(--border)',
      display: 'flex',
      zIndex: 50,
      paddingBottom: 'env(safe-area-inset-bottom)',
    }}>
      {TABS.map(tab => {
        const Icon = tab.icon;
        const active = activeTab === tab.id;
        return (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{
            flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            gap: 3, border: 'none', background: 'none', cursor: 'pointer',
            color: active ? 'var(--accent)' : 'var(--text3)',
            transition: 'color 0.15s',
            minHeight: 'var(--touch-target)',
          }}>
            <Icon />
            <span style={{ fontSize: 10, fontWeight: active ? 500 : 400 }}>{tab.label}</span>
          </button>
        );
      })}
    </nav>
  );
}

// ── 슬라이드 사이드바 오버레이 (태블릿 햄버거) ──
function SidebarOverlay({ activeTab, setActiveTab, characters, selectedChar, onSelectChar, projectName, onClose }) {
  return (
    <>
      <div className="sidebar-overlay-backdrop" onClick={onClose} />
      <div className="sidebar-overlay">
        <div style={{ padding: '16px 12px 8px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ fontSize: 14, fontWeight: 500 }}>{projectName}</div>
          <button className="btn-ghost" style={{ border: 'none', background: 'none', fontSize: 20, color: 'var(--text2)', cursor: 'pointer', lineHeight: 1 }} onClick={onClose}>×</button>
        </div>
        <nav style={{ padding: 8 }}>
          {TABS.map(tab => {
            const Icon = tab.icon;
            return (
              <button key={tab.id} onClick={() => { setActiveTab(tab.id); onClose(); }} style={{
                width: '100%', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 10,
                padding: '10px 12px', borderRadius: 8, fontSize: 14, marginBottom: 2,
                background: activeTab === tab.id ? 'var(--bg3)' : 'transparent',
                color: activeTab === tab.id ? 'var(--text)' : 'var(--text2)',
                fontWeight: activeTab === tab.id ? 500 : 400,
                border: 'none', cursor: 'pointer',
              }}>
                <Icon />{tab.label}
              </button>
            );
          })}
        </nav>
        {characters.length > 0 && (
          <div style={{ padding: '8px 12px', borderTop: '1px solid var(--border)' }}>
            <div className="section-label" style={{ marginBottom: 8 }}>등장인물</div>
            {characters.map(c => {
              const ac = getAvatarColor(c.name);
              return (
                <div key={c.id} onClick={() => { onSelectChar(c); onClose(); }} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 8px', borderRadius: 8, cursor: 'pointer', marginBottom: 2, background: selectedChar?.id === c.id ? 'var(--bg3)' : 'transparent' }}>
                  <div style={{ width: 28, height: 28, borderRadius: '50%', background: ac.bg, color: ac.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, flexShrink: 0 }}>{c.name?.[0]}</div>
                  <div>
                    <div style={{ fontSize: 13 }}>{c.name}</div>
                    <div style={{ fontSize: 11, color: 'var(--text3)' }}>{c.role}</div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}

// ── 반응형 네비게이션 메인 익스포트 ──
export default function Navigation({ activeTab, setActiveTab, characters, selectedChar, onSelectChar, projectName, sidebarOpen, setSidebarOpen }) {
  const { isMobile, isTablet } = useBreakpoint();

  if (isMobile) {
    return <BottomTabBar activeTab={activeTab} setActiveTab={setActiveTab} />;
  }

  if (isTablet) {
    return (
      <>
        {sidebarOpen && (
          <SidebarOverlay
            activeTab={activeTab} setActiveTab={setActiveTab}
            characters={characters} selectedChar={selectedChar} onSelectChar={onSelectChar}
            projectName={projectName} onClose={() => setSidebarOpen(false)}
          />
        )}
      </>
    );
  }

  return (
    <DesktopSidebar
      activeTab={activeTab} setActiveTab={setActiveTab}
      characters={characters} selectedChar={selectedChar} onSelectChar={onSelectChar}
      projectName={projectName}
    />
  );
}
