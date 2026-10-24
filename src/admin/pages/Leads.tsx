import React, { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Mail, MessageCircle, Phone, Search } from 'lucide-react';
import { adminApi } from '../../services/adminApi';
import { ApiError } from '../../services/api';
import { LEAD_STATUSES, type AdminInvestmentEnquiry, type AdminOwnerEnquiry, type LeadStatus } from '../../types';
import { Card, Empty, ErrorBox, PageTitle, Pagination, Spinner, StatusBadge, btnGhost, btnPrimary, fmtDateTime, inputCls, useAsync, useDebounced } from '../ui';

type Lead = AdminOwnerEnquiry | AdminInvestmentEnquiry;
const waLink = (phone: string) => { const d = phone.replace(/[^0-9]/g, ''); return `https://wa.me/${d.length === 10 ? `91${d}` : d}`; };

const LeadRow: React.FC<{ lead: Lead; title: string; lines: [string, React.ReactNode][]; onSave: (id: string, patch: { status?: string; internalNotes?: string }) => Promise<Lead> }> = ({ lead, title, lines, onSave }) => {
  const [open, setOpen] = useState(false);
  const [cur, setCur] = useState(lead);
  const [status, setStatus] = useState<LeadStatus>(lead.status);
  const [notes, setNotes] = useState(lead.internalNotes);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const dirty = status !== cur.status || notes !== cur.internalNotes;
  const save = async () => {
    setBusy(true); setMsg(null);
    try { const u = await onSave(cur.id, { status: status !== cur.status ? status : undefined, internalNotes: notes !== cur.internalNotes ? notes : undefined }); setCur(u); setMsg('Saved.'); }
    catch (e) { setMsg(e instanceof ApiError ? e.message : 'Could not save.'); }
    finally { setBusy(false); }
  };
  return (
    <li className="border border-stone-200 rounded-lg bg-white">
      <button className="w-full text-left p-3 flex flex-wrap items-center justify-between gap-2" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
        <div><div className="font-semibold">{title}</div><div className="text-xs text-stone-500"><span className="font-mono">{cur.reference}</span> · {fmtDateTime(cur.createdAt)}</div></div>
        <StatusBadge status={cur.status} />
      </button>
      {open && (
        <div className="px-3 pb-3 border-t border-stone-100 pt-3 space-y-3">
          <dl className="grid sm:grid-cols-2 gap-x-6 gap-y-1.5 text-sm">{lines.map(([k, v]) => <div key={k} className="flex gap-2"><dt className="text-stone-500 w-32 shrink-0">{k}</dt><dd className="break-words min-w-0">{v || <span className="text-stone-400">—</span>}</dd></div>)}</dl>
          <div className="flex flex-wrap gap-2">
            <a className={btnGhost} href={`tel:${cur.phone}`}><Phone className="w-4 h-4" />Call</a>
            <a className={btnGhost} href={waLink(cur.phone)} target="_blank" rel="noopener noreferrer"><MessageCircle className="w-4 h-4" />WhatsApp</a>
            {cur.email && <a className={btnGhost} href={`mailto:${cur.email}`}><Mail className="w-4 h-4" />E-mail</a>}
          </div>
          <div className="grid md:grid-cols-3 gap-3">
            <label className="block"><span className="block text-xs font-semibold text-stone-600 mb-1">Status</span>
              <select className={inputCls} value={status} onChange={(e) => setStatus(e.target.value as LeadStatus)}>{LEAD_STATUSES.map((s) => <option key={s}>{s}</option>)}</select></label>
            <label className="block md:col-span-2"><span className="block text-xs font-semibold text-stone-600 mb-1">Internal notes</span>
              <textarea className={`${inputCls} min-h-[72px]`} maxLength={5000} value={notes} onChange={(e) => setNotes(e.target.value)} /></label>
          </div>
          <div className="flex items-center justify-end gap-3">{msg && <span role="status" className="text-sm text-stone-600">{msg}</span>}<button className={btnPrimary} disabled={!dirty || busy} onClick={save}>{busy ? 'Saving…' : 'Save'}</button></div>
        </div>
      )}
    </li>
  );
};

function LeadsPage<T extends Lead>({ title, sub, load, save, render }: {
  title: string; sub: string;
  load: (f: { q?: string; status?: string; page?: number }) => Promise<{ items: T[]; meta: { total: number; page: number; totalPages: number } }>;
  save: (id: string, patch: { status?: string; internalNotes?: string }) => Promise<Lead>;
  render: (l: T) => { title: string; lines: [string, React.ReactNode][] };
}) {
  const [sp, setSp] = useSearchParams();
  const [q, setQ] = useState('');
  const dq = useDebounced(q);
  const status = sp.get('status') ?? '';
  const page = Number(sp.get('page') ?? 1) || 1;
  const { data, loading, error, reload } = useAsync(() => load({ q: dq, status, page }), [dq, status, page]);
  const set = (k: string, v: string) => { const n = new URLSearchParams(sp); v ? n.set(k, v) : n.delete(k); if (k !== 'page') n.delete('page'); setSp(n, { replace: true }); };
  return (
    <>
      <PageTitle title={title} sub={sub} />
      <Card className="mb-4">
        <div className="grid sm:grid-cols-3 gap-3">
          <div className="relative sm:col-span-2"><Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" /><input className={`${inputCls} pl-9`} placeholder="Search name, location, phone or reference" aria-label="Search" value={q} onChange={(e) => { setQ(e.target.value); set('page', ''); }} /></div>
          <select className={inputCls} aria-label="Filter by status" value={status} onChange={(e) => set('status', e.target.value)}><option value="">All statuses</option>{LEAD_STATUSES.map((s) => <option key={s}>{s}</option>)}</select>
        </div>
      </Card>
      {loading && !data && <Spinner />}
      {!!error && <ErrorBox error={error} onRetry={reload} />}
      {data && (data.items.length === 0 ? <Card><Empty>No enquiries found.</Empty></Card> : (
        <>
          <ul className="space-y-2">{data.items.map((l) => { const r = render(l); return <LeadRow key={l.id} lead={l} title={r.title} lines={r.lines} onSave={save} />; })}</ul>
          <Pagination page={data.meta.page} totalPages={data.meta.totalPages} total={data.meta.total} onPage={(p) => set('page', String(p))} />
        </>
      ))}
    </>
  );
}

export const OwnerEnquiriesPage: React.FC = () => (
  <LeadsPage<AdminOwnerEnquiry>
    title="Villa-owner enquiries" sub="Owners asking to list their villa."
    load={adminApi.owners} save={adminApi.updateOwner}
    render={(l) => ({ title: `${l.ownerName} — ${l.villaName}`, lines: [['Phone', l.phone], ['E-mail', l.email], ['Villa', l.villaName], ['Location', l.propertyLocation], ['Details', l.propertyDetails && <span className="whitespace-pre-line">{l.propertyDetails}</span>]] })}
  />
);
export const InvestmentEnquiriesPage: React.FC = () => (
  <LeadsPage<AdminInvestmentEnquiry>
    title="Property-investment enquiries" sub="People looking to invest in Alibaug property."
    load={adminApi.investments} save={adminApi.updateInvestment}
    render={(l) => ({ title: `${l.customerName} — ${l.preferredLocation}`, lines: [['Phone', l.phone], ['E-mail', l.email], ['Location', l.preferredLocation], ['Budget', l.budgetRange], ['Property type', l.propertyType], ['Requirements', l.requirements && <span className="whitespace-pre-line">{l.requirements}</span>]] })}
  />
);
