import { useEffect, useState } from 'react';
import { LoginPage } from '@/screens/Auth/Login/LoginPage';
import { authenticateDemo, readDemoSession, saveDemoSession } from '@/lib/demo-auth';

// Release-only adapter. Application sources and backend authentication stay intact.
export function DemoAccess({ children }) {
  const [account, setAccount] = useState(null);
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    try { setAccount(readDemoSession(window.sessionStorage)); } catch { /* Storage can be disabled. */ }
    setReady(true);
  }, []);
  function updateSession(next) {
    try { saveDemoSession(window.sessionStorage, next); } catch { /* Memory-only session. */ }
    setAccount(next);
  }
  async function login(email, password) {
    setLoading(true);
    try {
      const next = authenticateDemo(email, password);
      if (!next) throw new Error('Email hoặc mật khẩu không chính xác.');
      updateSession(next);
    } finally { setLoading(false); }
  }
  if (!ready) return <output>Đang mở không gian làm việc…</output>;
  if (account) return children(account, () => updateSession(null));
  return <LoginPage loading={loading} onLogin={login} />;
}
