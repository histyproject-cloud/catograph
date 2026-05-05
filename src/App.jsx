import React, { useState, useEffect, useRef } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, setDoc, onSnapshot, serverTimestamp } from 'firebase/firestore';
import { auth, db } from './firebase';
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
