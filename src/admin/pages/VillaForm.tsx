import React, { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useOutletContext, useParams } from 'react-router-dom';
import { ArrowDown, ArrowLeft, ArrowUp, Copy, Eye, ImagePlus, Plus, Star, Trash2, Upload } from 'lucide-react';
import { adminApi } from '../../services/adminApi';
import { ApiError } from '../../services/api';
import { toVilla } from '../../services/publicApi';
import { SafeImage } from '../../components/common/SafeImage';
import { VillaDetailModal } from '../../components/villas/VillaDetailModal';
import type { AdminVilla, Villa } from '../../types';
import { useAuth } from '../AuthContext';
import type { AdminOutletContext } from '../AdminLayout';
import { Card, Dialog, ErrorBox, Field, PageTitle, Spinner, btnGhost, btnPrimary, inputCls, useAsync } from '../ui';

interface Img { url: string; alt: string; publicId: string | null }
interface F {
  name: string; slug: string; badge: string; propertyType: string; location: string; locality: string; addressDetails: string; shortDescription: string; fullDescription: string; highlights: string;
  startingPrice: string; bedrooms: string; bathrooms: string; maxGuests: string; amenities: { label: string; icon: string }[]; featuredImage: string; featuredImagePublicId: string | null; gallery: Img[];
  rules: string; checkInTime: string; checkOutTime: string; seoTitle: string; seoDescription: string; isPublished: boolean; isFeatured: boolean; displayOrder: string;
}
const blank: F = { name: '', slug: '', badge: '', propertyType: 'Family Holiday Villa', location: '', locality: '', addressDetails: '', shortDescription: '', fullDescription: '', highlights: '', startingPrice: '', bedrooms: '3', bathrooms: '3', maxGuests: '8', amenities: [], featuredImage: '', featuredImagePublicId: null, gallery: [], rules: '', checkInTime: '14:00', checkOutTime: '11:00', seoTitle: '', seoDescription: '', isPublished: false, isFeatured: false, displayOrder: '0' };

const TABS = [
  { id: 'basic', label: '1 · Basics' }, { id: 'type', label: '2 · Type & location' }, { id: 'desc', label: '3 · Descriptions' }, { id: 'pricing', label: '4 · Pricing' }, { id: 'capacity', label: '5 · Capacity & rooms' },
  { id: 'amenities', label: '6 · Amenities' }, { id: 'images', label: '7 · Images' }, { id: 'rules', label: '8 · Rules & times' }, { id: 'seo', label: '9 · SEO' }, { id: 'publish', label: '10 · Publishing' },
] as const;
type TabId = (typeof TABS)[number]['id'];
const FIELD_TAB: Record<string, TabId> = { name: 'basic', slug: 'basic', badge: 'basic', propertyType: 'type', location: 'type', locality: 'type', addressDetails: 'type', shortDescription: 'desc', fullDescription: 'desc', highlights: 'desc',
  startingPrice: 'pricing', currency: 'pricing', bedrooms: 'capacity', bathrooms: 'capacity', maxGuests: 'capacity', amenities: 'amenities', featuredImage: 'images', featuredImagePublicId: 'images', gallery: 'images', rules: 'rules', checkInTime: 'rules', checkOutTime: 'rules',
  seoTitle: 'seo', seoDescription: 'seo', isPublished: 'publish', isFeatured: 'publish', displayOrder: 'publish' };
const tabOf = (field: string): TabId => FIELD_TAB[field] ?? FIELD_TAB[field.split('.')[0]] ?? 'basic';
const SUGGESTED = ['Private Pool', 'Air Conditioning', 'Wi-Fi', 'Fully Equipped Kitchen', 'Parking', 'Garden', 'Sea View', 'Caretaker', 'TV Lounge', 'Barbecue'];
const lines = (s: string) => s.split('\n').map((x) => x.trim()).filter(Boolean);

// API/database values remain icon identifiers (for example, `sparkles`), but the
// admin UI should present a readable label rather than exposing the raw identifier.
const iconLabel = (icon: string) => {
  const readable = icon.replace(/[-_]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  return icon === 'sparkles' ? '✨ Sparkles (default)' : readable || 'Default icon';
};
const normalizeAmenity = (amenity: { label?: string | null; icon?: string | null }) => {
  const icon = amenity.icon?.trim() || 'sparkles';
  const rawLabel = amenity.label?.trim() || '';
  // Recover rows where the icon identifier was accidentally saved as the label.
  const label = rawLabel.toLowerCase() === icon.toLowerCase() && /^[a-z]+(?:[-_][a-z]+)*$/i.test(rawLabel)
    ? ''
    : rawLabel;
  return { label, icon };
};
const isImageUrl = (u: string) => /^\/(?!\/)\S*$/.test(u) || /^https:\/\/\S+$/.test(u);

function fromVilla(v: AdminVilla): F {
  return { name: v.name, slug: v.slug, badge: v.badge ?? '', propertyType: v.propertyType, location: v.location, locality: v.locality, addressDetails: v.addressDetails ?? '', shortDescription: v.shortDescription, fullDescription: v.fullDescription,
    highlights: v.highlights.join('\n'), startingPrice: v.startingPrice != null ? String(v.startingPrice) : '', bedrooms: String(v.bedrooms), bathrooms: String(v.bathrooms), maxGuests: String(v.maxGuests), amenities: v.amenities.map((a) => normalizeAmenity(a)),
    featuredImage: v.featuredImage ?? '', featuredImagePublicId: v.featuredImagePublicId, gallery: v.galleryImages.map((g) => ({ url: g.url, alt: g.alt, publicId: g.publicId ?? null })), rules: v.rules.join('\n'), checkInTime: v.checkInTime, checkOutTime: v.checkOutTime,
    seoTitle: v.seoTitle ?? '', seoDescription: v.seoDescription ?? '', isPublished: v.isPublished, isFeatured: v.isFeatured, displayOrder: String(v.displayOrder) };
}
const toBody = (f: F, publish: boolean) => ({
  name: f.name, slug: f.slug || undefined, badge: f.badge || null, propertyType: f.propertyType, shortDescription: f.shortDescription, fullDescription: f.fullDescription, location: f.location, locality: f.locality, addressDetails: f.addressDetails || null,
  bedrooms: Number(f.bedrooms), bathrooms: Number(f.bathrooms), maxGuests: Number(f.maxGuests), startingPrice: f.startingPrice === '' ? null : Number(f.startingPrice), currency: 'INR',
  featuredImage: f.featuredImage || null, featuredImagePublicId: f.featuredImage ? f.featuredImagePublicId : null, gallery: f.gallery.filter((g) => g.url.trim()).map((g) => ({ url: g.url.trim(), alt: g.alt, publicId: g.publicId })),
  amenities: f.amenities.filter((a) => a.label.trim()), highlights: lines(f.highlights), rules: lines(f.rules), checkInTime: f.checkInTime, checkOutTime: f.checkOutTime, seoTitle: f.seoTitle || null, seoDescription: f.seoDescription || null,
  isPublished: publish, isFeatured: f.isFeatured, displayOrder: Number(f.displayOrder) || 0,
});
function validate(f: F, publish: boolean) {
  const e: Record<string, string> = {};
  if (!f.name.trim()) e.name = 'Enter the property name.';
  if (!(Number(f.bedrooms) >= 1)) e.bedrooms = 'At least 1 bedroom.';
  if (!(Number(f.maxGuests) >= 1)) e.maxGuests = 'At least 1 guest.';
  if (f.startingPrice !== '' && !(Number(f.startingPrice) >= 0)) e.startingPrice = 'Enter a valid amount or leave blank for “Price on enquiry”.';
  if (f.featuredImage && !isImageUrl(f.featuredImage)) e.featuredImage = 'Use an https:// URL, a path starting with /, or upload an image.';
  f.gallery.forEach((g, i) => { if (g.url && !isImageUrl(g.url)) e[`gallery.${i}.url`] = 'Invalid image URL.'; });
  if (publish) {
    if (!f.location.trim()) e.location = 'A location is required to publish.';
    if (!f.shortDescription.trim()) e.shortDescription = 'A short description is required to publish.';
    if (f.fullDescription.trim().length < 20) e.fullDescription = 'Add a full description (at least 20 characters) to publish.';
    if (!f.featuredImage && !f.gallery.some((g) => g.url)) e.featuredImage = 'A featured image is required to publish.';
  }
  return e;
}

export const VillaFormPage: React.FC = () => {
  const { id } = useParams();
  const isNew = !id;
  const nav = useNavigate();
  const { canEdit } = useAuth();
  const { meta, reloadMeta } = useOutletContext<AdminOutletContext>();
  const { data, loading, error, reload } = useAsync(() => (isNew ? Promise.resolve(null) : adminApi.villa(id!)), [id]);
  const [f, setF] = useState<F>(blank);
  const [tab, setTab] = useState<TabId>('basic');
  const [errs, setErrs] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [preview, setPreview] = useState<Villa | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [uploads, setUploads] = useState<{ name: string; pct: number; error?: string; done?: boolean }[]>([]);
  const [dirty, setDirty] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const featuredFileRef = useRef<HTMLInputElement>(null);
  const replaceFileRef = useRef<HTMLInputElement>(null);
  const replaceIdx = useRef<number>(-1);
  const [newUrl, setNewUrl] = useState('');

  useEffect(() => { if (data) { setF(fromVilla(data)); setDirty(false); } }, [data]);
  useEffect(() => {
    if (!dirty) return;
    const h = (e: BeforeUnloadEvent) => { e.preventDefault(); };
    window.addEventListener('beforeunload', h);
    return () => window.removeEventListener('beforeunload', h);
  }, [dirty]);

  if (!canEdit) return <ErrorBox error={new ApiError(403, 'forbidden', 'Your role cannot edit properties.')} />;
  if (loading && !isNew) return <Spinner />;
  if (error) return <ErrorBox error={error} onRetry={reload} />;

  const set = <K extends keyof F>(k: K, v: F[K]) => { setF((p) => ({ ...p, [k]: v })); setDirty(true); setErrs((p) => { const n = { ...p }; delete n[k as string]; return n; }); };
  const err = (k: string) => errs[k];
  const tabErrors = (t: TabId) => Object.keys(errs).filter((k) => errs[k] && tabOf(k) === t).length;
  const uploadsOn = meta?.uploads.enabled ?? false;

  const save = async (publish: boolean) => {
    if (saving) return;
    setMsg(null);
    const local = validate(f, publish);
    if (Object.keys(local).length) { setErrs(local); setTab(tabOf(Object.keys(local)[0])); setMsg({ ok: false, text: 'Please fix the highlighted fields. Nothing was lost — your entries are still here.' }); return; }
    setSaving(true); setErrs({});
    try {
      const saved = isNew ? await adminApi.createVilla(toBody(f, publish)) : await adminApi.updateVilla(id!, toBody(f, publish));
      setF(fromVilla(saved)); setDirty(false); reloadMeta();
      setMsg({ ok: true, text: publish ? 'Saved and published — it is live on the website.' : saved.isPublished ? 'Saved.' : 'Saved as draft.' });
      if (isNew) nav(`/admin/villas/${saved.id}`, { replace: true });
    } catch (e) {
      if (e instanceof ApiError) {
        const m = { ...e.fieldErrors };
        setErrs(m);
        const first = Object.keys(m)[0];
        if (first) setTab(tabOf(first));
        setMsg({ ok: false, text: `${e.message}${e.status === 0 ? '' : ' Your entries have been kept.'}` });
      } else setMsg({ ok: false, text: 'Could not save. Your entries have been kept.' });
    } finally { setSaving(false); }
  };

  const uploadFiles = async (files: FileList | null, target: 'gallery' | 'featured') => {
    if (!files?.length) return;
    for (const file of Array.from(files)) {
      const key = `${Date.now()}-${file.name}`;
      setUploads((u) => [...u, { name: key, pct: 0 }]);
      const patch = (p: Partial<{ pct: number; error: string; done: boolean }>) => setUploads((u) => u.map((x) => (x.name === key ? { ...x, ...p } : x)));
      if (!['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(file.type)) { patch({ error: 'Only JPEG, PNG, WebP or GIF images.' }); continue; }
      if (file.size > (meta?.uploads.maxBytes ?? 8 * 1024 * 1024)) { patch({ error: `Larger than ${Math.round((meta?.uploads.maxBytes ?? 0) / 1024 / 1024)} MB.` }); continue; }
      try {
        const r = await adminApi.uploadImage(file, (pct) => patch({ pct }));
        patch({ pct: 100, done: true });
        if (target === 'featured') setF((p) => ({ ...p, featuredImage: r.url, featuredImagePublicId: r.publicId }));
        else setF((p) => ({ ...p, gallery: [...p.gallery, { url: r.url, alt: '', publicId: r.publicId }], featuredImage: p.featuredImage || r.url, featuredImagePublicId: p.featuredImage ? p.featuredImagePublicId : r.publicId }));
        setDirty(true);
      } catch (e) { patch({ error: e instanceof ApiError ? e.message : 'Upload failed.' }); }
    }
    if (fileRef.current) fileRef.current.value = '';
    if (featuredFileRef.current) featuredFileRef.current.value = '';
  };

  /** Replaces one gallery photo (keeps its position and caption) with a newly uploaded file. */
  const replaceImage = async (file?: File | null) => {
    const i = replaceIdx.current;
    if (!file || i < 0) return;
    const key = `${Date.now()}-${file.name}`;
    setUploads((u) => [...u, { name: key, pct: 0 }]);
    const patch = (p: Partial<{ pct: number; error: string; done: boolean }>) => setUploads((u) => u.map((x) => (x.name === key ? { ...x, ...p } : x)));
    try {
      const r = await adminApi.uploadImage(file, (pct) => patch({ pct }));
      patch({ pct: 100, done: true });
      setF((p) => { const old = p.gallery[i]; if (!old) return p; const g = [...p.gallery]; g[i] = { ...old, url: r.url, publicId: r.publicId }; return { ...p, gallery: g, ...(p.featuredImage === old.url ? { featuredImage: r.url, featuredImagePublicId: r.publicId } : {}) }; });
      setDirty(true);
    } catch (e) { patch({ error: e instanceof ApiError ? e.message : 'Upload failed.' }); }
    if (replaceFileRef.current) replaceFileRef.current.value = '';
  };

  const addUrl = () => {
    if (!isImageUrl(newUrl.trim())) { setErrs((p) => ({ ...p, gallery: 'Enter an https:// URL or a path starting with /.' })); return; }
    set('gallery', [...f.gallery, { url: newUrl.trim(), alt: '', publicId: null }]);
    setNewUrl('');
  };

  const openPreview = () => {
    const body = toBody(f, true);
    const gallery = [body.featuredImage, ...body.gallery.map((g) => g.url)].filter((u, i, a): u is string => !!u && a.indexOf(u) === i);
    setPreview(toVilla({
      id: id ?? 'preview', slug: body.slug ?? 'preview', name: body.name || 'Untitled property', badge: body.badge, propertyType: body.propertyType, bedrooms: body.bedrooms || 1, bathrooms: body.bathrooms, maxGuests: body.maxGuests || 1,
      startingPrice: body.startingPrice, currency: 'INR', image: gallery[0] ?? null, gallery, galleryAlts: Object.fromEntries(body.gallery.map((g) => [g.url, g.alt])), location: body.location, locality: body.locality,
      checkInTime: body.checkInTime, checkOutTime: body.checkOutTime, seoTitle: body.seoTitle, seoDescription: body.seoDescription, isDemo: data?.isDemo ?? false, shortDescription: body.shortDescription, fullDescription: body.fullDescription,
      amenities: body.amenities, highlights: body.highlights, rules: body.rules, isFeatured: body.isFeatured,
    }));
  };

  const T = ({ k, label, hint, ...p }: { k: keyof F & string; label: string; hint?: string } & React.InputHTMLAttributes<HTMLInputElement>) => (
    <Field label={label} hint={hint} error={err(k)}><input className={inputCls} value={String(f[k] ?? '')} onChange={(e) => set(k as any, e.target.value as any)} aria-invalid={!!err(k)} {...p} /></Field>
  );

  return (
    <div>
      <Link to="/admin/villas" className="inline-flex items-center gap-1 text-sm text-stone-600 hover:text-stone-900 mb-3"><ArrowLeft className="w-4 h-4" />All properties</Link>
      <PageTitle title={isNew ? 'Add new property' : `Edit: ${data?.name ?? ''}`} sub={data?.isDemo ? 'This is DEMO sample content. Editing it keeps the demo flag — delete it before launch.' : undefined}
        actions={<div className="flex flex-wrap gap-2">
          <button type="button" className={btnGhost} onClick={openPreview}><Eye className="w-4 h-4" />Preview</button>
          {!isNew && <button type="button" className={btnGhost} onClick={async () => { try { const d = await adminApi.duplicateVilla(id!); nav(`/admin/villas/${d.id}`); } catch (e) { setMsg({ ok: false, text: e instanceof ApiError ? e.message : 'Could not duplicate.' }); } }}><Copy className="w-4 h-4" />Duplicate</button>}
          {!isNew && <button type="button" className={`${btnGhost} text-rose-700`} onClick={() => setConfirmDelete(true)}><Trash2 className="w-4 h-4" />Delete</button>}
          <button type="button" className={btnGhost} disabled={saving} onClick={() => save(false)}>{saving ? 'Saving…' : 'Save as draft'}</button>
          <button type="button" className={btnPrimary} disabled={saving} onClick={() => save(true)}>{saving ? 'Saving…' : f.isPublished && !isNew ? 'Save & keep published' : 'Save & publish'}</button>
        </div>} />
      {msg && <div role={msg.ok ? 'status' : 'alert'} className={`mb-4 p-3 text-sm rounded-md border ${msg.ok ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-rose-50 border-rose-200 text-rose-800'}`}>{msg.text}</div>}

      <div role="tablist" aria-label="Property sections" className="flex gap-1 overflow-x-auto pb-2 mb-4 border-b border-stone-200">
        {TABS.map((t) => (
          <button key={t.id} role="tab" aria-selected={tab === t.id} type="button" onClick={() => setTab(t.id)} className={`whitespace-nowrap px-3 py-2 text-sm rounded-t-md border-b-2 -mb-[1px] ${tab === t.id ? 'border-[#B58B35] text-stone-900 font-semibold' : 'border-transparent text-stone-500 hover:text-stone-800'}`}>
            {t.label}{tabErrors(t.id) > 0 && <span className="ml-1.5 inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-rose-600 text-white text-[10px]">{tabErrors(t.id)}</span>}
          </button>
        ))}
      </div>

      <div role="tabpanel">
        {tab === 'basic' && (
          <Card title="Basic information"><div className="grid sm:grid-cols-2 gap-3">
            {T({ k: 'name', label: "Property name *", maxLength: 160 })}
            {T({ k: 'slug', label: "URL slug", hint: "Leave blank to generate from the name (letters, numbers, hyphens).", placeholder: "azure-crest-villa" })}
            {T({ k: 'badge', label: "Badge (optional)", hint: "Short label on the card, e.g. “Popular”.", maxLength: 40 })}
          </div></Card>
        )}
        {tab === 'type' && (
          <Card title="Property type & location"><div className="grid sm:grid-cols-2 gap-3">
            <Field label="Property type *" error={err('propertyType')}><select className={inputCls} value={f.propertyType} onChange={(e) => set('propertyType', e.target.value)}>{(meta?.propertyTypes ?? [f.propertyType]).map((t) => <option key={t}>{t}</option>)}</select></Field>
            {T({ k: 'location', label: "Location (shown publicly)", placeholder: "Awas Beach, Alibaug" })}
            {T({ k: 'locality', label: "Locality / area (used for filters)", placeholder: "Awas", maxLength: 120 })}
            {T({ k: 'addressDetails', label: "Private address & access notes", hint: "Admin only — never shown on the website.", maxLength: 400 })}
          </div></Card>
        )}
        {tab === 'desc' && (
          <Card title="Descriptions"><div className="grid gap-3">
            <Field label="Short description (card summary)" error={err('shortDescription')} hint={`${f.shortDescription.length}/400`}><textarea className={inputCls} rows={2} maxLength={400} value={f.shortDescription} onChange={(e) => set('shortDescription', e.target.value)} /></Field>
            <Field label="Detailed description" error={err('fullDescription')} hint={`${f.fullDescription.length}/5000 — blank lines separate paragraphs`}><textarea className={inputCls} rows={9} maxLength={5000} value={f.fullDescription} onChange={(e) => set('fullDescription', e.target.value)} /></Field>
            <Field label="Property highlights (one per line)" error={err('highlights')}><textarea className={inputCls} rows={5} value={f.highlights} onChange={(e) => set('highlights', e.target.value)} /></Field>
          </div></Card>
        )}
        {tab === 'pricing' && (
          <Card title="Pricing"><div className="grid sm:grid-cols-2 gap-3">
            {T({ k: 'startingPrice', label: "Starting price per night (₹)", type: "number", min: 0, hint: "Enter only a VERIFIED price. Leave blank to show “Price on enquiry”." })}
            <div className="text-xs text-stone-600 bg-stone-50 border border-stone-200 rounded-md p-3 self-end">Prices are indicative starting rates. The website never promises live availability or a final price — the team confirms both after an enquiry.</div>
          </div></Card>
        )}
        {tab === 'capacity' && (
          <Card title="Capacity & rooms"><div className="grid sm:grid-cols-3 gap-3">
            {T({ k: 'bedrooms', label: "Bedrooms *", type: "number", min: 1, max: 50 })}
            {T({ k: 'bathrooms', label: "Bathrooms", type: "number", min: 0, max: 50 })}
            {T({ k: 'maxGuests', label: "Maximum guests *", type: "number", min: 1, max: 100 })}
          </div></Card>
        )}
        {tab === 'amenities' && (
          <Card title="Amenities" actions={<button type="button" className={btnGhost} onClick={() => set('amenities', [...f.amenities, { label: '', icon: 'sparkles' }])}><Plus className="w-4 h-4" />Add amenity</button>}>
            <p className="text-xs text-stone-500 mb-3">Enter the amenity name shown to guests, then choose an icon. Icon names are stored internally; this form displays readable labels.</p>
            <div className="flex flex-wrap gap-1.5 mb-4">{SUGGESTED.filter((s) => !f.amenities.some((a) => a.label.trim().toLowerCase() === s.toLowerCase())).map((s) => <button type="button" key={s} onClick={() => set('amenities', [...f.amenities, { label: s, icon: 'sparkles' }])} className="px-2.5 py-1.5 text-xs rounded-full border border-stone-300 bg-white hover:bg-stone-50">+ {s}</button>)}</div>
            {f.amenities.length === 0 && <p className="text-sm text-stone-500">No amenities yet. Choose a suggestion above or click “Add amenity”.</p>}
            <div className="space-y-3">{f.amenities.map((a, i) => {
              const icons = Array.from(new Set(['sparkles', ...(meta?.amenityIcons ?? []), a.icon].filter(Boolean)));
              return (
                <div key={i} className="grid grid-cols-1 sm:grid-cols-[minmax(0,1fr)_190px_auto] gap-2 items-end rounded-lg border border-stone-200 bg-stone-50/60 p-3">
                  <Field label={`Amenity name ${i + 1}`} hint="This text is displayed to guests.">
                    <input className={inputCls} aria-label={`Amenity ${i + 1}`} placeholder="e.g. Private Swimming Pool" value={a.label} maxLength={80} onChange={(e) => set('amenities', f.amenities.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)))} />
                  </Field>
                  <Field label="Display icon">
                    <select className={inputCls} aria-label={`Icon for amenity ${i + 1}`} value={a.icon || 'sparkles'} onChange={(e) => set('amenities', f.amenities.map((x, j) => (j === i ? { ...x, icon: e.target.value } : x)))}>
                      {icons.map((ic) => <option key={ic} value={ic}>{iconLabel(ic)}</option>)}
                    </select>
                  </Field>
                  <button type="button" aria-label={`Remove amenity ${i + 1}`} title="Remove amenity" className={`${btnGhost} text-rose-700`} onClick={() => set('amenities', f.amenities.filter((_, j) => j !== i))}><Trash2 className="w-4 h-4" /><span className="sm:hidden">Remove</span></button>
                </div>
              );
            })}</div>
          </Card>
        )}
        {tab === 'images' && (
          <div className="space-y-4">
            <Card title="Featured image">
              <div className="grid md:grid-cols-[1fr_240px] gap-4 items-start">
                <div className="space-y-3">
                  <Field label="Image URL" error={err('featuredImage')}><input className={inputCls} value={f.featuredImage} onChange={(e) => { set('featuredImage', e.target.value); setF((p) => ({ ...p, featuredImagePublicId: null })); }} placeholder="https://… or /demo-villas/ocean.jpg" /></Field>
                  <input ref={featuredFileRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="hidden" onChange={(e) => uploadFiles(e.target.files, 'featured')} />
                  <button type="button" className={btnGhost} disabled={!uploadsOn} onClick={() => featuredFileRef.current?.click()} title={uploadsOn ? '' : 'Cloudinary is not configured'}><Upload className="w-4 h-4" />Upload featured image</button>
                </div>
                <div className="aspect-[16/10] rounded-md overflow-hidden bg-stone-100 border border-stone-200">{f.featuredImage ? <SafeImage src={f.featuredImage} alt="Featured preview" className="w-full h-full object-cover" /> : <div className="w-full h-full grid place-items-center text-xs text-stone-400">No featured image</div>}</div>
              </div>
            </Card>
            <Card title={`Gallery · ${f.gallery.length} photo${f.gallery.length === 1 ? '' : 's'}`} actions={<div className="flex gap-2">
              <input ref={replaceFileRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="hidden" onChange={(e) => replaceImage(e.target.files?.[0])} />
              <input ref={fileRef} type="file" multiple accept="image/jpeg,image/png,image/webp,image/gif" className="hidden" onChange={(e) => uploadFiles(e.target.files, 'gallery')} />
              <button type="button" className={btnGhost} disabled={!uploadsOn} onClick={() => fileRef.current?.click()}><Upload className="w-4 h-4" />Upload images</button></div>}>
              {!uploadsOn && <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-md p-2.5 mb-3">Image upload is off because Cloudinary is not configured{meta?.environment.imageStorage.partiallyConfigured ? ' (only partly configured)' : ''}. You can still add images by URL below. See the README → “Cloudinary”.</p>}
              {uploads.length > 0 && <ul className="mb-3 space-y-1" aria-live="polite">{uploads.map((u) => (
                <li key={u.name} className="text-xs flex items-center gap-2"><span className="truncate max-w-[200px]">{u.name.replace(/^\d+-/, '')}</span>
                  {u.error ? <span className="text-rose-700">{u.error}</span> : u.done ? <span className="text-emerald-700">Uploaded ✓</span> : <><span className="flex-1 h-1.5 bg-stone-200 rounded"><span className="block h-full bg-[#B58B35] rounded" style={{ width: `${u.pct}%` }} /></span><span>{u.pct}%</span></>}</li>))}</ul>}
              <div className="flex gap-2 mb-4"><input className={inputCls} placeholder="Paste an image URL (https://…) and press Add" value={newUrl} onChange={(e) => setNewUrl(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addUrl(); } }} />
                <button type="button" className={btnGhost} onClick={addUrl}><ImagePlus className="w-4 h-4" />Add</button></div>
              <p className="text-xs text-stone-500 mb-3">Add as many photos as you like (5–10 recommended; up to 100). Order = display order on the website; the ★ image is the cover. The caption (alt text) is shown in the photo viewer and read by screen readers.</p>
              {err('gallery') && <p role="alert" className="text-[11px] text-rose-700 -mt-3 mb-3">{err('gallery')}</p>}
              {f.gallery.length === 0 && <p className="text-sm text-stone-500">No gallery images yet.</p>}
              <ul className="grid sm:grid-cols-2 xl:grid-cols-3 gap-3">{f.gallery.map((g, i) => (
                <li key={`${g.url}-${i}`} className="border border-stone-200 rounded-lg overflow-hidden bg-white">
                  <div className="aspect-[16/10] bg-stone-100"><SafeImage src={g.url} alt={g.alt || `Gallery image ${i + 1}`} className="w-full h-full object-cover" /></div>
                  <div className="p-2 space-y-2">
                    <input className={`${inputCls} text-xs`} aria-label={`Image URL ${i + 1}`} value={g.url} onChange={(e) => set('gallery', f.gallery.map((x, j) => (j === i ? { ...x, url: e.target.value, publicId: null } : x)))} />
                    <input className={inputCls} aria-label={`Alt text for image ${i + 1}`} placeholder="Caption / alt text (describe the image)" value={g.alt} maxLength={200} onChange={(e) => set('gallery', f.gallery.map((x, j) => (j === i ? { ...x, alt: e.target.value } : x)))} />
                    {err(`gallery.${i}.url`) && <p role="alert" className="text-[11px] text-rose-700">{err(`gallery.${i}.url`)}</p>}
                    <div className="flex items-center gap-1">
                      <button type="button" className={btnGhost} aria-label="Move earlier" disabled={i === 0} onClick={() => { const gl = [...f.gallery]; [gl[i - 1], gl[i]] = [gl[i], gl[i - 1]]; set('gallery', gl); }}><ArrowUp className="w-4 h-4" /></button>
                      <button type="button" className={btnGhost} aria-label="Move later" disabled={i === f.gallery.length - 1} onClick={() => { const gl = [...f.gallery]; [gl[i + 1], gl[i]] = [gl[i], gl[i + 1]]; set('gallery', gl); }}><ArrowDown className="w-4 h-4" /></button>
                      <button type="button" className={btnGhost} title="Use as featured image" onClick={() => { setF((p) => ({ ...p, featuredImage: g.url, featuredImagePublicId: g.publicId })); setDirty(true); }}><Star className={`w-4 h-4 ${f.featuredImage === g.url ? 'fill-yellow-400 text-yellow-600' : ''}`} /></button>
                      <button type="button" className={btnGhost} aria-label="Replace image" title={uploadsOn ? 'Replace with an uploaded image' : 'Upload is off — edit the URL above instead'} disabled={!uploadsOn} onClick={() => { replaceIdx.current = i; replaceFileRef.current?.click(); }}><Upload className="w-4 h-4" /></button>
                      <button type="button" className={`${btnGhost} text-rose-700 ml-auto`} aria-label="Remove image" onClick={() => set('gallery', f.gallery.filter((_, j) => j !== i))}><Trash2 className="w-4 h-4" /></button>
                    </div></div></li>))}</ul>
            </Card>
          </div>
        )}
        {tab === 'rules' && (
          <Card title="Property rules & stay times"><div className="grid sm:grid-cols-2 gap-3">
            {T({ k: 'checkInTime', label: "Check-in from (24h)", type: "time" })}
            {T({ k: 'checkOutTime', label: "Check-out by (24h)", type: "time" })}
            <div className="sm:col-span-2"><Field label="House rules (one per line)" error={err('rules')}><textarea className={inputCls} rows={6} value={f.rules} onChange={(e) => set('rules', e.target.value)} /></Field></div>
          </div></Card>
        )}
        {tab === 'seo' && (
          <Card title="SEO"><div className="grid gap-3">
            <Field label="SEO title" error={err('seoTitle')} hint={`${f.seoTitle.length}/120 — blank uses the property name`}><input className={inputCls} maxLength={120} value={f.seoTitle} onChange={(e) => set('seoTitle', e.target.value)} /></Field>
            <Field label="Meta description" error={err('seoDescription')} hint={`${f.seoDescription.length}/320`}><textarea className={inputCls} rows={3} maxLength={320} value={f.seoDescription} onChange={(e) => set('seoDescription', e.target.value)} /></Field>
          </div></Card>
        )}
        {tab === 'publish' && (
          <Card title="Publication settings"><div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-3">
              <label className="flex items-start gap-2 text-sm"><input type="checkbox" className="mt-1" checked={f.isPublished} onChange={(e) => set('isPublished', e.target.checked)} /><span><strong>Published</strong><br /><span className="text-xs text-stone-500">Visible on the public website once saved. Incomplete properties cannot be published.</span></span></label>
              <label className="flex items-start gap-2 text-sm"><input type="checkbox" className="mt-1" checked={f.isFeatured} onChange={(e) => set('isFeatured', e.target.checked)} /><span><strong>Featured</strong><br /><span className="text-xs text-stone-500">Enables the “Featured only” filter and priority placement.</span></span></label>
              {T({ k: 'displayOrder', label: "Display order", type: "number", min: 0, hint: "Lower numbers appear first." })}
            </div>
            <div className="text-sm text-stone-600 space-y-1">
              {data?.isDemo && <p className="text-amber-800 bg-amber-50 border border-amber-200 rounded-md p-2.5">Demo content — flagged as sample on the website.</p>}
              {!isNew && <p>Last saved: {data ? new Date(data.updatedAt).toLocaleString('en-GB') : ''}</p>}
              <p>Use <strong>Save as draft</strong> to keep it hidden, or <strong>Save &amp; publish</strong> to go live. Use <strong>Preview</strong> to see exactly how it will look.</p>
            </div>
          </div></Card>
        )}
      </div>

      <div className="mt-5 flex items-center justify-between text-xs text-stone-500">
        <button type="button" className={btnGhost} disabled={tab === TABS[0].id} onClick={() => setTab(TABS[Math.max(0, TABS.findIndex((t) => t.id === tab) - 1)].id)}>← Previous</button>
        <span>{dirty ? 'Unsaved changes' : 'All changes saved'}</span>
        <button type="button" className={btnGhost} disabled={tab === TABS[TABS.length - 1].id} onClick={() => setTab(TABS[Math.min(TABS.length - 1, TABS.findIndex((t) => t.id === tab) + 1)].id)}>Next →</button>
      </div>

      {confirmDelete && (
        <Dialog title="Delete this property?" onClose={() => setConfirmDelete(false)}>
          <p className="text-sm text-stone-700 mb-4">“{data?.name}” will be permanently removed from the website. Enquiries already received are kept. This cannot be undone.</p>
          <div className="flex justify-end gap-2"><button className={btnGhost} onClick={() => setConfirmDelete(false)}>Cancel</button>
            <button className="px-4 py-2 text-sm font-semibold rounded-md bg-rose-700 text-white hover:bg-rose-800" onClick={async () => { try { await adminApi.deleteVilla(id!); setDirty(false); reloadMeta(); nav('/admin/villas'); } catch (e) { setConfirmDelete(false); setMsg({ ok: false, text: e instanceof ApiError ? e.message : 'Could not delete.' }); } }}>Delete permanently</button></div>
        </Dialog>
      )}
      <VillaDetailModal villa={preview} preview onClose={() => setPreview(null)} onBookEnquiry={() => undefined} />
    </div>
  );
};
