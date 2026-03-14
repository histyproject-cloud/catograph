import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from './firebase';
import Dashboard from './pages/Dashboard';
import Project from './pages/Project';
import Login from './pages/Login';
import SharedView from './pages/SharedView';
import './styles/global.css';

export default function App() {
  const [user, setUser] = useState(undefined);

  useEffect(() => {
    return onAuthStateChanged(auth, u => setUser(u));
  }, []);

  if (user === undefined) return (
    <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: 28, height: 28, border: '2px solid var(--accent)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={user ? <Navigate to="/" /> : <Login />} />
        <Route path="/" element={user ? <Dashboard user={user} /> : <Navigate to="/login" />} />
        <Route path="/project/:id" element={user ? <Project user={user} /> : <Navigate to="/login" />} />
        {/* 공유 링크 - 로그인 없이 접근 가능 */}
        <Route path="/shared/:id" element={<SharedView />} />
      </Routes>
    </BrowserRouter>
  );
}
