import React, { useState } from 'react';
import { adminApi } from '../../services/adminApi';
import { ApiError } from '../../services/api';
import { useAuth } from '../AuthContext';
import { Card, Field, PageTitle, btnPrimary, inputCls } from '../ui';

export const AccountPage: React.FC = () => {
  const { admin, logout } = useAuth();
  const [cur, setCur] = useState('');
  const [next, setNext] = useState('');
  const [again, setAgain] = useState('');
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (next !== again) { setMsg({ ok: false, text: 'The new passwords do not match.' }); return; }
    setBusy(true); setMsg(null);
    try {
      await adminApi.changePassword(cur, next);
      setCur(''); setNext(''); setAgain('');
      setMsg({ ok: true, text: 'Password changed. Other devices have been signed out.' });
    } catch (err) {
      const d = err instanceof ApiError ? Object.values(err.fieldErrors)[0] : null;
      setMsg({ ok: false, text: d ?? (err instanceof ApiError ? err.message : 'Could not change password.') });
    } finally { setBusy(false); }
  };

  return (
    <>
      <PageTitle title="Account & security" />
      <div className="grid lg:grid-cols-2 gap-4">
        <Card title="Signed in as">
          <dl className="text-sm space-y-1"><div><dt className="inline text-stone-500">Name: </dt><dd className="inline">{admin?.name}</dd></div><div><dt className="inline text-stone-500">E-mail: </dt><dd className="inline">{admin?.email}</dd></div><div><dt className="inline text-stone-500">Role: </dt><dd className="inline capitalize">{admin?.role}</dd></div></dl>
          <button className="mt-4 text-sm font-medium text-rose-700 hover:underline" onClick={() => logout()}>Log out</button>
        </Card>
        <Card title="Change password">
          <form onSubmit={submit} className="space-y-3">
            {msg && <div role={msg.ok ? 'status' : 'alert'} className={`p-3 text-sm rounded-md border ${msg.ok ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-rose-50 border-rose-200 text-rose-800'}`}>{msg.text}</div>}
            <Field label="Current password"><input className={inputCls} type="password" autoComplete="current-password" required value={cur} onChange={(e) => setCur(e.target.value)} /></Field>
            <Field label="New password" hint="At least 12 characters, with letters and numbers."><input className={inputCls} type="password" autoComplete="new-password" required minLength={12} value={next} onChange={(e) => setNext(e.target.value)} /></Field>
            <Field label="Repeat new password"><input className={inputCls} type="password" autoComplete="new-password" required value={again} onChange={(e) => setAgain(e.target.value)} /></Field>
            <button className={btnPrimary} disabled={busy}>{busy ? 'Saving…' : 'Change password'}</button>
          </form>
        </Card>
      </div>
    </>
  );
};
