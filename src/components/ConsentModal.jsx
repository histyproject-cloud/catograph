import React, { useState } from 'react';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { useNavigate } from 'react-router-dom';

export default function ConsentModal({ user, onComplete }) {
  const [terms, setTerms] = useState(false);
  const [privacy, setPrivacy] = useState(false);
  const [marketing, setMarketing] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const allRequired = terms && privacy;

  const handleAgree = async () => {
    if (!allRequired || loading) return;
    setLoading(true);
    try {
      await setDoc(doc(db, 'users', user.uid), {
        agreedToTerms: true,
        agreedToPrivacy: true,
        marketingConsent: marketing,
        consentAt: serverTimestamp(),
        consentVersion: '2026-04-01',
      }, { merge: true });
      onComplete({ marketingConsent: marketing });
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleAll = (checked) => {
    setTerms(checked);
    setPrivacy(checked);
    setMarketing(checked);
  };

  const allChecked = terms && privacy && marketing;

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: 'rgba(0,0,0,0.7)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 20,
    }}>
      <div style={{
        background: 'var(--bg2)',
        border: '1px solid var(--border2)',
        borderRadius: 'var(--radius-xl)',
        width: '100%', maxWidth: 420,
        padding: '28px 24px',
        animation: 'fadeUp 0.25s ease',
      }}>
        <style>{`@keyframes fadeUp { from { opacity:0; transform:translateY(16px) } to { opacity:1; transform:translateY(0) } }`}</style>

        {/* 헤더 */}
        <div style={{ marginBottom: 20, textAlign: 'center' }}>
          <div style={{ fontFamily: 'var(--font-serif)', fontSize: 20, color: 'var(--text)', marginBottom: 6 }}>서비스 이용 동의</div>
          <div style={{ fontSize: 12, color: 'var(--text3)', lineHeight: 1.6 }}>
            Cartographic 이용을 위해 아래 약관에 동의해 주세요.
          </div>
        </div>

        {/* 전체 동의 */}
        <label style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '12px 14px',
          background: 'var(--bg3)',
          borderRadius: 'var(--radius)',
          cursor: 'pointer', marginBottom: 8,
          border: '1px solid var(--border)',
        }}>
          <input type="checkbox" checked={allChecked} onChange={e => handleAll(e.target.checked)}
            style={{ width: 16, height: 16, accentColor: 'var(--accent)', cursor: 'pointer' }} />
          <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)' }}>전체 동의</span>
        </label>

        <div style={{ width: '100%', height: 1, background: 'var(--border)', margin: '12px 0' }} />

        {/* 개별 항목 */}
        {[
          { checked: terms, onChange: setTerms, label: '이용약관 동의', required: true, link: '/legal' },
          { checked: privacy, onChange: setPrivacy, label: '개인정보처리방침 동의', required: true, link: '/legal' },
          { checked: marketing, onChange: setMarketing, label: '마케팅 정보 수신 동의', required: false, desc: '신규 기능·이벤트 소식을 이메일로 받아볼 수 있어요.' },
        ].map((item, i) => (
          <label key={i} style={{
            display: 'flex', alignItems: 'flex-start', gap: 10,
            padding: '10px 4px', cursor: 'pointer',
            borderBottom: i < 2 ? '1px solid var(--border)' : 'none',
          }}>
            <input type="checkbox" checked={item.checked} onChange={e => item.onChange(e.target.checked)}
              style={{ width: 15, height: 15, accentColor: 'var(--accent)', cursor: 'pointer', marginTop: 1, flexShrink: 0 }} />
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 13, color: 'var(--text)' }}>{item.label}</span>
                <span style={{
                  fontSize: 10, padding: '1px 6px', borderRadius: 4,
                  background: item.required ? 'rgba(139,124,248,0.15)' : 'var(--bg3)',
                  color: item.required ? 'var(--accent2)' : 'var(--text3)',
                }}>
                  {item.required ? '필수' : '선택'}
                </span>
                {item.link && (
                  <span onClick={e => { e.preventDefault(); e.stopPropagation(); window.open(item.link, '_blank'); }}
                    style={{ fontSize: 11, color: 'var(--text3)', textDecoration: 'underline', cursor: 'pointer', marginLeft: 'auto' }}>
                    보기
                  </span>
                )}
              </div>
              {item.desc && <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2, lineHeight: 1.5 }}>{item.desc}</div>}
            </div>
          </label>
        ))}

        {/* 버튼 */}
        <button
          onClick={handleAgree}
          disabled={!allRequired || loading}
          style={{
            width: '100%', height: 44, marginTop: 20,
            background: allRequired ? 'var(--accent)' : 'var(--bg3)',
            color: allRequired ? '#fff' : 'var(--text3)',
            border: 'none', borderRadius: 'var(--radius)',
            fontSize: 14, fontWeight: 500, cursor: allRequired ? 'pointer' : 'not-allowed',
            fontFamily: 'inherit', transition: 'all 0.15s',
          }}
        >
          {loading ? '처리 중...' : '동의하고 시작하기'}
        </button>

        <p style={{ fontSize: 11, color: 'var(--text3)', textAlign: 'center', marginTop: 12, lineHeight: 1.6 }}>
          필수 항목에 동의하지 않으면 서비스를 이용할 수 없습니다.
        </p>
      </div>
    </div>
  );
}
