import React, { useState } from 'react';
import { Trash2 } from 'lucide-react';
import { adminApi } from '../../services/adminApi';
import { ApiError } from '../../services/api';
import { useAuth } from '../AuthContext';
import type { AdminTestimonial } from '../../types';
import { Card, Empty, ErrorBox, Field, PageTitle, Spinner, btnGhost, btnPrimary, inputCls, useAsync } from '../ui';

const blank = { quote: '', guestName: '', city: '', villaName: '', rating: 5, isApproved: false, displayOrder: 0 };

export const TestimonialsPage: React.FC = () => {
  const { canEdit } = useAuth();
  const { data, loading, error, reload } = useAsync(() => adminApi.testimonials(), []);
  const [f, setF] = useState(blank);
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const act = async (fn: () => Promise<unknown>, ok?: string) => {
    setBusy(true); setMsg(null);
    try { await fn(); if (ok) setMsg(ok); reload(); } catch (e) { setMsg(e instanceof ApiError ? e.message : 'Could not save.'); } finally { setBusy(false); }
  };
  const toPayload = (t: typeof blank | AdminTestimonial) => ({ quote: t.quote, guestName: t.guestName, city: t.city || null, villaName: t.villaName || null, rating: t.rating, isApproved: t.isApproved, displayOrder: t.displayOrder });

  return (
    <>
      <PageTitle title="Testimonials" sub="Only genuine guest feedback you have permission to publish. Nothing shows on the website until approved." />
      {msg && <div role="status" className="mb-3 p-3 text-sm rounded-md bg-stone-100 border border-stone-200">{msg}</div>}
      {canEdit && (
        <Card title="Add testimonial" className="mb-4">
          <form className="grid sm:grid-cols-2 gap-3" onSubmit={(e) => { e.preventDefault(); act(async () => { await adminApi.createTestimonial(toPayload(f)); setF(blank); }, 'Testimonial added.'); }}>
            <Field label="Quote *" className="sm:col-span-2"><textarea className={inputCls} rows={3} maxLength={1000} required value={f.quote} onChange={(e) => setF({ ...f, quote: e.target.value })} /></Field>
            <Field label="Guest name *"><input className={inputCls} required value={f.guestName} onChange={(e) => setF({ ...f, guestName: e.target.value })} /></Field>
            <Field label="City"><input className={inputCls} value={f.city} onChange={(e) => setF({ ...f, city: e.target.value })} /></Field>
            <Field label="Villa stayed at"><input className={inputCls} value={f.villaName} onChange={(e) => setF({ ...f, villaName: e.target.value })} /></Field>
            <label className="flex items-center gap-2 text-sm pt-5"><input type="checkbox" checked={f.isApproved} onChange={(e) => setF({ ...f, isApproved: e.target.checked })} />Approved for the website</label>
            <div className="sm:col-span-2 flex justify-end"><button className={btnPrimary} disabled={busy}>Add</button></div>
          </form>
        </Card>
      )}
      {loading && !data && <Spinner />}
      {!!error && <ErrorBox error={error} onRetry={reload} />}
      {data && (data.length === 0 ? <Card><Empty>No testimonials yet. The website hides the reviews section until you approve at least one.</Empty></Card> : (
        <ul className="space-y-2">{data.map((t) => (
          <li key={t.id} className="bg-white border border-stone-200 rounded-lg p-3 flex flex-wrap gap-3 items-start justify-between">
            <div className="min-w-0 flex-1"><p className="text-sm italic break-words">“{t.quote}”</p><p className="text-xs text-stone-500 mt-1">{t.guestName}{t.city ? `, ${t.city}` : ''}{t.villaName ? ` · ${t.villaName}` : ''}</p></div>
            {canEdit && <div className="flex items-center gap-2">
              <button className={btnGhost} disabled={busy} onClick={() => act(() => adminApi.updateTestimonial(t.id, { ...toPayload(t), isApproved: !t.isApproved }))}>{t.isApproved ? 'Unapprove' : 'Approve'}</button>
              <button className={btnGhost} aria-label="Delete testimonial" disabled={busy} onClick={() => window.confirm('Delete this testimonial?') && act(() => adminApi.deleteTestimonial(t.id), 'Deleted.')}><Trash2 className="w-4 h-4" /></button>
            </div>}
            <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${t.isApproved ? 'bg-emerald-100 border-emerald-300 text-emerald-900' : 'bg-stone-100 border-stone-300 text-stone-600'}`}>{t.isApproved ? 'Live' : 'Hidden'}</span>
          </li>))}</ul>
      ))}
    </>
  );
};
