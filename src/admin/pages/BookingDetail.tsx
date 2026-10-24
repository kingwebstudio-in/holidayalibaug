import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Mail, MessageCircle, Phone } from 'lucide-react';
import { adminApi } from '../../services/adminApi';
import { ApiError } from '../../services/api';
import { useAuth } from '../AuthContext';
import { BOOKING_STATUSES, type AdminBooking, type BookingStatus } from '../../types';
import { Card, Dialog, ErrorBox, PageTitle, Spinner, StatusBadge, btnGhost, btnPrimary, fmtDate, fmtDateTime, inputCls, useAsync } from '../ui';

const digits = (s: string) => s.replace(/[^0-9]/g, '');
const customerWa = (phone: string) => {
  const d = digits(phone);
  return `https://wa.me/${d.length === 10 ? `91${d}` : d}`; // bare 10-digit Indian mobiles get the +91 country code
};

export const BookingDetailPage: React.FC = () => {
  const { id = '' } = useParams();
  const { admin } = useAuth();
  const { data, loading, error, reload } = useAsync(() => adminApi.booking(id), [id]);
  const [b, setB] = useState<AdminBooking | null>(null);
  const [status, setStatus] = useState<BookingStatus>('Pending');
  const [notes, setNotes] = useState('');
  const [villaId, setVillaId] = useState('');
  const villas = useAsync(() => adminApi.villaOptions(), []);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [attest, setAttest] = useState(false);
  const [overlap, setOverlap] = useState<string | null>(null);

  useEffect(() => { if (data) { setB(data); setStatus(data.status); setNotes(data.internalNotes); setVillaId(data.villaId ?? ''); } }, [data]);

  const save = async (extra: { availabilityChecked?: boolean; allowOverlap?: boolean } = {}) => {
    if (!b || saving) return;
    setSaving(true); setMsg(null);
    try {
      const updated = await adminApi.updateBooking(b.id, { status: status !== b.status ? status : undefined, internalNotes: notes !== b.internalNotes ? notes : undefined, villaId: villaId && villaId !== b.villaId ? villaId : undefined, ...extra });
      setB(updated); setStatus(updated.status); setNotes(updated.internalNotes); setVillaId(updated.villaId ?? '');
      setConfirmOpen(false); setAttest(false); setOverlap(null);
      setMsg({ ok: true, text: 'Saved.' });
    } catch (e) {
      if (e instanceof ApiError && e.status === 409) { setOverlap(e.message); }
      else { setMsg({ ok: false, text: e instanceof ApiError ? e.message : 'Could not save.' }); setConfirmOpen(false); }
    } finally { setSaving(false); }
  };

  const onSave = () => {
    if (!b) return;
    if (status === 'Confirmed' && b.status !== 'Confirmed') { setConfirmOpen(true); return; }
    if (status === 'Cancelled' && b.status !== 'Cancelled' && !window.confirm('Mark this enquiry as Cancelled?')) return;
    save();
  };

  if (loading && !b) return <Spinner />;
  if (error) return <ErrorBox error={error} onRetry={reload} />;
  if (!b) return null;
  const dirty = status !== b.status || notes !== b.internalNotes || (villaId !== '' && villaId !== (b.villaId ?? ''));
  const row = (k: string, v: React.ReactNode) => (<div className="py-2 border-b border-stone-100 last:border-0 grid grid-cols-3 gap-2 text-sm"><dt className="text-stone-500">{k}</dt><dd className="col-span-2 break-words">{v || <span className="text-stone-400">—</span>}</dd></div>);

  return (
    <>
      <Link to="/admin/bookings" className="inline-flex items-center gap-1 text-sm text-stone-600 hover:text-stone-900 mb-3"><ArrowLeft className="w-4 h-4" />All enquiries</Link>
      <PageTitle title={b.reference} sub={`Submitted ${fmtDateTime(b.createdAt)} · Updated ${fmtDateTime(b.updatedAt)}`} actions={<StatusBadge status={b.status} />} />
      <div className="grid lg:grid-cols-2 gap-4">
        <Card title="Enquiry">
          <dl>
            {row('Villa', b.villaName)}{row('Check-in', fmtDate(b.checkIn))}{row('Check-out', fmtDate(b.checkOut))}
            {row('Guests', `${b.adults} adult${b.adults === 1 ? '' : 's'}${b.children ? `, ${b.children} child${b.children === 1 ? '' : 'ren'}` : ''}`)}
            {row('Message', b.message && <span className="whitespace-pre-line">{b.message}</span>)}
            {row('E-mail alert', b.notificationStatus === 'sent' ? 'Sent to the business inbox' : b.notificationStatus === 'failed' ? 'Failed to send' : 'Not configured (enquiry saved in database)')}
          </dl>
        </Card>
        <Card title="Customer">
          <dl>{row('Name', b.customerName)}{row('Phone', b.phone)}{row('E-mail', b.email)}</dl>
          <div className="flex flex-wrap gap-2 mt-4">
            <a className={btnGhost} href={`tel:${b.phone}`}><Phone className="w-4 h-4" />Call</a>
            <a className={btnGhost} href={customerWa(b.phone)} target="_blank" rel="noopener noreferrer"><MessageCircle className="w-4 h-4" />WhatsApp</a>
            {b.email && <a className={btnGhost} href={`mailto:${b.email}?subject=${encodeURIComponent(`Your villa enquiry ${b.reference}`)}`}><Mail className="w-4 h-4" />E-mail</a>}
          </div>
        </Card>
        <Card title="Status & private notes" className="lg:col-span-2">
          <label className="block mb-4 max-w-md"><span className="block text-xs font-semibold text-stone-600 mb-1">Assigned villa</span>
            <select className={inputCls} value={villaId} onChange={(e) => setVillaId(e.target.value)} data-testid="villa-select" aria-label="Assigned villa">
              {!b.villaId && <option value="">Any villa — assign one before confirming</option>}
              {villas.data?.map((v) => <option key={v.id} value={v.id}>{v.name}{v.isPublished ? '' : ' (draft)'}{v.isDemo ? ' (demo)' : ''}</option>)}
            </select>
          </label>
          {msg && <div role={msg.ok ? 'status' : 'alert'} className={`mb-3 p-2.5 text-sm rounded-md border ${msg.ok ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-rose-50 border-rose-200 text-rose-800'}`}>{msg.text}</div>}
          <div className="grid md:grid-cols-3 gap-4">
            <label className="block"><span className="block text-xs font-semibold text-stone-600 mb-1">Status</span>
              <select className={inputCls} value={status} onChange={(e) => setStatus(e.target.value as BookingStatus)}>
                {BOOKING_STATUSES.map((s) => <option key={s} disabled={s === 'Confirmed' && admin?.role === 'staff'}>{s}</option>)}
              </select>
              <span className="block text-[11px] text-stone-500 mt-1">“Confirmed” means you checked real availability and agreed the stay with the guest.</span>
            </label>
            <label className="block md:col-span-2"><span className="block text-xs font-semibold text-stone-600 mb-1">Internal notes (never shown to the guest)</span>
              <textarea className={`${inputCls} min-h-[96px]`} maxLength={5000} value={notes} onChange={(e) => setNotes(e.target.value)} />
            </label>
          </div>
          <div className="mt-4 flex justify-end"><button className={btnPrimary} onClick={onSave} disabled={!dirty || saving}>{saving ? 'Saving…' : 'Save changes'}</button></div>
        </Card>
      </div>

      {confirmOpen && (
        <Dialog title="Confirm this booking?" onClose={() => { setConfirmOpen(false); setOverlap(null); }}>
          <p className="text-sm text-stone-700 mb-3">You are about to mark <strong>{b.reference}</strong> ({b.villaName}, {fmtDate(b.checkIn)} – {fmtDate(b.checkOut)}) as <strong>Confirmed</strong>.</p>
          {overlap && <div role="alert" className="mb-3 p-2.5 text-sm rounded-md bg-amber-50 border border-amber-300 text-amber-900">{overlap}</div>}
          <label className="flex items-start gap-2 text-sm mb-4"><input type="checkbox" className="mt-1" checked={attest} onChange={(e) => setAttest(e.target.checked)} autoFocus />I have checked the villa’s actual availability for these dates and agreed them with the guest.</label>
          <div className="flex justify-end gap-2">
            <button className={btnGhost} onClick={() => { setConfirmOpen(false); setOverlap(null); }}>Cancel</button>
            <button className={btnPrimary} disabled={!attest || saving} onClick={() => save({ availabilityChecked: true, allowOverlap: !!overlap })}>{overlap ? 'Confirm anyway' : 'Confirm booking'}</button>
          </div>
        </Dialog>
      )}
    </>
  );
};
