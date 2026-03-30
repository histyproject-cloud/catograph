import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from './firebase';
import Dashboard from './pages/Dashboard';
import Project from './pages/Project';
import Login from './pages/Login';
import SharedView from './pages/SharedView';
import Legal from './pages/Legal';
import Pricing from './pages/Pricing';
import OnboardingModal from './components/OnboardingModal';
import './styles/global.css';

export default function App() {
  const [user, setUser] = useState(undefined);
  const [showOnboarding, setShowOnboarding] = useState(false);

  useEffect(() => {
    return onAuthStateChanged(auth, async (u) => {
      if (u) {
        // Firestore에서 유저 데이터 (subscription 등) 불러와서 합치기
        const userDoc = await getDoc(doc(db, 'users', u.uid));
        const userData = userDoc.exists() ? userDoc.data() : {};
        setUser({ ...u, ...userData });
        if (!userData?.onboardingDone) {
          setShowOnboarding(true);
        }
      } else {
        setUser(null);
      }
    });
  }, []);

  const handleOnboardingComplete = async () => {
    if (!user) return;
    await setDoc(doc(db, 'users', user.uid), {
      onboardingDone: true,
      onboardingDoneAt: serverTimestamp(),
    }, { merge: true });
    setShowOnboarding(false);
  };

  if (user === undefined) return (
    <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: 28, height: 28, border: '2px solid var(--accent)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  return (
    <BrowserRouter>
      {/* 온보딩: 로그인한 유저에게만 표시 */}
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
      </Routes>
    </BrowserRouter>
  );
}
