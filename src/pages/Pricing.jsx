import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function Pricing() {
  const navigate = useNavigate();
  const [yearly, setYearly] = useState(false);

  const FREE_FEATURES = [
    '프로젝트 1개',
    '캐릭터 최대 10명',
    '세계관 문서 3개',
    '복선 10개',
    '타임라인 20개',
    '공유 링크 (읽기 전용)',
  ];

  const PRO_FEATURES = [
    '프로젝트 무제한',
    '캐릭터 무제한',
    '세계관 문서 무제한',
    '복선 무제한',
    '타임라인 무제한',
    '공유 링크 (읽기 전용)',
    '우선 고객 지원',
  ];

  const ENTERPRISE_FEATURES = [
    '30명 이상 팀을 위한 플랜',
    'Pro 기능 전체 포함',
    '인당 요금 최대 30% 할인',
    '전용 온보딩 지원',
    '우선 기술 지원 (SLA)',
    '맞춤 계약 및 세금계산서',
  ];

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      {/* 헤더 */}
      <header style={{ height: 52, display: 'flex', alignItems: 'center', padding: '0 20px', gap: 10, borderBottom: '1px solid var(--border)', background: 'var(--bg2)', position: 'sticky', top: 0, zIndex: 10 }}>
        <button className="btn btn-ghost" style={{ fontSize: 12 }} onClick={() => navigate(-1)}>← 뒤로</button>
        <div style={{ width: 1, height: 16, background: 'var(--border)' }} />
        <span style={{ fontFamily: 'var(--font-serif)', fontSize: 16 }}>Cartographic</span>
      </header>

      <main style={{ maxWidth: 800, margin: '0 auto', padding: '60px 20px 80px' }}>
        <div style={{ textAlign: 'center', marginBottom: 48 }}>
          <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: 36, letterSpacing: '-0.02em', marginBottom: 12 }}>요금제</h1>
          <p style={{ color: 'var(--text2)', fontSize: 15, marginBottom: 28 }}>처음 30일은 Pro 플랜을 무료로 체험해보세요</p>

          {/* 월간/연간 토글 */}
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 12, background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 99, padding: '6px 8px' }}>
            <button onClick={() => setYearly(false)} style={{ padding: '6px 16px', borderRadius: 99, border: 'none', background: !yearly ? 'var(--accent)' : 'transparent', color: !yearly ? '#fff' : 'var(--text2)', cursor: 'pointer', fontSize: 13, fontWeight: 500, transition: 'all 0.2s' }}>월간</button>
            <button onClick={() => setYearly(true)} style={{ padding: '6px 16px', borderRadius: 99, border: 'none', background: yearly ? 'var(--accent)' : 'transparent', color: yearly ? '#fff' : 'var(--text2)', cursor: 'pointer', fontSize: 13, fontWeight: 500, transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: 6 }}>
              연간
              <span style={{ background: 'rgba(255,255,255,0.2)', borderRadius: 99, padding: '1px 8px', fontSize: 11 }}>25% 할인</span>
            </button>
          </div>
        </div>

        {/* 요금제 카드 */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 20 }}>
          {/* Free */}
          <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 'var(--radius-xl)', padding: 28 }}>
            <div style={{ marginBottom: 24 }}>
              <div style={{ fontSize: 13, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Free</div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
                <span style={{ fontFamily: 'var(--font-serif)', fontSize: 40 }}>0원</span>
              </div>
              <div style={{ color: 'var(--text3)', fontSize: 12, marginTop: 4 }}>영원히 무료</div>
            </div>
            <button className="btn" style={{ width: '100%', justifyContent: 'center', height: 42, fontSize: 14, marginBottom: 24 }} onClick={() => navigate('/')}>
              시작하기
            </button>
            <div style={{ borderTop: '1px solid var(--border)', paddingTop: 20 }}>
              {FREE_FEATURES.map((f, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                  <span style={{ color: 'var(--text3)', fontSize: 14 }}>○</span>
                  <span style={{ fontSize: 13, color: 'var(--text2)' }}>{f}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Pro */}
          <div style={{ background: 'var(--bg2)', border: '2px solid var(--accent)', borderRadius: 'var(--radius-xl)', padding: 28, position: 'relative' }}>
            <div style={{ position: 'absolute', top: -12, left: '50%', transform: 'translateX(-50%)', background: 'var(--accent)', color: '#fff', fontSize: 11, fontWeight: 500, padding: '3px 14px', borderRadius: 99, whiteSpace: 'nowrap' }}>
              30일 무료 체험
            </div>
            <div style={{ marginBottom: 24 }}>
              <div style={{ fontSize: 13, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Pro</div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
                <span style={{ fontFamily: 'var(--font-serif)', fontSize: 40 }}>
                  {yearly ? '29,900' : '3,300'}원
                </span>
                <span style={{ color: 'var(--text3)', fontSize: 13 }}>{yearly ? '/년' : '/월'}</span>
              </div>
              <div style={{ color: 'var(--text3)', fontSize: 12, marginTop: 4 }}>
                {yearly ? '월 2,492원 · 25% 할인' : '연간 결제 시 25% 할인'}
              </div>
            </div>
            <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', height: 42, fontSize: 14, marginBottom: 24 }} onClick={() => navigate('/')}>
              무료로 시작하기
            </button>
            <div style={{ borderTop: '1px solid var(--border)', paddingTop: 20 }}>
              {PRO_FEATURES.map((f, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                  <span style={{ color: 'var(--accent)', fontSize: 14 }}>✦</span>
                  <span style={{ fontSize: 13, color: 'var(--text)' }}>{f}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Enterprise */}
          <div style={{ background: 'var(--bg2)', border: '1px solid var(--border2)', borderRadius: 'var(--radius-xl)', padding: 28, position: 'relative' }}>
            <div style={{ marginBottom: 24 }}>
              <div style={{ fontSize: 13, color: 'var(--teal, #2dd4bf)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Enterprise</div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
                <span style={{ fontFamily: 'var(--font-serif)', fontSize: 28, color: 'var(--text)' }}>맞춤 견적</span>
              </div>
              <div style={{ color: 'var(--text3)', fontSize: 12, marginTop: 4 }}>30명 이상 팀을 위한 맞춤 견적</div>
            </div>
            <a href="mailto:histy.cartographic@gmail.com?subject=Cartographic Enterprise 문의&body=안녕하세요, Cartographic Enterprise 플랜에 대해 문의드립니다.%0A%0A회사명:%0A팀 인원:%0A문의 내용:"
              style={{ display: 'block', textDecoration: 'none' }}>
              <button className="btn" style={{ width: '100%', justifyContent: 'center', height: 42, fontSize: 14, marginBottom: 24, border: '1px solid var(--border2)', color: 'var(--text)' }}>
                문의하기 →
              </button>
            </a>
            <div style={{ borderTop: '1px solid var(--border)', paddingTop: 20 }}>
              {ENTERPRISE_FEATURES.map((f, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                  <span style={{ color: '#2dd4bf', fontSize: 14 }}>✦</span>
                  <span style={{ fontSize: 13, color: 'var(--text2)' }}>{f}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 환불 안내 */}
        <div style={{ textAlign: 'center', marginTop: 40, padding: '20px', background: 'var(--bg2)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border)' }}>
          <p style={{ fontSize: 13, color: 'var(--text2)' }}>결제 후 24시간 이내 전액 환불 보장 · 언제든지 해지 가능</p>
          <p style={{ fontSize: 12, color: 'var(--text3)', marginTop: 6 }}>문의: histy.cartographic@gmail.com</p>
        </div>
      </main>

      {/* 사업자 정보 footer */}
      <footer style={{ borderTop: '1px solid var(--border)', padding: '24px 20px', background: 'var(--bg2)' }}>
        <div style={{ maxWidth: 800, margin: '0 auto', fontSize: 11, color: 'var(--text3)', lineHeight: 2, textAlign: 'center' }}>
          <p>상호명: 히스티 · 사업자등록번호: 162-18-02499</p>
          <p>주소: 서울특별시 광진구 구의강변로 11 · 이메일: histy.cartographic@gmail.com</p>
        </div>
      </footer>
    </div>
  );
}
