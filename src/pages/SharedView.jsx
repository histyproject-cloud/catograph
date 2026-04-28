import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { getAvatarColor } from '../components/DetailPanel';

export default function SharedView() {
  const { id: projectId } = useParams();
  const [searchParams] = useSearchParams();
  const tabParam = searchParams.get('tab'); // 'characters' | 'world' | 'foreshadow' | 'timeline' | null

  const [project, setProject] = useState(null);
  const [characters, setCharacters] = useState([]);
  const [foreshadows, setForeshadows] = useState([]);
  const [worldDocs, setWorldDocs] = useState([]);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState(tabParam || 'characters');
  const [selectedChar, setSelectedChar] = useState(null);
  const [selectedDoc, setSelectedDoc] = useState(null);

  useEffect(() => {
    const load = async () => {
      try {
        const projDoc = await getDoc(doc(db, 'projects', projectId));
        if (!projDoc.exists()) { setError('존재하지 않는 프로젝트예요'); setLoading(false); return; }
        const projData = projDoc.data();
        if (!projData.shareEnabled) { setError('공유가 비활성화된 프로젝트예요'); setLoading(false); return; }
        setProject(projData);

        const fetch = async (col) => {
          const snap = await getDocs(query(collection(db, col), where('projectId', '==', projectId)));
          return snap.docs.map(d => ({ id: d.id, ...d.data() }));
        };

        const [chars, fs, docs, evs] = await Promise.all([
          fetch('characters'), fetch('foreshadows'), fetch('worldDocs'), fetch('timelineEvents')
        ]);
        setCharacters(chars);
        setForeshadows(fs);
        setWorldDocs(docs);
        setEvents(evs.sort((a, b) => (a.episode || 0) - (b.episode || 0)));
        setLoading(false);
      } catch (e) {
        setError('불러오는 중 오류가 발생했어요');
        setLoading(false);
      }
    };
    load();
  }, [projectId]);

  if (loading) return (
    <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)' }}>
      <div style={{ width: 28, height: 28, border: '2px solid var(--accent)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  if (error) return (
    <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)', flexDirection: 'column', gap: 12 }}>
      <div style={{ fontSize: 28, opacity: 0.3 }}>✦</div>
      <p style={{ color: 'var(--text2)', fontSize: 14 }}>{error}</p>
    </div>
  );

  const ALL_TABS = [
    { id: 'characters', label: '캐릭터' },
    { id: 'world', label: '세계관' },
    { id: 'foreshadow', label: '복선' },
    { id: 'timeline', label: '타임라인' },
  ];

  // tabParam이 있으면 해당 탭만, 없으면 전체
  const TABS = tabParam
    ? ALL_TABS.filter(t => t.id === tabParam)
    : ALL_TABS;

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      {/* 헤더 */}
      <header style={{ height: 52, display: 'flex', alignItems: 'center', padding: '0 20px', gap: 10, borderBottom: '1px solid var(--border)', background: 'var(--bg2)', position: 'sticky', top: 0, zIndex: 10 }}>
        <LogoMark />
        <span style={{ fontFamily: 'var(--font-serif)', fontSize: 18 }}>{project?.name}</span>
        <span className="tag" style={{ background: 'rgba(45,212,191,0.12)', color: 'var(--teal)', fontSize: 11, marginLeft: 4 }}>읽기 전용</span>
        <div style={{ flex: 1 }} />
        <span style={{ fontSize: 11, color: 'var(--text3)' }}>Cartograph</span>
      </header>

      {/* 탭 */}
      <div style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg2)', padding: '0 20px', display: 'flex', gap: 4 }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id)} style={{
            padding: '10px 14px', fontSize: 13, border: 'none', background: 'none', cursor: 'pointer',
            color: activeTab === t.id ? 'var(--text)' : 'var(--text3)',
            borderBottom: activeTab === t.id ? '2px solid var(--accent)' : '2px solid transparent',
            fontWeight: activeTab === t.id ? 500 : 400, transition: 'all 0.15s'
          }}>{t.label}</button>
        ))}
      </div>

      <main style={{ maxWidth: 900, margin: '0 auto', padding: '24px 20px' }}>
        {/* 캐릭터 탭 */}
        {activeTab === 'characters' && (
          <div>
            {selectedChar ? (
              <CharDetail char={selectedChar} foreshadows={foreshadows} onBack={() => setSelectedChar(null)} />
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 12 }}>
                {characters.map(c => {
                  const ac = getAvatarColor(c.name || '?');
                  return (
                    <div key={c.id} onClick={() => setSelectedChar(c)} style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: 16, cursor: 'pointer', transition: 'border-color 0.15s' }}
                      onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--border2)'}
                      onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
                    >
                      <div style={{ width: 40, height: 40, borderRadius: '50%', background: ac.bg, color: ac.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-serif)', fontSize: 18, marginBottom: 10 }}>{c.name?.[0] || '?'}</div>
                      <div style={{ fontWeight: 500, fontSize: 14 }}>{c.name}</div>
                      <div style={{ color: 'var(--text3)', fontSize: 12, marginTop: 2 }}>{c.role}</div>
                      {c.tags?.length > 0 && (
                        <div style={{ marginTop: 8, display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                          {c.tags.slice(0, 3).map((t, i) => <span key={i} className="tag" style={{ background: 'var(--bg4)', color: 'var(--text3)', fontSize: 10 }}>{t}</span>)}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* 세계관 탭 */}
        {activeTab === 'world' && (
          <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
            <div style={{ width: 180, flexShrink: 0 }}>
              {worldDocs.map(d => (
                <button key={d.id} onClick={() => setSelectedDoc(d)} style={{ width: '100%', textAlign: 'left', padding: '8px 10px', borderRadius: 8, fontSize: 13, background: selectedDoc?.id === d.id ? 'var(--bg3)' : 'transparent', color: selectedDoc?.id === d.id ? 'var(--text)' : 'var(--text2)', border: 'none', cursor: 'pointer', display: 'block', marginBottom: 2 }}>{d.title}</button>
              ))}
            </div>
            {selectedDoc ? (
              <div style={{ flex: 1, minWidth: 0 }}>
                <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: 22, marginBottom: 16, paddingBottom: 12, borderBottom: '1px solid var(--border)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{selectedDoc.title}</h2>
                <p style={{ color: 'var(--text2)', fontSize: 14, lineHeight: 1.8, whiteSpace: 'pre-wrap' }}>{selectedDoc.content || '내용 없음'}</p>
              </div>
            ) : (
              <div style={{ flex: 1, color: 'var(--text3)', fontSize: 13, paddingTop: 8 }}>문서를 선택하세요</div>
            )}
          </div>
        )}

        {/* 복선 탭 */}
        {activeTab === 'foreshadow' && (
          <div>
            {foreshadows.length === 0 ? (
              <div style={{ color: 'var(--text3)', textAlign: 'center', padding: 60, fontSize: 13 }}>복선이 없어요</div>
            ) : (
              <>
                {foreshadows.filter(f => !(f.resolved ?? !!f.resolvedEp)).length > 0 && (
                  <div style={{ marginBottom: 24 }}>
                    <div style={{ fontSize: 10, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>미회수</div>
                    {foreshadows.filter(f => !(f.resolved ?? !!f.resolvedEp)).map(fs => <FSRow key={fs.id} fs={fs} characters={characters} />)}
                  </div>
                )}
                {foreshadows.filter(f => f.resolved ?? !!f.resolvedEp).length > 0 && (
                  <div>
                    <div style={{ fontSize: 10, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>회수 완료</div>
                    {foreshadows.filter(f => f.resolved ?? !!f.resolvedEp).map(fs => <FSRow key={fs.id} fs={fs} characters={characters} />)}
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* 타임라인 탭 */}
        {activeTab === 'timeline' && (
          <div style={{ paddingLeft: 28, position: 'relative' }}>
            <div style={{ position: 'absolute', left: 6, top: 8, bottom: 8, width: 1, background: 'var(--border2)' }} />
            {events.length === 0 && <div style={{ color: 'var(--text3)', fontSize: 13 }}>타임라인이 없어요</div>}
            {events.map(ev => {
              const TYPE_COLORS = {
                event: { color: '#a89cf8', label: '사건' },
                foreshadow_plant: { color: '#f59e0b', label: '복선 심기' },
                foreshadow_resolve: { color: '#4ade80', label: '복선 회수' },
                character: { color: '#2dd4bf', label: '캐릭터 등장' },
                twist: { color: '#f87171', label: '반전' },
              };
              const tc = TYPE_COLORS[ev.type] || TYPE_COLORS.event;
              const linkedChars = characters.filter(c => ev.charIds?.includes(c.id));
              return (
                <div key={ev.id} style={{ position: 'relative', marginBottom: 14 }}>
                  <div style={{ position: 'absolute', left: -22, top: 14, width: 10, height: 10, borderRadius: '50%', background: tc.color, border: '2px solid var(--bg)' }} />
                  <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '10px 14px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: ev.description ? 6 : 0 }}>
                      <span style={{ fontSize: 11, color: 'var(--text3)', minWidth: 32 }}>{ev.episode}화</span>
                      <span className="tag" style={{ background: `${tc.color}18`, color: tc.color, fontSize: 10 }}>{tc.label}</span>
                      <span style={{ fontSize: 13, fontWeight: 500 }}>{ev.title}</span>
                    </div>
                    {ev.description && <p style={{ fontSize: 12, color: 'var(--text2)', lineHeight: 1.6 }}>{ev.description}</p>}
                    {linkedChars.length > 0 && (
                      <div style={{ marginTop: 8, display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                        {linkedChars.map(c => { const ac = getAvatarColor(c.name); return <span key={c.id} className="tag" style={{ background: ac.bg, color: ac.color, fontSize: 10 }}>{c.name}</span>; })}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}

function CharDetail({ char, foreshadows, onBack }) {
  const ac = getAvatarColor(char.name || '?');
  const charFS = foreshadows.filter(f => f.charIds?.includes(char.id));
  return (
    <div>
      <button className="btn btn-ghost" style={{ fontSize: 12, marginBottom: 16 }} onClick={onBack}>← 목록</button>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 24, paddingBottom: 20, borderBottom: '1px solid var(--border)' }}>
        <div style={{ width: 56, height: 56, borderRadius: '50%', background: ac.bg, color: ac.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-serif)', fontSize: 24, flexShrink: 0 }}>{char.name?.[0]}</div>
        <div>
          <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: 24 }}>{char.name}</h2>
          <div style={{ color: 'var(--text3)', fontSize: 13 }}>{char.role}</div>
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 20 }}>
        {(char.age || char.affiliation || char.ability) && (
          <Section title="기본 설정">
            {char.age && <Row label="나이" value={char.age} />}
            {char.affiliation && <Row label="소속" value={char.affiliation} />}
            {char.ability && <Row label="능력" value={char.ability} />}
          </Section>
        )}
        {char.description && (
          <Section title="인물 소개">
            <p style={{ color: 'var(--text2)', fontSize: 13, lineHeight: 1.7 }}>{char.description}</p>
          </Section>
        )}
        {char.tags?.length > 0 && (
          <Section title="성격 태그">
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
              {char.tags.map((t, i) => <span key={i} className="tag" style={{ background: 'var(--bg4)', color: 'var(--text2)' }}>{t}</span>)}
            </div>
          </Section>
        )}
        {charFS.length > 0 && (
          <Section title="연결된 복선">
            {charFS.map(fs => (
              <div key={fs.id} style={{ background: 'var(--bg3)', borderRadius: 8, padding: '8px 10px', marginBottom: 6 }}>
                <div style={{ fontSize: 13 }}>{fs.title}</div>
                <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>
                  {fs.plantedEp && `${fs.plantedEp}화 심음`}{fs.plantedEp && ' → '}{fs.resolvedEp ? `${fs.resolvedEp}화 회수` : '미회수'}
                </div>
              </div>
            ))}
          </Section>
        )}
      </div>
    </div>
  );
}

function FSRow({ fs, characters }) {
  const linked = characters.filter(c => fs.charIds?.includes(c.id));
  return (
    <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '10px 14px', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 12 }}>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 13, fontWeight: 500 }}>{fs.title}</div>
        <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 3 }}>{fs.plantedEp && `${fs.plantedEp} 심음`}{fs.plantedEp && ' → '}{fs.resolvedEp ? `${fs.resolvedEp} 회수` : '미회수'}</div>
        {linked.length > 0 && (
          <div style={{ marginTop: 6, display: 'flex', gap: 4, flexWrap: 'wrap' }}>
            {linked.map(c => { const ac = getAvatarColor(c.name); return <span key={c.id} className="tag" style={{ background: ac.bg, color: ac.color, fontSize: 10 }}>{c.name}</span>; })}
          </div>
        )}
      </div>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ fontSize: 10, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10, fontWeight: 500 }}>{title}</div>
      {children}
    </div>
  );
}

function Row({ label, value }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 8 }}>
      <span style={{ color: 'var(--text3)' }}>{label}</span>
      <span style={{ color: 'var(--text2)' }}>{value}</span>
    </div>
  );
}

function LogoMark() {
  return (
    <svg width="22" height="22" viewBox="0 0 48 48" fill="none">
      <circle cx="24" cy="24" r="22" stroke="var(--accent)" strokeWidth="1.5" strokeDasharray="4 3" opacity="0.7" />
      <circle cx="24" cy="24" r="3" fill="var(--accent)" />
      <circle cx="11" cy="15" r="2" fill="var(--accent)" opacity="0.5" />
      <circle cx="37" cy="15" r="2" fill="var(--accent)" opacity="0.5" />
      <circle cx="11" cy="33" r="2" fill="var(--accent)" opacity="0.5" />
      <circle cx="37" cy="33" r="2" fill="var(--accent)" opacity="0.5" />
      <line x1="24" y1="24" x2="11" y2="15" stroke="var(--accent)" strokeWidth="1" opacity="0.4" />
      <line x1="24" y1="24" x2="37" y2="15" stroke="var(--accent)" strokeWidth="1" opacity="0.4" />
      <line x1="24" y1="24" x2="11" y2="33" stroke="var(--accent)" strokeWidth="1" opacity="0.4" />
      <line x1="24" y1="24" x2="37" y2="33" stroke="var(--accent)" strokeWidth="1" opacity="0.4" />
    </svg>
  );
}
