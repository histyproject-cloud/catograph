import React from 'react';
import { useNavigate } from 'react-router-dom';
import { PRICE } from '../config/plans';

const FEATURES = [
  { text: '캐릭터 무제한 등록' },
  { text: '세계관 문서 무제한' },
  { text: '복선 무제한 등록' },
  { text: '타임라인 이벤트 무제한' },
  { text: '프로젝트 무제한 생성' },
  { text: '캐릭터 사진 업로드' },
];

export default function UpgradeModal({ message, onClose }) {
  const navigate = useNavigate();

  if (!message) return null;

  const handleUpgrade = () => {
    onClose?.();
    navigate('/pricing');
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 380 }}>
        {/* 헤더 */}
        <div style={{ textAlign: 'center', marginBottom: 20 }}>
          <div style={{ fontSize: 36, marginBottom: 10 }}>✦</div>
          <div className="modal-title" style={{ textAlign: 'center', marginBottom: 6 }}>Pro 플랜으로 업그레이드</div>
          <p style={{ color: 'var(--text3)', fontSize: 12, lineHeight: 1.6 }}>{message}</p>
        </div>

        {/* 기능 목록 */}
        <div style={{ background: 'var(--bg3)', borderRadius: 'var(--radius)', padding: '14px 16px', marginBottom: 20 }}>
          <div style={{ fontSize: 11, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10 }}>Pro 플랜 포함 기능</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
            {FEATURES.map((f, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--text2)' }}>
                <span style={{ color: 'var(--accent)', fontSize: 14 }}>✦</span>
                <span>{f.text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* 가격 */}
        <div style={{ textAlign: 'center', marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: 4 }}>
            <span style={{ fontSize: 28, fontWeight: 700, color: 'var(--text)', fontFamily: 'var(--font-serif)' }}>
              {PRICE.monthly.toLocaleString()}원
            </span>
            <span style={{ fontSize: 13, color: 'var(--text3)' }}>/월</span>
          </div>
          <div style={{ fontSize: 12, color: 'var(--accent)', marginTop: 4 }}>
            첫 {PRICE.trialDays}일 무료 체험 후 결제 시작
          </div>
        </div>

        {/* 버튼 */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <button
            className="btn btn-primary"
            style={{ width: '100%', justifyContent: 'center', height: 44, fontSize: 14 }}
            onClick={handleUpgrade}
          >
            {PRICE.trialDays}일 무료로 시작하기
          </button>
          <button className="btn" style={{ width: '100%', justifyContent: 'center', height: 38, fontSize: 13 }} onClick={onClose}>
            나중에
          </button>
        </div>

        <p style={{ color: 'var(--text3)', fontSize: 11, marginTop: 14, textAlign: 'center', lineHeight: 1.6 }}>
          언제든지 취소 가능 · 취소 시 다음 결제일까지 이용 가능
        </p>
      </div>
    </div>
  );
}
