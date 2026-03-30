import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function NotFound() {
  const navigate = useNavigate();
  const [dots, setDots] = useState([]);

  useEffect(() => {
    // 랜덤 별 생성
    const arr = Array.from({ length: 24 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() * 3 + 1,
      delay: Math.random() * 3,
      duration: Math.random() * 3 + 2,
    }));
    setDots(arr);
  }, []);

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display&family=Noto+Sans+KR:wght@300;400;500&display=swap');

        @keyframes float {
          0%, 100% { transform: translateY(0px) rotate(0deg); opacity: 0.4; }
          50% { transform: translateY(-12px) rotate(180deg); opacity: 1; }
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 0.3; transform: scale(1); }
          50% { opacity: 0.8; transform: scale(1.05); }
        }
        @keyframes spin-slow {
          to { transform: rotate(360deg); }
        }

        .not-found-container {
          min-height: 100vh;
          background: #0d0d18;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          position: relative;
          overflow: hidden;
          font-family: 'Noto Sans KR', sans-serif;
        }

        .star {
          position: absolute;
          border-radius: 50%;
          background: #a89cf8;
          animation: float var(--dur) ease-in-out infinite;
          animation-delay: var(--delay);
        }

        .glow {
          position: absolute;
          width: 400px;
          height: 400px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(139,124,248,0.08) 0%, transparent 70%);
          animation: pulse 4s ease-in-out infinite;
        }

        .content {
          position: relative;
          z-index: 10;
          text-align: center;
          animation: fadeIn 0.6s ease both;
        }

        .logo-ring {
          width: 80px;
          height: 80px;
          border: 1.5px dashed #5b52a0;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto 32px;
          animation: spin-slow 20s linear infinite;
        }

        .logo-dot {
          width: 10px;
          height: 10px;
          border-radius: 50%;
          background: #8b7cf8;
          animation: spin-slow 20s linear infinite reverse;
        }

        .num-404 {
          font-family: 'DM Serif Display', serif;
          font-size: clamp(80px, 16vw, 140px);
          color: transparent;
          -webkit-text-stroke: 1px rgba(139,124,248,0.4);
          line-height: 1;
          margin-bottom: 8px;
          letter-spacing: -4px;
          animation: fadeIn 0.6s ease 0.1s both;
        }

        .title {
          font-family: 'DM Serif Display', serif;
          font-size: clamp(20px, 4vw, 28px);
          color: #f9fafb;
          margin-bottom: 12px;
          animation: fadeIn 0.6s ease 0.2s both;
        }

        .desc {
          font-size: 14px;
          color: #6b7280;
          line-height: 1.7;
          margin-bottom: 40px;
          animation: fadeIn 0.6s ease 0.3s both;
        }

        .btn-group {
          display: flex;
          gap: 12px;
          justify-content: center;
          flex-wrap: wrap;
          animation: fadeIn 0.6s ease 0.4s both;
        }

        .btn-primary {
          background: #8b7cf8;
          color: #fff;
          border: none;
          border-radius: 12px;
          padding: 12px 28px;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          font-family: 'Noto Sans KR', sans-serif;
          transition: all 0.2s ease;
        }
        .btn-primary:hover {
          background: #7c6ef0;
          transform: translateY(-1px);
        }

        .btn-ghost {
          background: rgba(255,255,255,0.05);
          color: #9ca3af;
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 12px;
          padding: 12px 28px;
          font-size: 14px;
          font-weight: 400;
          cursor: pointer;
          font-family: 'Noto Sans KR', sans-serif;
          transition: all 0.2s ease;
        }
        .btn-ghost:hover {
          background: rgba(255,255,255,0.08);
          color: #f9fafb;
        }
      `}</style>

      <div className="not-found-container">
        {/* 배경 별들 */}
        {dots.map(d => (
          <div key={d.id} className="star" style={{
            left: `${d.x}%`,
            top: `${d.y}%`,
            width: d.size,
            height: d.size,
            '--dur': `${d.duration}s`,
            '--delay': `${d.delay}s`,
          }} />
        ))}

        {/* 배경 글로우 */}
        <div className="glow" />

        <div className="content">
          {/* 로고 */}
          <div className="logo-ring">
            <div className="logo-dot" />
          </div>

          {/* 404 숫자 */}
          <div className="num-404">404</div>

          {/* 타이틀 */}
          <div className="title">페이지를 찾을 수 없어요</div>

          {/* 설명 */}
          <p className="desc">
            이 페이지는 존재하지 않거나 이동되었어요.<br />
            세계관 속에서 길을 잃으셨나요?
          </p>

          {/* 버튼 */}
          <div className="btn-group">
            <button className="btn-primary" onClick={() => navigate('/')}>
              홈으로 돌아가기
            </button>
            <button className="btn-ghost" onClick={() => navigate(-1)}>
              이전 페이지
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
