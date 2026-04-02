import React, { useState } from 'react';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';

const TERMS_CONTENT = `제1조 (목적)
본 약관은 히스티(이하 '회사')가 제공하는 Cartographic(cartographic.agency) 서비스 이용과 관련하여 회사와 이용자의 권리, 의무 및 책임사항을 규정함을 목적으로 합니다.

제2조 (서비스 내용)
서비스는 웹소설·웹툰 창작자를 위한 작품 관리 도구로, 캐릭터 관계도, 설정집, 복선 관리, 타임라인 정리, 공유 기능을 제공합니다.

제3조 (콘텐츠 소유권)
이용자가 서비스 내에 입력하거나 저장한 데이터의 저작권은 이용자에게 귀속됩니다. 회사는 이용자의 데이터에 대해 어떠한 소유권도 주장하지 않습니다.

제4조 (요금 및 결제)
무료(Free) 플랜은 기본 기능을 무료로 제공합니다. Pro 플랜 요금은 월 3,300원 또는 연 29,900원이며, 결제는 토스페이먼츠를 통해 처리됩니다.

제5조 (환불 정책)
결제일로부터 7일 이내 환불 신청 시 전액 환불합니다. 환불 신청은 histy.cartographic@gmail.com으로 접수합니다.

제6조 (분쟁조정)
본 약관은 대한민국 법령에 의하여 규정되며, 분쟁 발생 시 서울중앙지방법원을 관할법원으로 합니다.`;

const PRIVACY_CONTENT = `제1조 (수집하는 개인정보)
• 수집 항목: Google 계정 이메일, Google ID, 이름
• 수집 방법: Google OAuth 로그인을 통한 자동 수집
• 수집 목적: 회원 식별 및 서비스 제공

제2조 (개인정보의 보유 및 이용 기간)
서비스 탈퇴 시까지 보유합니다. 단, 전자상거래법에 따라 계약·결제 기록은 5년, 분쟁 기록은 3년 보관합니다.

제3조 (개인정보 처리 위탁)
• Google LLC (Firebase): 클라우드 서버 운영, 인증 및 데이터베이스 관리
• 토스페이먼츠: 이용 요금 결제 처리

제4조 (이용자의 권리)
이용자는 언제든지 개인정보 열람·정정·삭제·처리정지를 요청할 수 있습니다.
문의: histy.cartographic@gmail.com

제5조 (AI 데이터 미활용)
이용자가 서비스 내에 입력한 데이터는 AI 모델의 학습 목적으로 사용되지 않습니다.

제6조 (개인정보 보호책임자)
• 성명: 우연우
• 이메일: histy.cartographic@gmail.com`;

function ExpandableSection({ label, required, content, checked, onChange }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ borderBottom: '1px solid var(--border)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '11px 4px' }}>
        <input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)}
          style={{ width: 15, height: 15, accentColor: 'var(--accent)', cursor: 'pointer', flexShrink: 0 }} />
        <span style={{ fontSize: 13, color: 'var(--text)', flex: 1 }}>{label}</span>
        <span style={{
          fontSize: 10, padding: '1px 6px', borderRadius: 4, flexShrink: 0,
          background: required ? 'rgba(139,124,248,0.15)' : 'var(--bg3)',
          color: required ? 'var(--accent2)' : 'var(--text3)',
        }}>{required ? '필수' : '선택'}</span>
        <button onClick={() => setOpen(v => !v)} style={{
          background: 'none', border: 'none', cursor: 'pointer',
          color: 'var(--text3)', fontSize: 11, padding: '2px 6px',
          display: 'flex', alignItems: 'center', gap: 3, flexShrink: 0,
        }}>
          {open ? '접기' : '보기'}
          <span style={{ fontSize: 9, transform: open ? 'rotate(180deg)' : 'none', display: 'inline-block', transition: 'transform 0.2s' }}>▼</span>
        </button>
      </div>
      {open && (
        <div style={{
          margin: '0 0 12px 25px',
          padding: '12px 14px',
          background: 'var(--bg3)',
          borderRadius: 'var(--radius)',
          fontSize: 11, color: 'var(--text2)',
          lineHeight: 1.8, whiteSpace: 'pre-line',
          maxHeight: 200, overflowY: 'auto',
        }}>
          {content}
        </div>
      )}
    </div>
  );
}

export default function ConsentModal({ user, onComplete }) {
  const [terms, setTerms] = useState(false);
  const [privacy, setPrivacy] = useState(false);
  const [marketing, setMarketing] = useState(false);
  const [loading, setLoading] = useState(false);

  const allRequired = terms && privacy;
  const allChecked = terms && privacy && marketing;

  const handleAll = (checked) => {
    setTerms(checked);
    setPrivacy(checked);
    setMarketing(checked);
  };

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
        maxHeight: '90vh', overflowY: 'auto',
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
        <ExpandableSection
          label="이용약관 동의"
          required={true}
          content={TERMS_CONTENT}
          checked={terms}
          onChange={setTerms}
        />
        <ExpandableSection
          label="개인정보처리방침 동의"
          required={true}
          content={PRIVACY_CONTENT}
          checked={privacy}
          onChange={setPrivacy}
        />

        {/* 마케팅 (펼치기 없음) */}
        <div style={{ padding: '11px 4px' }}>
          <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, cursor: 'pointer' }}>
            <input type="checkbox" checked={marketing} onChange={e => setMarketing(e.target.checked)}
              style={{ width: 15, height: 15, accentColor: 'var(--accent)', cursor: 'pointer', marginTop: 1, flexShrink: 0 }} />
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 13, color: 'var(--text)' }}>마케팅 정보 수신 동의</span>
                <span style={{ fontSize: 10, padding: '1px 6px', borderRadius: 4, background: 'var(--bg3)', color: 'var(--text3)' }}>선택</span>
              </div>
              <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2, lineHeight: 1.5 }}>
                신규 기능·이벤트 소식을 이메일로 받아볼 수 있어요.
              </div>
            </div>
          </label>
        </div>

        {/* 버튼 */}
        <button
          onClick={handleAgree}
          disabled={!allRequired || loading}
          style={{
            width: '100%', height: 44, marginTop: 20,
            background: allRequired ? 'var(--accent)' : 'var(--bg3)',
            color: allRequired ? '#fff' : 'var(--text3)',
            border: 'none', borderRadius: 'var(--radius)',
            fontSize: 14, fontWeight: 500,
            cursor: allRequired ? 'pointer' : 'not-allowed',
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
