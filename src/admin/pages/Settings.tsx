import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { adminApi } from '../../services/adminApi';
import { ApiError } from '../../services/api';
import { useAuth } from '../AuthContext';
import { Card, ErrorBox, Field, PageTitle, Spinner, btnPrimary, inputCls, useAsync } from '../ui';

export const SettingsPage: React.FC = () => {
  const { canEdit } = useAuth();
  const { data, loading, error, reload } = useAsync(() => adminApi.settings(), []);
  const [f, setF] = useState<Record<string, string>>({});
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [errs, setErrs] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!data) return;
    setF({
      businessName: data.businessName ?? '', publicEmail: data.publicEmail ?? '', publicPhone: data.publicPhone ?? '', address: data.address ?? '',
      footerText: data.footerText ?? '', bookingInstructions: data.bookingInstructions ?? '', heroSupportingText: data.heroSupportingText ?? '',
      instagram: data.socialLinks.instagram ?? '', facebook: data.socialLinks.facebook ?? '', youtube: data.socialLinks.youtube ?? '',
    });
  }, [data]);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true); setMsg(null); setErrs({});
    const v = (k: string) => (f[k]?.trim() ? f[k].trim() : null);
    try {
      await adminApi.updateSettings({
        businessName: v('businessName'), publicEmail: v('publicEmail'), publicPhone: v('publicPhone'), address: v('address'),
        footerText: v('footerText'), bookingInstructions: v('bookingInstructions'), heroSupportingText: v('heroSupportingText'),
        socialLinks: { instagram: v('instagram'), facebook: v('facebook'), youtube: v('youtube') },
      });
      setMsg({ ok: true, text: 'Settings saved. The public website now uses them.' });
    } catch (err) {
      if (err instanceof ApiError) { setErrs(err.fieldErrors); setMsg({ ok: false, text: err.message }); } else setMsg({ ok: false, text: 'Could not save.' });
    } finally { setBusy(false); }
  };
  const bind = (k: string) => ({ className: inputCls, value: f[k] ?? '', disabled: !canEdit, onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setF((p) => ({ ...p, [k]: e.target.value })) });

  if (loading && !data) return <Spinner />;
  if (error) return <ErrorBox error={error} onRetry={reload} />;
  return (
    <form onSubmit={save} noValidate>
      <PageTitle title="Website settings" sub="Business details shown on the public site. Empty fields are simply hidden — nothing is invented." actions={canEdit && <button className={btnPrimary} disabled={busy}>{busy ? 'Saving…' : 'Save settings'}</button>} />
      {!canEdit && <div className="mb-3 p-3 text-sm rounded-md bg-amber-50 border border-amber-200 text-amber-900">Your role can view settings but not change them.</div>}
      {msg && <div role={msg.ok ? 'status' : 'alert'} className={`mb-4 p-3 text-sm rounded-md border ${msg.ok ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-rose-50 border-rose-200 text-rose-800'}`}>{msg.text}</div>}
      <div className="grid lg:grid-cols-2 gap-4">
        <Card title="Contact">
          <div className="space-y-3">
            <p className="text-xs text-stone-600 bg-stone-50 border border-stone-200 rounded-md p-2.5">The WhatsApp number and default message are managed under <Link to="/admin/media" className="font-semibold text-[#7A5410] underline">Website Content / Media</Link>.</p>
            <Field label="Public phone" error={errs.publicPhone}><input {...bind('publicPhone')} /></Field>
            <Field label="Public e-mail" error={errs.publicEmail}><input {...bind('publicEmail')} type="email" /></Field>
            <Field label="Address" error={errs.address}><input {...bind('address')} /></Field>
          </div>
        </Card>
        <Card title="Content">
          <div className="space-y-3">
            <Field label="Business name" error={errs.businessName}><input {...bind('businessName')} /></Field>
            <Field label="Footer text (shown beside the enquiry button)" error={errs.footerText}><textarea {...bind('footerText')} rows={3} /></Field>
            <Field label="Booking enquiry instructions (shown after an enquiry is submitted)" error={errs.bookingInstructions}><textarea {...bind('bookingInstructions')} rows={3} /></Field>
          </div>
        </Card>
        <Card title="Social links" className="lg:col-span-2">
          <div className="grid sm:grid-cols-3 gap-3">
            <Field label="Instagram URL" error={errs['socialLinks.instagram']}><input {...bind('instagram')} placeholder="https://instagram.com/…" /></Field>
            <Field label="Facebook URL" error={errs['socialLinks.facebook']}><input {...bind('facebook')} placeholder="https://facebook.com/…" /></Field>
            <Field label="YouTube URL" error={errs['socialLinks.youtube']}><input {...bind('youtube')} placeholder="https://youtube.com/…" /></Field>
          </div>
        </Card>
      </div>
    </form>
  );
};
