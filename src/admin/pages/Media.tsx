import React, { useEffect, useRef, useState } from 'react';
import { Link, useOutletContext } from 'react-router-dom';
import { ExternalLink, ImageOff, MessageCircle, Trash2, Upload, Video } from 'lucide-react';
import { adminApi } from '../../services/adminApi';
import { ApiError } from '../../services/api';
import { HeroMedia } from '../../components/common/HeroMedia';
import { DEFAULT_WHATSAPP_MESSAGE, buildWhatsAppUrl } from '../../lib/whatsapp';
import type { PublicSettings } from '../../types';
import { useAuth } from '../AuthContext';
import type { AdminOutletContext } from '../AdminLayout';
import { Card, ErrorBox, Field, PageTitle, Spinner, btnGhost, btnPrimary, inputCls, useAsync } from '../ui';

interface State { imageUrl: string; imageAlt: string; imageId: string | null; videoUrl: string; videoId: string | null; posterUrl: string; posterId: string | null; waNumber: string; waMessage: string }
const fromSettings = (s: PublicSettings): State => ({
  imageUrl: s.heroImage?.url ?? '', imageAlt: s.heroImage?.alt ?? '', imageId: s.heroImage?.publicId ?? null,
  videoUrl: s.heroVideo?.url ?? '', videoId: s.heroVideo?.publicId ?? null, posterUrl: s.heroVideo?.posterUrl ?? '', posterId: s.heroVideo?.posterPublicId ?? null,
  waNumber: s.whatsappNumber ?? '', waMessage: s.whatsappDefaultMessage ?? '',
});
const isUrl = (u: string) => !u || /^\/(?!\/)\S*$/.test(u) || /^https:\/\/\S+$/.test(u);

export const MediaPage: React.FC = () => {
  const { canEdit } = useAuth();
  const { meta, reloadMeta } = useOutletContext<AdminOutletContext>();
  const { data, loading, error, reload } = useAsync(() => adminApi.settings(), []);
  const [f, setF] = useState<State | null>(null);
  const [saved, setSaved] = useState<State | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [errs, setErrs] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [up, setUp] = useState<{ what: string; pct: number; error?: string } | null>(null);
  const imgFile = useRef<HTMLInputElement>(null), vidFile = useRef<HTMLInputElement>(null), posterFile = useRef<HTMLInputElement>(null);

  useEffect(() => { if (data) { const s = fromSettings(data); setF(s); setSaved(s); } }, [data]);
  if (loading && !f) return <Spinner />;
  if (error) return <ErrorBox error={error} onRetry={reload} />;
  if (!f || !saved) return null;

  const dirty = JSON.stringify(f) !== JSON.stringify(saved);
  const set = (patch: Partial<State>) => { setF({ ...f, ...patch }); setMsg(null); setErrs((e) => ({ ...e, ...Object.fromEntries(Object.keys(patch).map((k) => [k, ''])) })); };
  const uploadsOn = meta?.uploads.enabled ?? false;

  const doUpload = async (kind: 'image' | 'video' | 'poster', file?: File | null) => {
    if (!file) return;
    const isVideo = kind === 'video';
    const limit = isVideo ? meta?.uploads.video.maxBytes ?? 50 * 1024 * 1024 : meta?.uploads.maxBytes ?? 8 * 1024 * 1024;
    const okTypes = isVideo ? meta?.uploads.video.types ?? [] : meta?.uploads.types ?? [];
    if (okTypes.length && !okTypes.includes(file.type)) { setUp({ what: file.name, pct: 0, error: isVideo ? 'Use an MP4, WebM or MOV video.' : 'Use a JPEG, PNG, WebP or GIF image.' }); return; }
    if (file.size > limit) { setUp({ what: file.name, pct: 0, error: `File is larger than ${Math.round(limit / 1024 / 1024)} MB.` }); return; }
    setUp({ what: file.name, pct: 0 });
    try {
      const r = await (isVideo ? adminApi.uploadVideo : adminApi.uploadImage)(file, (pct) => setUp({ what: file.name, pct }));
      if (kind === 'image') set({ imageUrl: r.url, imageId: r.publicId });
      else if (kind === 'video') set({ videoUrl: r.url, videoId: r.publicId });
      else set({ posterUrl: r.url, posterId: r.publicId });
      setUp(null);
    } catch (e) { setUp({ what: file.name, pct: 0, error: e instanceof ApiError ? e.message : 'Upload failed.' }); }
  };

  const save = async () => {
    const local: Record<string, string> = {};
    if (!isUrl(f.imageUrl)) local.imageUrl = 'Use an https:// URL or a path starting with /.';
    if (!isUrl(f.videoUrl)) local.videoUrl = 'Use an https:// URL or a path starting with /.';
    if (!isUrl(f.posterUrl)) local.posterUrl = 'Use an https:// URL or a path starting with /.';
    if (f.waNumber.trim() && !/^[1-9]\d{7,14}$/.test(f.waNumber.replace(/[\s+()-]/g, ''))) local.waNumber = 'Use the international format with country code, e.g. 91 98765 43210 (no leading 0).';
    setErrs(local);
    if (Object.keys(local).length) { setMsg({ ok: false, text: 'Please fix the highlighted fields.' }); return; }
    setBusy(true); setMsg(null);
    try {
      const out = await adminApi.updateSettings({
        heroImage: f.imageUrl.trim() ? { url: f.imageUrl.trim(), alt: f.imageAlt.trim(), publicId: f.imageId } : null,
        heroVideo: f.videoUrl.trim() ? { url: f.videoUrl.trim(), publicId: f.videoId, posterUrl: f.posterUrl.trim() || null, posterPublicId: f.posterUrl.trim() ? f.posterId : null } : null,
        whatsappNumber: f.waNumber.trim() || null,
        whatsappDefaultMessage: f.waMessage.trim() || null,
      });
      const s = fromSettings(out); setF(s); setSaved(s); reloadMeta();
      setMsg({ ok: true, text: 'Saved. Your changes are live on the public website now.' });
    } catch (e) {
      if (e instanceof ApiError) { setErrs({ waNumber: e.fieldErrors.whatsappNumber ?? '', imageUrl: e.fieldErrors['heroImage.url'] ?? '', videoUrl: e.fieldErrors['heroVideo.url'] ?? '', posterUrl: e.fieldErrors['heroVideo.posterUrl'] ?? '' }); setMsg({ ok: false, text: `${e.message} Your entries have been kept.` }); }
      else setMsg({ ok: false, text: 'Could not save. Your entries have been kept.' });
    } finally { setBusy(false); }
  };

  const previewImage = f.imageUrl.trim() ? { url: f.imageUrl.trim(), alt: f.imageAlt, publicId: f.imageId } : null;
  const previewVideo = f.videoUrl.trim() ? { url: f.videoUrl.trim(), publicId: f.videoId, posterUrl: f.posterUrl.trim() || null, posterPublicId: f.posterId } : null;
  const waTest = buildWhatsAppUrl(f.waNumber, f.waMessage.trim() || DEFAULT_WHATSAPP_MESSAGE);
  const disabled = !canEdit;
  const uploadBtn = (label: string, on: () => void) => (
    <button type="button" className={btnGhost} disabled={disabled || !uploadsOn} onClick={on} title={uploadsOn ? '' : 'Cloudinary is not configured — paste a URL instead'}><Upload className="w-4 h-4" />{label}</button>
  );

  return (
    <>
      <PageTitle title="Website Content / Media" sub="The homepage hero and WhatsApp contact. Preview first — nothing changes on the website until you press Save."
        actions={canEdit && <div className="flex gap-2"><button className={btnGhost} disabled={!dirty || busy} onClick={() => { setF(saved); setErrs({}); setMsg(null); }}>Discard changes</button><button className={btnPrimary} disabled={!dirty || busy} onClick={save}>{busy ? 'Saving…' : 'Save & publish'}</button></div>} />
      {!canEdit && <div className="mb-3 p-3 text-sm rounded-md bg-amber-50 border border-amber-200 text-amber-900">Your role can view these settings but not change them.</div>}
      {msg && <div role={msg.ok ? 'status' : 'alert'} className={`mb-4 p-3 text-sm rounded-md border ${msg.ok ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-rose-50 border-rose-200 text-rose-800'}`}>{msg.text} {msg.ok && <a className="underline font-semibold" href="/" target="_blank" rel="noopener noreferrer">Open website <ExternalLink className="inline w-3 h-3" /></a>}</div>}
      {dirty && <div className="mb-4 text-xs text-stone-600">You have unsaved changes.</div>}
      {!uploadsOn && <div className="mb-4 p-3 text-xs rounded-md bg-stone-50 border border-stone-200 text-stone-700">File upload is off because Cloudinary is not configured — paste image/video URLs instead (or a path under <code>/</code> for files in <code>public/</code>). See the README → “Cloudinary”.</div>}
      {up && <div role="status" className={`mb-4 p-3 text-xs rounded-md border ${up.error ? 'bg-rose-50 border-rose-200 text-rose-800' : 'bg-stone-50 border-stone-200'}`}>{up.error ? `${up.what}: ${up.error}` : <>Uploading {up.what}… {up.pct}%<span className="block h-1.5 bg-stone-200 rounded mt-1"><span className="block h-full bg-[#B58B35] rounded" style={{ width: `${up.pct}%` }} /></span></>}</div>}

      <div className="grid xl:grid-cols-2 gap-4">
        <div className="space-y-4">
          <Card title="Hero image" actions={f.imageUrl && canEdit ? <button className={btnGhost} onClick={() => set({ imageUrl: '', imageAlt: '', imageId: null })}><ImageOff className="w-4 h-4" />Use default</button> : undefined}>
            <div className="space-y-3">
              <Field label="Image URL" hint="Blank = the bundled default hero image." error={errs.imageUrl}><input className={inputCls} disabled={disabled} value={f.imageUrl} onChange={(e) => set({ imageUrl: e.target.value, imageId: null })} placeholder="https://… or /demo-villas/ocean.jpg" /></Field>
              <Field label="Alt text (describes the image for screen readers)"><input className={inputCls} disabled={disabled} maxLength={200} value={f.imageAlt} onChange={(e) => set({ imageAlt: e.target.value })} /></Field>
              <input ref={imgFile} type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="hidden" onChange={(e) => { doUpload('image', e.target.files?.[0]); e.target.value = ''; }} />
              {uploadBtn(f.imageUrl ? 'Replace image' : 'Upload image', () => imgFile.current?.click())}
            </div>
          </Card>
          <Card title="Hero video (optional)" actions={f.videoUrl && canEdit ? <button className={btnGhost} onClick={() => set({ videoUrl: '', videoId: null, posterUrl: '', posterId: null })}><Trash2 className="w-4 h-4" />Remove video</button> : undefined}>
            <div className="space-y-3">
              <p className="text-xs text-stone-600">Plays silently on a loop behind the hero text. Visitors who prefer reduced motion or data saving, or whose video fails to load, see the poster / hero image instead. Keep it short (10–20 s) and compressed.</p>
              <Field label="Video URL (MP4 or WebM)" error={errs.videoUrl}><input className={inputCls} disabled={disabled} value={f.videoUrl} onChange={(e) => set({ videoUrl: e.target.value, videoId: null })} placeholder="https://…/hero.mp4" /></Field>
              <input ref={vidFile} type="file" accept="video/mp4,video/webm,video/quicktime" className="hidden" onChange={(e) => { doUpload('video', e.target.files?.[0]); e.target.value = ''; }} />
              {uploadBtn(f.videoUrl ? 'Replace video' : 'Upload video', () => vidFile.current?.click())}
              <Field label="Poster image URL (shown before the video plays / if it cannot play)" hint="Blank = the hero image above." error={errs.posterUrl}><input className={inputCls} disabled={disabled} value={f.posterUrl} onChange={(e) => set({ posterUrl: e.target.value, posterId: null })} placeholder="https://… or /demo-villas/ocean.jpg" /></Field>
              <input ref={posterFile} type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="hidden" onChange={(e) => { doUpload('poster', e.target.files?.[0]); e.target.value = ''; }} />
              {uploadBtn(f.posterUrl ? 'Replace poster' : 'Upload poster', () => posterFile.current?.click())}
            </div>
          </Card>
        </div>

        <div className="space-y-4">
          <Card title={<span className="flex items-center gap-2"><Video className="w-4 h-4" />Preview (not live until saved)</span>}>
            <div className="relative aspect-[16/9] rounded-md overflow-hidden bg-stone-900" data-testid="media-preview">
              <HeroMedia image={previewImage} video={previewVideo} preview />
              <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/40 to-transparent pointer-events-none" />
              <div className="absolute left-4 bottom-4 text-white pointer-events-none"><div className="text-[9px] tracking-[0.25em] text-[#E8C77F] uppercase">Luxury Villas in Alibaug</div><div className="font-editorial text-2xl leading-none mt-1">A Private<br /><i className="font-light">Coastal Escape</i></div></div>
            </div>
            <p className="text-xs text-stone-500 mt-2">{previewVideo ? 'Video and poster preview use your unsaved values. If the video cannot load, the website falls back to the poster/hero image.' : previewImage ? 'Custom hero image.' : 'Showing the bundled default hero image.'}</p>
          </Card>
          <Card title={<span className="flex items-center gap-2"><MessageCircle className="w-4 h-4" />WhatsApp contact</span>}>
            <div className="space-y-3">
              <Field label="WhatsApp number (international format)" hint="Country code + number, digits only — e.g. 91 98765 43210. No + or leading 0. Leave empty to hide every WhatsApp button." error={errs.waNumber}><input className={inputCls} inputMode="tel" disabled={disabled} value={f.waNumber} onChange={(e) => set({ waNumber: e.target.value })} placeholder="e.g. 919876543210" /></Field>
              <Field label="Default enquiry message" hint="Pre-filled for the floating WhatsApp button and header/footer links. Enquiry forms use their own detailed message."><textarea className={inputCls} rows={3} maxLength={300} disabled={disabled} value={f.waMessage} onChange={(e) => set({ waMessage: e.target.value })} placeholder={DEFAULT_WHATSAPP_MESSAGE} /></Field>
              <div className="text-xs">
                {waTest ? <a className="inline-flex items-center gap-1 font-semibold text-[#7A5410] underline" href={waTest} target="_blank" rel="noopener noreferrer"><ExternalLink className="w-3 h-3" />Test this WhatsApp link</a> : <span className="text-amber-800">No valid number — the floating button and “Send on WhatsApp” actions are hidden on the website.</span>}
              </div>
            </div>
          </Card>
        </div>
      </div>
      <p className="mt-4 text-xs text-stone-500">Property photos are managed per property under <Link to="/admin/villas" className="underline">Properties</Link>.</p>
    </>
  );
};
