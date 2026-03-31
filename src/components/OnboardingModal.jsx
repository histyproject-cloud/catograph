import { useState, useEffect } from "react";

const SLIDES = [
  {
    id: 0,
    icon: "✦",
    title: "카토그래픽에 오신 걸 환영해요",
    subtitle: "창작의 모든 것을 한 곳에서",
    description: "창작자와 독자를 위한 작품 관리 도구예요.\n캐릭터부터 복선까지, 작품 세계를 한눈에 정리해보세요.",
    visual: "welcome",
    color: "#a78bfa",
  },
  {
    id: 1,
    icon: "◷",
    title: "타임라인",
    subtitle: "이야기 흐름을 한눈에",
    description: "화차별 사건을 시간순으로 정리해요.\n태그·캐릭터별 필터로 원하는 장면을 빠르게 찾을 수 있어요.",
    visual: "timeline",
    color: "#818cf8",
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
    icon: "⬡",
    title: "캐릭터 관계도",
    subtitle: "인물 관계를 시각적으로",
    description: "캐릭터 카드를 자유롭게 배치하고\n관계선으로 연결해 복잡한 인물 관계를 정리해요.",
    visual: "relationship",
    color: "#f472b6",
  },
  {
    id: 4,
    icon: "⊞",
    title: "설정집 문서 & 링크 저장",
    subtitle: "창작 자료를 한 곳에",
    description: "세계관 설정 문서를 자유롭게 작성하고\n팬픽·팬아트·번역 링크도 프로젝트별로 저장해요.",
    visual: "world",
    color: "#fbbf24",
  },
];

// Mini visual components for each slide
function WelcomeVisual() {
  return (
    <div style={{ position: "relative", width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ position: "absolute", width: 180, height: 180, borderRadius: "50%", background: "radial-gradient(circle, rgba(167,139,250,0.15) 0%, transparent 70%)" }} />
      <div style={{ position: "absolute", width: 120, height: 120, borderRadius: "50%", background: "radial-gradient(circle, rgba(167,139,250,0.1) 0%, transparent 70%)", animation: "pulse 2s ease-in-out infinite" }} />
      <span style={{ fontSize: 64, filter: "drop-shadow(0 0 20px rgba(167,139,250,0.6))", animation: "float 3s ease-in-out infinite" }}>✦</span>
      {[...Array(6)].map((_, i) => (
        <span key={i} style={{
          position: "absolute",
          fontSize: 10 + (i % 3) * 4,
          opacity: 0.3 + (i % 3) * 0.2,
          top: `${15 + i * 12}%`,
          left: `${10 + (i % 2) * 70}%`,
          animation: `float ${2 + i * 0.4}s ease-in-out infinite`,
          animationDelay: `${i * 0.3}s`,
        }}>✦</span>
      ))}
    </div>
  );
}

function TimelineVisual() {
  const items = [
    { ep: "1화", tag: "사건", text: "지니, 환생", color: "#818cf8" },
    { ep: "5화", tag: "복선 심기", text: "검은 머리 남자의 등장", color: "#a78bfa" },
    { ep: "10화", tag: "캐릭터 등장", text: "채드의 등장", color: "#34d399" },
    { ep: "120화", tag: "사건", text: "애쉬의 정체 발각", color: "#818cf8" },
  ];
  return (
    <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: 8 }}>
      {items.map((item, i) => (
        <div key={i} style={{
          display: "flex", alignItems: "center", gap: 10,
          background: "rgba(255,255,255,0.04)", borderRadius: 10,
          padding: "8px 12px",
          animation: `slideInRight 0.4s ease both`,
          animationDelay: `${i * 0.1}s`,
        }}>
          <span style={{ fontSize: 11, color: "#6b7280", minWidth: 28 }}>{item.ep}</span>
          <span style={{ fontSize: 10, background: item.color + "22", color: item.color, borderRadius: 6, padding: "2px 7px", whiteSpace: "nowrap" }}>{item.tag}</span>
          <span style={{ fontSize: 12, color: "#e5e7eb", flex: 1 }}>{item.text}</span>
        </div>
      ))}
    </div>
  );
}

function ForeshadowingVisual() {
  const items = [
    { title: "바이올린 소리", status: "미회수", color: "#f59e0b" },
    { title: "파란 용의 정체", status: "회수 완료", color: "#34d399", done: true },
    { title: "검은 머리 남자", status: "미회수", color: "#f59e0b" },
  ];
  return (
    <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: 8 }}>
      {items.map((item, i) => (
        <div key={i} style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          background: "rgba(255,255,255,0.04)", borderRadius: 10,
          padding: "10px 14px",
          animation: `slideInRight 0.4s ease both`,
          animationDelay: `${i * 0.12}s`,
        }}>
          <span style={{ fontSize: 13, color: "#e5e7eb" }}>{item.title}</span>
          <span style={{
            fontSize: 11, borderRadius: 6, padding: "2px 8px",
            background: item.done ? "rgba(52,211,153,0.15)" : "rgba(245,158,11,0.15)",
            color: item.color
          }}>{item.status}</span>
        </div>
      ))}
    </div>
  );
}

function RelationshipVisual() {
  const nodes = [
    { label: "벤쿠오", role: "동료", x: 25, y: 20, color: "#f59e0b" },
    { label: "맥베스", role: "주인공", x: 65, y: 55, color: "#34d399" },
    { label: "던컨 왕", role: "스코틀랜드의 왕", x: 20, y: 68, color: "#818cf8" },
  ];
  const edges = [
    { x1: "35%", y1: "30%", x2: "68%", y2: "52%", label: "사랑", color: "#f472b6" },
    { x1: "30%", y1: "68%", x2: "63%", y2: "60%", label: "애정", color: "#f472b6" },
    { x1: "25%", y1: "25%", x2: "22%", y2: "65%", label: "신뢰", color: "#34d399" },
  ];
  return (
    <div style={{ position: "relative", width: "100%", height: "100%" }}>
      <svg style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}>
        {edges.map((e, i) => (
          <g key={i}>
            <line x1={e.x1} y1={e.y1} x2={e.x2} y2={e.y2} stroke={e.color} strokeWidth="1.5" strokeOpacity="0.6" />
            <text x={`${(parseInt(e.x1) + parseInt(e.x2)) / 2}%`} y={`${(parseInt(e.y1) + parseInt(e.y2)) / 2}%`} fill={e.color} fontSize="9" textAnchor="middle" opacity="0.8">{e.label}</text>
          </g>
        ))}
      </svg>
      {nodes.map((n, i) => (
        <div key={i} style={{
          position: "absolute", left: `${n.x}%`, top: `${n.y}%`,
          transform: "translate(-50%, -50%)",
          display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
          animation: `fadeIn 0.5s ease both`,
          animationDelay: `${i * 0.15}s`,
        }}>
          <div style={{
            width: 44, height: 44, borderRadius: 12,
            background: n.color + "33", border: `2px solid ${n.color}66`,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 16, fontWeight: 700, color: n.color,
          }}>{n.label[0]}</div>
          <span style={{ fontSize: 11, color: "#e5e7eb", fontWeight: 600 }}>{n.label}</span>
          <span style={{ fontSize: 10, color: "#6b7280" }}>{n.role}</span>
        </div>
      ))}
    </div>
  );
}

function WorldVisual() {
  const links = [
    { type: "그림", title: "맥베스 초상화", color: "#818cf8" },
    { type: "소설", title: "만약 배경이 현대라면?", color: "#34d399" },
    { type: "그림", title: "만약 배경이 현대라면?", color: "#818cf8" },
  ];
  return (
    <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: 8 }}>
      {links.map((item, i) => (
        <div key={i} style={{
          display: "flex", alignItems: "center", gap: 10,
          background: "rgba(255,255,255,0.04)", borderRadius: 10,
          padding: "10px 12px",
          animation: `slideInRight 0.4s ease both`,
          animationDelay: `${i * 0.1}s`,
        }}>
          <span style={{ fontSize: 11, background: item.color + "22", color: item.color, borderRadius: 6, padding: "2px 7px" }}>{item.type}</span>
          <span style={{ fontSize: 12, color: "#e5e7eb" }}>{item.title}</span>
        </div>
      ))}
    </div>
  );
}

const VISUALS = {
  welcome: WelcomeVisual,
  timeline: TimelineVisual,
  foreshadowing: ForeshadowingVisual,
  relationship: RelationshipVisual,
  world: WorldVisual,
};

export default function OnboardingModal({ onClose, onComplete }) {
  const [current, setCurrent] = useState(0);
  const [direction, setDirection] = useState(1); // 1 = forward, -1 = back
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
    setTimeout(() => {
      setCurrent(next);
      setAnimating(false);
    }, 300);
  };

  const handleClose = () => {
    setVisible(false);
    setTimeout(() => {
      onClose?.();
      onComplete?.();
    }, 300);
  };

  const slide = SLIDES[current];
  const Visual = VISUALS[slide.visual];
  const isLast = current === SLIDES.length - 1;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@300;400;500;600;700&display=swap');

        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-8px); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 0.5; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.05); }
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: scale(0.8); }
          to { opacity: 1; transform: scale(1); }
        }
        @keyframes slideInRight {
          from { opacity: 0; transform: translateX(16px); }
          to { opacity: 1; transform: translateX(0); }
        }
        @keyframes modalIn {
          from { opacity: 0; transform: scale(0.95) translateY(10px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }
        @keyframes backdropIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        .onboarding-dot {
          width: 6px; height: 6px;
          border-radius: 50%;
          background: rgba(255,255,255,0.2);
          cursor: pointer;
          transition: all 0.3s ease;
        }
        .onboarding-dot.active {
          width: 20px;
          border-radius: 3px;
          background: var(--slide-color);
        }
        .onboarding-btn-primary {
          background: var(--slide-color);
          color: #0d0d18;
          border: none;
          border-radius: 14px;
          padding: 14px 28px;
          font-size: 15px;
          font-weight: 700;
          cursor: pointer;
          font-family: 'Noto Sans KR', sans-serif;
          transition: all 0.2s ease;
          flex: 1;
        }
        .onboarding-btn-primary:hover {
          filter: brightness(1.1);
          transform: translateY(-1px);
        }
        .onboarding-btn-secondary {
          background: rgba(255,255,255,0.06);
          color: #9ca3af;
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 14px;
          padding: 14px 20px;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          font-family: 'Noto Sans KR', sans-serif;
          transition: all 0.2s ease;
        }
        .onboarding-btn-secondary:hover {
          background: rgba(255,255,255,0.1);
          color: #e5e7eb;
        }
        .slide-content {
          transition: opacity 0.3s ease, transform 0.3s ease;
        }
        .slide-content.animating {
          opacity: 0;
          transform: translateX(${direction === 1 ? '-20px' : '20px'});
        }
      `}</style>

      {/* Backdrop */}
      <div style={{
        position: "fixed", inset: 0,
        background: "rgba(0,0,0,0.7)",
        backdropFilter: "blur(8px)",
        zIndex: 1000,
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: "20px",
        opacity: visible ? 1 : 0,
        transition: "opacity 0.3s ease",
      }} onClick={handleClose}>

        {/* Modal */}
        <div
          onClick={e => e.stopPropagation()}
          style={{
            "--slide-color": slide.color,
            background: "#13131f",
            borderRadius: 24,
            border: "1px solid rgba(255,255,255,0.08)",
            width: "100%",
            maxWidth: 480,
            overflow: "hidden",
            boxShadow: `0 40px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.05), inset 0 1px 0 rgba(255,255,255,0.08)`,
            opacity: visible ? 1 : 0,
            transform: visible ? "scale(1) translateY(0)" : "scale(0.95) translateY(10px)",
            transition: "all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)",
            fontFamily: "'Noto Sans KR', sans-serif",
          }}
        >
          {/* Top bar */}
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            padding: "20px 24px 0",
          }}>
            <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
              {SLIDES.map((_, i) => (
                <div
                  key={i}
                  className={`onboarding-dot ${i === current ? "active" : ""}`}
                  style={{ "--slide-color": slide.color }}
                  onClick={() => go(i)}
                />
              ))}
            </div>
            <button
              onClick={handleClose}
              style={{
                background: "rgba(255,255,255,0.06)", border: "none",
                color: "#6b7280", width: 32, height: 32, borderRadius: 8,
                cursor: "pointer", fontSize: 16, display: "flex",
                alignItems: "center", justifyContent: "center",
                transition: "all 0.2s",
              }}
              onMouseEnter={e => e.target.style.color = "#e5e7eb"}
              onMouseLeave={e => e.target.style.color = "#6b7280"}
            >✕</button>
          </div>

          {/* Slide content */}
          <div
            className={`slide-content ${animating ? "animating" : ""}`}
            style={{ padding: "28px 28px 24px" }}
          >
            {/* Visual area */}
            <div style={{
              height: 180,
              background: "rgba(255,255,255,0.02)",
              borderRadius: 16,
              border: "1px solid rgba(255,255,255,0.05)",
              overflow: "hidden",
              padding: slide.visual === "relationship" ? 0 : "16px",
              marginBottom: 28,
              position: "relative",
            }}>
              {/* Glow accent */}
              <div style={{
                position: "absolute", top: 0, right: 0,
                width: 120, height: 120,
                background: `radial-gradient(circle, ${slide.color}18 0%, transparent 70%)`,
                borderRadius: "0 16px 0 0",
                pointerEvents: "none",
              }} />
              <Visual />
            </div>

            {/* Icon + Title */}
            <div style={{ marginBottom: 12 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                <span style={{
                  fontSize: 22,
                  color: slide.color,
                  filter: `drop-shadow(0 0 8px ${slide.color}88)`,
                }}>{slide.icon}</span>
                <span style={{
                  fontSize: 11, fontWeight: 600, letterSpacing: "0.08em",
                  color: slide.color, textTransform: "uppercase",
                }}>{slide.subtitle}</span>
              </div>
              <h2 style={{
                margin: 0, fontSize: 24, fontWeight: 700,
                color: "#f9fafb", lineHeight: 1.3,
                letterSpacing: "-0.01em",
              }}>{slide.title}</h2>
            </div>

            <p style={{
              margin: "0 0 28px",
              fontSize: 14, lineHeight: 1.7,
              color: "#9ca3af",
              whiteSpace: "pre-line",
            }}>{slide.description}</p>

            {/* Buttons */}
            <div style={{ display: "flex", gap: 10 }}>
              {current > 0 && (
                <button
                  className="onboarding-btn-secondary"
                  onClick={() => go(current - 1)}
                >이전</button>
              )}
              {current === 0 && (
                <button
                  className="onboarding-btn-secondary"
                  onClick={handleClose}
                >건너뛰기</button>
              )}
              <button
                className="onboarding-btn-primary"
                style={{ "--slide-color": slide.color }}
                onClick={() => isLast ? handleClose() : go(current + 1)}
              >
                {isLast ? "시작하기 🎉" : "다음"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

/*
사용법:

1. 컴포넌트 import
   import OnboardingModal from './OnboardingModal';

2. 첫 로그인 체크 (Firebase 예시)
   const [showOnboarding, setShowOnboarding] = useState(false);

   useEffect(() => {
     const checkOnboarding = async () => {
       const doc = await getDoc(doc(db, 'users', user.uid));
       if (!doc.data()?.onboardingDone) {
         setShowOnboarding(true);
       }
     };
     if (user) checkOnboarding();
   }, [user]);

3. 완료 시 Firebase에 저장
   const handleOnboardingComplete = async () => {
     await updateDoc(doc(db, 'users', user.uid), {
       onboardingDone: true,
       onboardingDoneAt: serverTimestamp(),
     });
     setShowOnboarding(false);
   };

4. 렌더링
   {showOnboarding && (
     <OnboardingModal
       onClose={() => setShowOnboarding(false)}
       onComplete={handleOnboardingComplete}
     />
   )}

5. 설정에서 다시 보기
   <button onClick={() => setShowOnboarding(true)}>
     온보딩 다시 보기
   </button>
*/
