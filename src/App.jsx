import React, { useState, useEffect, useRef } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, setDoc, onSnapshot, serverTimestamp } from 'firebase/firestore';
import { auth, db, app } from './firebase';
import { getFunctions, httpsCallable } from 'firebase/functions';
import Dashboard from './pages/Dashboard';
import Project from './pages/Project';
import Login from './pages/Login';
import SharedView from './pages/SharedView';
import Legal from './pages/Legal';
import Pricing from './pages/Pricing';
import Settings from './pages/Settings';
import OnboardingModal from './components/OnboardingModal';
import ConsentModal from './components/ConsentModal';
import ErrorBoundary from './components/ErrorBoundary';
import './styles/global.css';
import NotFound from './pages/NotFound';
import PaymentSuccess from './pages/PaymentSuccess';
import PaymentFail from './pages/PaymentFail';

const CONSENT_VERSION = '2026-04-01';

export default function App() {
  const [user, setUser] = useState(undefined);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showConsent, setShowConsent] = useState(false);
  const [showEduWelcome, setShowEduWelcome] = useState(false);
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'dark');
  const authUserRef = useRef(null); // Firebase Auth 유저 객체 보관 (onSnapshot 콜백에서 사용)

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => setTheme(t => t === 'dark' ? 'light' : 'dark');

  useEffect(() => {
    let unsubFirestore = null;

    const unsubAuth = onAuthStateChanged(auth, async (u) => {
      // 이전 Firestore 리스너 정리
      if (unsubFirestore) { unsubFirestore(); unsubFirestore = null; }

      if (u) {
        authUserRef.current = u;

        // 문서 없으면 기본 문서 생성
        const userDocSnap = await getDoc(doc(db, 'users', u.uid));
        if (!userDocSnap.exists()) {
          await setDoc(doc(db, 'users', u.uid), {
            createdAt: serverTimestamp(),
            email: u.email || '',
            displayName: u.displayName || '',
          });
          // 대학 이메일(.ac.kr / .edu) 신규 가입 → 3개월 무료 자동 적용
          const email = (u.email || '').toLowerCase();
          if (email.endsWith('.ac.kr') || email.endsWith('.edu')) {
            try {
              const functions = getFunctions(app, 'asia-northeast3');
              const applyEduTrial = httpsCallable(functions, 'applyEduTrial');
              await applyEduTrial();
              setShowEduWelcome(true);
            } catch (err) {
              console.warn('대학생 무료체험 적용 실패 (무시):', err.message);
            }
          }
        } else if (!userDocSnap.data()?.email && u.email) {
          // 기존 유저 중 email 필드 없는 경우 보완
          await setDoc(doc(db, 'users', u.uid), { email: u.email, displayName: u.displayName || '' }, { merge: true });
        }

        // Firestore 실시간 구독 → 결제/구독 변경 시 user state 자동 갱신
        unsubFirestore = onSnapshot(
          doc(db, 'users', u.uid),
          (snap) => {
            const userData = snap.exists() ? snap.data() : {};
            const currentAuthUser = authUserRef.current;
            if (!currentAuthUser) return;

            setUser((prev) => {
              const next = { ...currentAuthUser, ...userData };
              // 동의/온보딩 모달은 최초 1회만
              if (prev === undefined || prev === null) {
                if (!userData?.consentAt || userData?.consentVersion !== CONSENT_VERSION) setShowConsent(true);
                else if (!userData?.onboardingDone) setShowOnboarding(true);
              }
              return next;
            });
          },
          (err) => { console.error('Firestore 구독 오류:', err); }
        );
      } else {
        authUserRef.current = null;
        setUser(null);
      }
    });

    return () => {
      unsubAuth();
      if (unsubFirestore) unsubFirestore();
    };
  }, []);

  const handleOnboardingComplete = async () => {
    if (!user) return;
    try {
      await setDoc(doc(db, 'users', user.uid), {
        onboardingDone: true,
        onboardingDoneAt: serverTimestamp(),
      }, { merge: true });
    } catch (err) {
      console.error('온보딩 완료 저장 실패:', err);
    } finally {
      setShowOnboarding(false);
    }
  };

  // 공유 링크는 인증 대기 없이 바로 렌더링
  const isSharedRoute = window.location.pathname.startsWith('/shared/');
  if (user === undefined && !isSharedRoute) return (
    <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)' }}>
      <div style={{ width: 28, height: 28, border: '2px solid var(--accent)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  return (
    <ErrorBoundary>
    <BrowserRouter>
      {/* 온보딩: 로그인한 유저에게만 표시 */}
      {user && showConsent && (
        <ConsentModal
          user={user}
          onComplete={async (data) => {
            setShowConsent(false);
            setUser(u => ({ ...u, ...data, consentAt: new Date() }));
            if (!data?.onboardingDone) setShowOnboarding(true);
          }}
        />
      )}
      {user && showOnboarding && (
        <OnboardingModal
          onClose={handleOnboardingComplete}
          onComplete={handleOnboardingComplete}
        />
      )}
      {showEduWelcome && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000, padding: 20 }}>
          <div style={{ background: 'var(--bg2)', border: '1px solid var(--accent)', borderRadius: 'var(--radius-lg)', padding: 36, maxWidth: 380, width: '100%', textAlign: 'center', boxShadow: '0 20px 60px rgba(0,0,0,0.5)' }}>
            <div style={{ fontSize: 40, marginBottom: 16 }}>🎓</div>
            <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--accent)', marginBottom: 8, fontFamily: 'var(--font-serif)' }}>대학생 혜택 적용!</div>
            <div style={{ fontSize: 14, color: 'var(--text2)', lineHeight: 1.7, marginBottom: 24 }}>
              대학 이메일이 확인됐어요.<br />
              <strong style={{ color: 'var(--text)' }}>Pro 플랜 3개월</strong>을 무료로 이용할 수 있어요. ✦
            </div>
            <button
              className="btn btn-primary"
              style={{ width: '100%', height: 44, fontSize: 15, fontWeight: 600 }}
              onClick={() => setShowEduWelcome(false)}
            >
              시작하기
            </button>
          </div>
        </div>
      )}
      <Routes>
        <Route path="/login" element={user ? <Navigate to="/" /> : <Login />} />
        <Route path="/" element={user ? <Dashboard user={user} /> : <Navigate to="/login" />} />
        <Route path="/project/:id" element={user ? <Project user={user} /> : <Navigate to="/login" />} />
        {/* 공유 링크 - 로그인 없이 접근 가능 */}
        <Route path="/shared/:id" element={<SharedView />} />
        <Route path="/legal" element={<Legal />} />
        <Route path="/pricing" element={<Pricing user={user} />} />
        <Route path="/settings" element={user ? <Settings user={user} onShowOnboarding={() => setShowOnboarding(true)} theme={theme} onToggleTheme={toggleTheme} /> : <Navigate to="/login" />} />
        <Route path="/payment/success" element={<PaymentSuccess />} />
        <Route path="/payment/fail" element={<PaymentFail />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
    </ErrorBoundary>
  );
}
