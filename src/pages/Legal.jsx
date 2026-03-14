import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const SECTIONS = {
  privacy: {
    title: '개인정보처리방침',
    updated: '2025년 3월 15일',
    content: [
      {
        heading: '1. 수집하는 개인정보',
        body: `Cartograph(이하 "서비스")는 서비스 제공을 위해 다음과 같은 개인정보를 수집합니다.\n\n• 수집 항목: Google 계정 이메일 주소, 이름, 프로필 사진\n• 수집 방법: Google OAuth 로그인을 통한 자동 수집\n• 수집 목적: 회원 식별 및 서비스 제공`
      },
      {
        heading: '2. 개인정보의 이용 목적',
        body: `수집한 개인정보는 다음의 목적을 위해 활용합니다.\n\n• 서비스 제공 및 계정 관리\n• 작품 데이터(캐릭터, 세계관, 복선 등) 저장 및 관리\n• 공유 기능 제공\n• 서비스 개선 및 새로운 기능 개발`
      },
      {
        heading: '3. 개인정보의 보유 및 이용 기간',
        body: `서비스 이용 기간 동안 개인정보를 보유합니다. 회원 탈퇴 시 개인정보 및 작품 데이터는 즉시 삭제됩니다. 단, 관련 법령에 의해 보존할 필요가 있는 경우 해당 기간 동안 보관합니다.`
      },
      {
        heading: '4. 개인정보의 제3자 제공',
        body: `Cartograph는 이용자의 개인정보를 원칙적으로 외부에 제공하지 않습니다. 다만, 이용자가 사전에 동의한 경우 또는 법령의 규정에 의거한 경우에는 예외로 합니다.\n\n서비스는 Firebase(Google LLC)를 통해 데이터를 저장하며, Firebase의 개인정보처리방침이 적용됩니다.`
      },
      {
        heading: '5. 이용자의 권리',
        body: `이용자는 언제든지 다음의 권리를 행사할 수 있습니다.\n\n• 개인정보 열람 요청\n• 개인정보 수정 요청\n• 개인정보 삭제 요청 (회원 탈퇴)\n• 개인정보 처리 정지 요청\n\n문의 이메일: cartograph.help@gmail.com`
      },
      {
        heading: '6. 쿠키 및 유사 기술',
        body: `서비스는 로그인 상태 유지를 위해 Firebase Authentication이 제공하는 세션 토큰을 사용합니다. 이는 브라우저 로컬 스토리지에 저장되며, 브라우저 설정을 통해 삭제할 수 있습니다.`
      },
      {
        heading: '7. 개인정보 보호책임자',
        body: `개인정보 관련 문의사항은 아래 연락처로 문의해 주세요.\n\n이메일: cartograph.help@gmail.com`
      },
    ]
  },
  terms: {
    title: '이용약관',
    updated: '2025년 3월 15일',
    content: [
      {
        heading: '제1조 (목적)',
        body: `이 약관은 Cartograph(이하 "서비스")의 이용과 관련하여 서비스와 이용자 간의 권리, 의무 및 책임사항을 규정함을 목적으로 합니다.`
      },
      {
        heading: '제2조 (서비스 내용)',
        body: `서비스는 창작자를 위한 세계관 및 캐릭터 관리 도구를 제공합니다.\n\n• 캐릭터 관계도 작성 및 관리\n• 세계관 설정 문서화\n• 복선 및 플롯 관리\n• 타임라인 정리\n• 협업자와의 설정 공유 (읽기 전용)`
      },
      {
        heading: '제3조 (회원가입)',
        body: `서비스는 Google 계정을 통한 소셜 로그인 방식으로 회원가입이 이루어집니다. 회원가입 시 이 약관에 동의한 것으로 간주합니다.`
      },
      {
        heading: '제4조 (서비스 이용)',
        body: `① 서비스는 연중무휴 24시간 제공을 원칙으로 하나, 시스템 점검 등의 사유로 일시 중단될 수 있습니다.\n\n② 이용자는 다음 행위를 해서는 안 됩니다.\n\n• 타인의 개인정보를 무단으로 수집, 저장, 공개하는 행위\n• 서비스의 정상적인 운영을 방해하는 행위\n• 저작권 등 타인의 권리를 침해하는 콘텐츠 등록\n• 법령에 위반되는 내용을 게시하는 행위`
      },
      {
        heading: '제5조 (콘텐츠 소유권)',
        body: `이용자가 서비스에 등록한 창작물(캐릭터, 세계관, 복선 등)의 저작권은 이용자에게 귀속됩니다. 서비스는 이용자의 콘텐츠를 서비스 제공 목적 외에 사용하지 않습니다.`
      },
      {
        heading: '제6조 (요금 및 결제)',
        body: `① 기본 기능은 무료로 제공됩니다.\n\n② 유료 플랜의 경우 별도 안내되는 요금이 적용됩니다.\n\n③ 유료 서비스 이용 중 해지 시 환불 정책은 관련 법령에 따릅니다.`
      },
      {
        heading: '제7조 (서비스 변경 및 중단)',
        body: `서비스는 운영상 필요한 경우 서비스 내용을 변경하거나 중단할 수 있습니다. 중요한 변경사항은 사전에 공지합니다.`
      },
      {
        heading: '제8조 (면책조항)',
        body: `① 서비스는 이용자가 등록한 정보의 정확성에 대해 책임지지 않습니다.\n\n② 서비스는 천재지변, 불가항력적 사유로 인한 서비스 중단에 대해 책임지지 않습니다.\n\n③ 이용자가 서비스를 이용하여 발생한 손해에 대해서는 이용자 본인이 책임을 집니다.`
      },
      {
        heading: '제9조 (분쟁 해결)',
        body: `서비스와 이용자 간 발생한 분쟁은 대한민국 법률에 따르며, 관할 법원은 서울중앙지방법원으로 합니다.`
      },
    ]
  }
};

export default function Legal() {
  const navigate = useNavigate();
  const [active, setActive] = useState('privacy');
  const section = SECTIONS[active];

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      {/* 헤더 */}
      <header style={{ height: 52, display: 'flex', alignItems: 'center', padding: '0 20px', gap: 10, borderBottom: '1px solid var(--border)', background: 'var(--bg2)', position: 'sticky', top: 0, zIndex: 10 }}>
        <button className="btn btn-ghost" style={{ fontSize: 12 }} onClick={() => navigate(-1)}>← 뒤로</button>
        <div style={{ width: 1, height: 16, background: 'var(--border)' }} />
        <span style={{ fontFamily: 'var(--font-serif)', fontSize: 16 }}>Cartograph</span>
      </header>

      {/* 탭 */}
      <div style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg2)', padding: '0 20px', display: 'flex' }}>
        {[{ id: 'privacy', label: '개인정보처리방침' }, { id: 'terms', label: '이용약관' }].map(t => (
          <button key={t.id} onClick={() => setActive(t.id)} style={{
            padding: '12px 16px', fontSize: 13, border: 'none', background: 'none', cursor: 'pointer',
            color: active === t.id ? 'var(--text)' : 'var(--text3)',
            borderBottom: active === t.id ? '2px solid var(--accent)' : '2px solid transparent',
            fontWeight: active === t.id ? 500 : 400
          }}>{t.label}</button>
        ))}
      </div>

      {/* 본문 */}
      <main style={{ maxWidth: 720, margin: '0 auto', padding: '40px 20px 80px' }}>
        <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: 28, marginBottom: 6 }}>{section.title}</h1>
        <p style={{ color: 'var(--text3)', fontSize: 12, marginBottom: 40 }}>최종 업데이트: {section.updated}</p>

        {section.content.map((s, i) => (
          <div key={i} style={{ marginBottom: 36 }}>
            <h2 style={{ fontSize: 15, fontWeight: 500, color: 'var(--text)', marginBottom: 12, paddingBottom: 8, borderBottom: '1px solid var(--border)' }}>{s.heading}</h2>
            <p style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.9, whiteSpace: 'pre-line' }}>{s.body}</p>
          </div>
        ))}

        <div style={{ marginTop: 48, padding: '20px', background: 'var(--bg2)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border)' }}>
          <p style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.7 }}>
            문의사항이 있으시면 <strong style={{ color: 'var(--text)' }}>cartograph.help@gmail.com</strong>으로 연락해 주세요.
          </p>
        </div>
      </main>
    </div>
  );
}
