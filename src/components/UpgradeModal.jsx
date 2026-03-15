import React from 'react';

export default function UpgradeModal({ message, onClose }) {
  if (!message) return null;
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 360, textAlign: 'center' }}>
        <div style={{ fontSize: 32, marginBottom: 12 }}>✦</div>
        <div className="modal-title" style={{ textAlign: 'center', marginBottom: 8 }}>Pro 플랜이 필요해요</div>
        <p style={{ color: 'var(--text2)', fontSize: 13, lineHeight: 1.7, marginBottom: 24 }}>
          {message}<br />
          Pro 플랜으로 업그레이드하면 모든 기능을 무제한으로 사용할 수 있어요.
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <button
            className="btn btn-primary"
            style={{ width: '100%', justifyContent: 'center', height: 42, fontSize: 14 }}
            onClick={() => {
              // TODO: 결제 페이지로 연결
              alert('결제 기능은 곧 오픈될 예정이에요! 조금만 기다려주세요 🙏');
              onClose();
            }}
          >
            Pro로 업그레이드 · 월 4,900원
          </button>
          <button className="btn" style={{ width: '100%', justifyContent: 'center', height: 38 }} onClick={onClose}>
            나중에
          </button>
        </div>
        <p style={{ color: 'var(--text3)', fontSize: 11, marginTop: 16 }}>
          첫 30일 무료 체험 후 결제가 시작돼요
        </p>
      </div>
    </div>
  );
}
