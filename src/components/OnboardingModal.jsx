import { useState, useEffect } from "react";

const SLIDES = [
  {
    id: 0,
    icon: "✦",
    title: "카토그래픽에 오신 걸 환영해요",
    subtitle: "창작의 모든 것을 한 곳에서",
    description: "웹소설·웹툰 작가를 위한 작품 관리 도구예요.\n맥베스를 예시로 기능을 살펴볼게요.",
    visual: "welcome",
    color: "#a78bfa",
  },
  {
    id: 1,
    icon: "⬡",
    title: "캐릭터 관계도",
    subtitle: "인물 관계를 시각적으로",
    description: "캐릭터 카드를 자유롭게 배치하고\n관계선으로 연결해 복잡한 인물 관계를 정리해요.",
    visual: "relationship",
    color: "#f472b6",
  },
  {
    id: 2,
    icon: "⟡",
    title: "복선 관리",
    subtitle: "회수 여부를 놓치지 마세요",
    description: "복선을 등록하고 회수 상태를 추적해요.\n미회수·회수 완료로 나눠 깔끔하게 관리할 수 있어요.",
    visual: "foreshadowing",
    color: "#34d399",
  },
  {
    id: 3,
    icon: "◷",
    title: "타임라인",
    subtitle: "이야기 흐름을 한눈에",
    description: "화차별 사건을 시간순으로 정리해요.\n캐릭터·복선과 연결해 흐름을 한눈에 파악할 수 있어요.",
    visual: "timeline",
    color: "#818cf8",
  },
  {
    id: 4,
    icon: "⊞",
    title: "설정집 & 링크",
    subtitle: "창작 자료를 한 곳에",
    description: "세계관·배경·마법 체계 등 설정을 문서로 정리하고\n참고 링크도 프로젝트별로 저장해요.",
    visual: "world",
    color: "#fbbf24",
  },
];

function WelcomeVisual() {
  return (
    <div style={{ position: "relative", width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ position: "absolute", width: 180, height: 180, borderRadius: "50%", background: "radial-gradient(circle, rgba(167,139,250,0.15) 0%, transparent 70%)" }} />
      <span style={{ fontSize: 64, filter: "drop-shadow(0 0 20px rgba(167,139,250,0.6))", animation: "float 3s ease-in-out infinite" }}>✦</span>
      {[...Array(6)].map((_, i) => (
        <span key={i} style={{
          position: "absolute", fontSize: 10 + (i % 3) * 4, opacity: 0.3 + (i % 3) * 0.2,
          top: `${15 + i * 12}%`, left: `${10 + (i % 2) * 70}%`,
          animation: `float ${2 + i * 0.4}s ease-in-out infinite`, animationDelay: `${i * 0.3}s`,
        }}>✦</span>
      ))}
    </div>
  );
}

function RelationshipVisual() {
  const nodes = [
    { label: "맥베스", role: "주인공", x: 50, y: 22, color: "#a78bfa" },
    { label: "맥베스 부인", role: "조력자", x: 80, y: 55, color: "#f472b6" },
    { label: "던컨 왕", role: "국왕", x: 20, y: 55, color: "#fbbf24" },
    { label: "맥더프", role: "반란군", x: 50, y: 82, color: "#34d399" },
  ];
  const edges = [
    { x1: "50%", y1: "28%", x2: "78%", y2: "50%", label: "결혼", color: "#f472b6" },
    { x1: "50%", y1: "28%", x2: "22%", y2: "50%", label: "배신", color: "#f87171" },
    { x1: "50%", y1: "72%", x2: "50%", y2: "35%", label: "적대", color: "#f87171" },
  ];
  return (
    <div style={{ position: "relative", width: "100%", height: "100%" }}>
      <svg style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}>
        {edges.map((e, i) => (
          <g key={i}>
            <line x1={e.x1} y1={e.y1} x2={e.x2} y2={e.y2} stroke={e.color} strokeWidth="1.5" strokeOpacity="0.6" />
            <text x={`${(parseInt(e.x1) + parseInt(e.x2)) / 2}%`} y={`${(parseInt(e.y1) + parseInt(e.y2)) / 2}%`}
              fill={e.color} fontSize="9" textAnchor="middle" opacity="0.9">{e.label}</text>
          </g>
        ))}
      </svg>
      {nodes.map((n, i) => (
        <div key={i} style={{
          position: "absolute", left: `${n.x}%`, top: `${n.y}%`,
          transform: "translate(-50%, -50%)",
          display: "flex", flexDirection: "column", alignItems: "center", gap: 3,
          animation: `fadeIn 0.5s ease both`, animationDelay: `${i * 0.15}s`,
        }}>
          <div style={{
            width: 38, height: 38, borderRadius: 10,
            background: n.color + "33", border: `2px solid ${n.color}66`,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 14, fontWeight: 700, color: n.color,
          }}>{n.label[0]}</div>
          <span style={{ fontSize: 10, color: "#e5e7eb", fontWeight: 600, whiteSpace: "nowrap" }}>{n.label}</span>
          <span style={{ fontSize: 9, color: "#6b7280" }}>{n.role}</span>
        </div>
      ))}
    </div>
  );
}

function ForeshadowingVisual() {
  const items = [
    { title: '"버남 숲이 움직이기 전엔 죽지 않는다"', status: "미회수", done: false },
    { title: '"여자에게서 태어난 자는 해치지 못한다"', status: "미회수", done: false },
    { title: "맥베스 부인의 손 씻는 꿈", status: "회수 완료", done: true },
  ];
  return (
    <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: 8 }}>
      {items.map((item, i) => (
        <div key={i} style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          background: "rgba(255,255,255,0.04)", borderRadius: 10, padding: "9px 12px",
          animation: `slideInRight 0.4s ease both`, animationDelay: `${i * 0.12}s`,
        }}>
          <span style={{ fontSize: 11, color: "#e5e7eb", flex: 1, marginRight: 8 }}>{item.title}</span>
          <span style={{
            fontSize: 10, borderRadius: 6, padding: "2px 8px", whiteSpace: "nowrap",
            background: item.done ? "rgba(52,211,153,0.15)" : "rgba(245,158,11,0.15)",
            color: item.done ? "#34d399" : "#f59e0b",
          }}>{item.status}</span>
        </div>
      ))}
    </div>
  );
}

function TimelineVisual() {
  const items = [
    { ep: "1화", tag: "복선 심기", text: "세 마녀의 예언", color: "#a78bfa" },
    { ep: "4화", tag: "사건", text: "맥베스, 던컨 왕 암살", color: "#818cf8" },
    { ep: "8화", tag: "사건", text: "뱅쿠오 암살 — 플리언스 도주", color: "#818cf8" },
    { ep: "14화", tag: "복선 회수", text: "버남 숲 진격", color: "#34d399" },
  ];
  return (
    <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: 8 }}>
      {items.map((item, i) => (
        <div key={i} style={{
          display: "flex", alignItems: "center", gap: 10,
          background: "rgba(255,255,255,0.04)", borderRadius: 10, padding: "8px 12px",
          animation: `slideInRight 0.4s ease both`, animationDelay: `${i * 0.1}s`,
        }}>
          <span style={{ fontSize: 11, color: "#6b7280", minWidth: 28 }}>{item.ep}</span>
          <span style={{ fontSize: 10, background: item.color + "22", color: item.color, borderRadius: 6, padding: "2px 7px", whiteSpace: "nowrap" }}>{item.tag}</span>
          <span style={{ fontSize: 12, color: "#e5e7eb", flex: 1 }}>{item.text}</span>
        </div>
      ))}
    </div>
  );
}

function WorldVisual() {
  const items = [
    { type: "설정", title: "세 마녀의 정체에 대해서", color: "#a78bfa" },
    { type: "설정", title: "중세 스코틀랜드 왕위 계승 제도", color: "#a78bfa" },
    { type: "링크", title: "맥베스의 배경, 스코틀랜드", color: "#fbbf24" },
  ];
  return (
    <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: 8 }}>
      {items.map((item, i) => (
        <div key={i} style={{
          display: "flex", alignItems: "center", gap: 10,
          background: "rgba(255,255,255,0.04)", borderRadius: 10, padding: "10px 12px",
          animation: `slideInRight 0.4s ease both`, animationDelay: `${i * 0.1}s`,
        }}>
          <span style={{ fontSize: 10, background: item.color + "22", color: item.color, borderRadius: 6, padding: "2px 7px", whiteSpace: "nowrap" }}>{item.type}</span>
          <span style={{ fontSize: 12, color: "#e5e7eb" }}>{item.title}</span>
        </div>
      ))}
    </div>
  );
}

const VISUALS = {
  welcome: WelcomeVisual,
  relationship: RelationshipVisual,
  foreshadowing: ForeshadowingVisual,
  timeline: TimelineVisual,
  world: WorldVisual,
};

export default function OnboardingModal({ onClose, onComplete }) {
  const [current, setCurrent] = useState(0);
  const [direction, setDirection] = useState(1);
  const [animating, setAnimating] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setVisible(true), 50);
    return () => clearTimeout(timer);
  }, []);

  const go = (next) => {
    if (animating) return;
    setDirection(next > current ? 1 : -1);
    setAnimating(true);
    setTimeout(() => { setCurrent(next); setAnimating(false); }, 300);
  };

  const handleClose = () => {
    setVisible(false);
    setTimeout(() => { onClose?.(); onComplete?.(); }, 300);
  };

  const slide = SLIDES[current];
  const Visual = VISUALS[slide.visual];
  const isLast = current === SLIDES.length - 1;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400;500;700&display=swap');
        @keyframes float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-8px)} }
        @keyframes pulse { 0%,100%{opacity:0.6;transform:scale(1)} 50%{opacity:1;transform:scale(1.05)} }
        @keyframes fadeIn { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
        @keyframes slideInRight { from{opacity:0;transform:translateX(12px)} to{opacity:1;transform:translateX(0)} }
        .onboarding-dot {
          width: 8px; height: 8px; border-radius: 4px;
          background: rgba(255,255,255,0.15); cursor: pointer; transition: all 0.3s ease;
        }
        .onboarding-dot.active { width: 20px; border-radius: 3px; background: var(--slide-color); }
        .onboarding-btn-primary {
          background: var(--slide-color); color: #0d0d18; border: none; border-radius: 14px;
          padding: 14px 28px; font-size: 15px; font-weight: 700; cursor: pointer;
          font-family: 'Noto Sans KR', sans-serif; transition: all 0.2s ease; flex: 1;
        }
        .onboarding-btn-primary:hover { filter: brightness(1.1); transform: translateY(-1px); }
        .onboarding-btn-secondary {
          background: rgba(255,255,255,0.06); color: #9ca3af;
          border: 1px solid rgba(255,255,255,0.1); border-radius: 14px;
          padding: 14px 20px; font-size: 14px; font-weight: 500; cursor: pointer;
          font-family: 'Noto Sans KR', sans-serif; transition: all 0.2s ease;
        }
        .onboarding-btn-secondary:hover { background: rgba(255,255,255,0.1); color: #e5e7eb; }
        .slide-content { transition: opacity 0.3s ease, transform 0.3s ease; }
        .slide-content.animating { opacity: 0; transform: translateX(${direction === 1 ? '-20px' : '20px'}); }
      `}</style>

      <div style={{
        position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", backdropFilter: "blur(8px)",
        zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px",
        opacity: visible ? 1 : 0, transition: "opacity 0.3s ease",
      }} onClick={handleClose}>

        <div onClick={e => e.stopPropagation()} style={{
          "--slide-color": slide.color, background: "#13131f", borderRadius: 24,
          border: "1px solid rgba(255,255,255,0.08)", width: "100%", maxWidth: 480,
          overflow: "hidden",
          boxShadow: `0 40px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.05), inset 0 1px 0 rgba(255,255,255,0.08)`,
          opacity: visible ? 1 : 0,
          transform: visible ? "scale(1) translateY(0)" : "scale(0.95) translateY(10px)",
          transition: "all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)",
          fontFamily: "'Noto Sans KR', sans-serif",
        }}>
          {/* Top bar */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "20px 24px 0" }}>
            <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
              {SLIDES.map((_, i) => (
                <div key={i} className={`onboarding-dot ${i === current ? "active" : ""}`}
                  style={{ "--slide-color": slide.color }} onClick={() => go(i)} />
              ))}
            </div>
            <button onClick={handleClose} style={{
              background: "rgba(255,255,255,0.06)", border: "none", color: "#6b7280",
              width: 32, height: 32, borderRadius: 8, cursor: "pointer", fontSize: 16,
              display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.2s",
            }}
              onMouseEnter={e => e.target.style.color = "#e5e7eb"}
              onMouseLeave={e => e.target.style.color = "#6b7280"}>✕</button>
          </div>

          {/* Slide content */}
          <div className={`slide-content ${animating ? "animating" : ""}`} style={{ padding: "28px 28px 24px" }}>
            {/* Visual area */}
            <div style={{
              height: 180, background: "rgba(255,255,255,0.02)", borderRadius: 16,
              border: "1px solid rgba(255,255,255,0.05)", overflow: "hidden",
              padding: slide.visual === "relationship" ? 0 : "16px",
              marginBottom: 28, position: "relative",
            }}>
              <div style={{
                position: "absolute", top: 0, right: 0, width: 120, height: 120,
                background: `radial-gradient(circle, ${slide.color}18 0%, transparent 70%)`,
                borderRadius: "0 16px 0 0", pointerEvents: "none",
              }} />
              <Visual />
            </div>

            {/* Icon + Title */}
            <div style={{ marginBottom: 12 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                <span style={{ fontSize: 22, color: slide.color, filter: `drop-shadow(0 0 8px ${slide.color}88)` }}>{slide.icon}</span>
                <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", color: slide.color, textTransform: "uppercase" }}>{slide.subtitle}</span>
              </div>
              <h2 style={{ margin: 0, fontSize: 24, fontWeight: 700, color: "#f9fafb", lineHeight: 1.3, letterSpacing: "-0.01em" }}>{slide.title}</h2>
            </div>

            <p style={{ margin: "0 0 28px", fontSize: 14, lineHeight: 1.7, color: "#9ca3af", whiteSpace: "pre-line" }}>{slide.description}</p>

            {/* Buttons */}
            <div style={{ display: "flex", gap: 10, flexDirection: "column" }}>
              <div style={{ display: "flex", gap: 10 }}>
                {current > 0 && (
                  <button className="onboarding-btn-secondary" onClick={() => go(current - 1)}>이전</button>
                )}
                {current === 0 && (
                  <button className="onboarding-btn-secondary" onClick={handleClose}>건너뛰기</button>
                )}
                <button className="onboarding-btn-primary" style={{ "--slide-color": slide.color }}
                  onClick={() => isLast ? handleClose() : go(current + 1)}>
                  {isLast ? "시작하기 🎉" : "다음"}
                </button>
              </div>
              {isLast && (
                <a href="/how-to" target="_blank" rel="noopener noreferrer" style={{
                  display: "block", textAlign: "center", fontSize: 13,
                  color: "#6b7280", textDecoration: "none", padding: "4px 0",
                  transition: "color 0.2s",
                }}
                  onMouseEnter={e => e.currentTarget.style.color = "#a89cf8"}
                  onMouseLeave={e => e.currentTarget.style.color = "#6b7280"}>
                  자세한 이용방법 보기 →
                </a>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
