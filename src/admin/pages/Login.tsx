import React, { useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useAuth } from '../AuthContext';
import { ApiError } from '../../services/api';
import { Field, inputCls } from '../ui';

export const LoginPage: React.FC = () => {
  const { admin, loading, login } = useAuth();
  const nav = useNavigate();
  const loc = useLocation() as { state?: { from?: string } };
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (!loading && admin) return <Navigate to={loc.state?.from?.startsWith('/admin') ? loc.state.from : '/admin'} replace />;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      await login(email, password);
      nav(loc.state?.from?.startsWith('/admin') ? loc.state.from : '/admin', { replace: true });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not sign in. Please try again.');
      setPassword('');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-dvh bg-[#062722] flex items-center justify-center p-4 font-sans">
      <form onSubmit={submit} className="w-full max-w-sm bg-white rounded-xl shadow-2xl p-6 sm:p-8 space-y-4" aria-labelledby="login-title">
        <div className="text-center mb-2">
          <div className="font-editorial text-3xl font-semibold text-[#092D28]">Holiday<span className="text-[#B58B35]">Alibag</span></div>
          <h1 id="login-title" className="text-sm text-stone-500 mt-1">Admin sign-in</h1>
        </div>
        {error && <div role="alert" className="p-3 text-sm rounded-md bg-rose-50 border border-rose-200 text-rose-800">{error}</div>}
        <Field label="E-mail"><input className={inputCls} type="email" autoComplete="username" required value={email} onChange={(e) => setEmail(e.target.value)} /></Field>
        <Field label="Password"><input className={inputCls} type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} /></Field>
        <button type="submit" disabled={busy} className="w-full py-2.5 text-sm font-semibold rounded-md bg-[#092D28] text-white hover:bg-[#123B33] disabled:opacity-60 flex items-center justify-center gap-2">
          {busy && <Loader2 className="w-4 h-4 animate-spin" />}Sign in
        </button>
        <a href="/" className="block text-center text-xs text-stone-500 hover:text-stone-800">← Back to website</a>
      </form>
    </div>
  );
};
