import React, { useState } from 'react';
import { Link, useOutletContext, useSearchParams } from 'react-router-dom';
import { Copy, Eye, FlaskConical, Pencil, Plus, Search, Star, Trash2 } from 'lucide-react';
import { adminApi } from '../../services/adminApi';
import { ApiError } from '../../services/api';
import { toVilla } from '../../services/publicApi';
import { SafeImage } from '../../components/common/SafeImage';
import { VillaDetailModal } from '../../components/villas/VillaDetailModal';
import type { Villa } from '../../types';
import { useAuth } from '../AuthContext';
import type { AdminOutletContext } from '../AdminLayout';
import { Card, Dialog, Empty, ErrorBox, PageTitle, Pagination, Spinner, btnGhost, btnPrimary, fmtDateTime, inputCls, useAsync, useDebounced } from '../ui';

const price = (p: number | null, c: string) => (p == null ? 'Price on enquiry' : `${c === 'INR' ? '₹' : `${c} `}${p.toLocaleString('en-IN')}`);

export const VillasPage: React.FC = () => {
  const { canEdit } = useAuth();
  const { meta, reloadMeta } = useOutletContext<AdminOutletContext>();
  const [sp, setSp] = useSearchParams();
  const [q, setQ] = useState(sp.get('q') ?? '');
  const dq = useDebounced(q);
  const status = sp.get('status') ?? '', demo = sp.get('demo') ?? '', type = sp.get('type') ?? '', featured = sp.get('featured') ?? '', sort = sp.get('sort') ?? 'updated';
  const page = Number(sp.get('page') ?? 1) || 1;
  const set = (k: string, v: string) => { const n = new URLSearchParams(sp); v ? n.set(k, v) : n.delete(k); if (k !== 'page') n.delete('page'); setSp(n, { replace: true }); };

  const { data, loading, error, reload } = useAsync(() => adminApi.villas({ q: dq, status, demo, type, featured, sort, page, pageSize: 15 }), [dq, status, demo, type, featured, sort, page]);
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [toDelete, setToDelete] = useState<{ id: string; name: string; isDemo: boolean } | null>(null);
  const [preview, setPreview] = useState<Villa | null>(null);

  const act = async (id: string, fn: () => Promise<unknown>, ok: string) => {
    setBusy(id); setMsg(null);
    try { await fn(); setMsg({ ok: true, text: ok }); reload(); reloadMeta(); }
    catch (e) { setMsg({ ok: false, text: e instanceof ApiError ? e.message : 'Could not complete that action.' }); }
    finally { setBusy(null); }
  };
  const openPreview = async (id: string) => {
    try { setPreview(toVilla(await adminApi.villa(id))); } catch (e) { setMsg({ ok: false, text: e instanceof ApiError ? e.message : 'Could not load the preview.' }); }
  };

  return (
    <>
      <PageTitle title="Properties" sub="Everything here is managed dynamically — published properties appear on the public website immediately." actions={canEdit && <Link to="/admin/villas/new" className={btnPrimary}><Plus className="w-4 h-4" />Add new property</Link>} />
      {msg && <div role={msg.ok ? 'status' : 'alert'} className={`mb-3 p-3 text-sm rounded-md border ${msg.ok ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-rose-50 border-rose-200 text-rose-800'}`}>{msg.text}</div>}

      <Card className="mb-4">
        <div className="grid grid-cols-2 lg:grid-cols-6 gap-3">
          <div className="relative col-span-2 lg:col-span-2"><Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" /><input className={`${inputCls} pl-9`} placeholder="Search by name or location" aria-label="Search properties" value={q} onChange={(e) => { setQ(e.target.value); set('page', ''); }} /></div>
          <select className={inputCls} aria-label="Status" value={status} onChange={(e) => set('status', e.target.value)}><option value="">All statuses</option><option value="published">Published</option><option value="draft">Draft</option></select>
          <select className={inputCls} aria-label="Demo content" value={demo} onChange={(e) => set('demo', e.target.value)}><option value="">Real + demo</option><option value="true">Demo only</option><option value="false">Real only</option></select>
          <select className={inputCls} aria-label="Property type" value={type} onChange={(e) => set('type', e.target.value)}><option value="">All types</option>{meta?.propertyTypes.map((t) => <option key={t}>{t}</option>)}</select>
          <select className={inputCls} aria-label="Sort" value={sort} onChange={(e) => set('sort', e.target.value)}>
            <option value="updated">Recently updated</option><option value="name">Name</option><option value="order">Display order</option><option value="price_asc">Price ↑</option><option value="price_desc">Price ↓</option>
          </select>
        </div>
      </Card>

      {loading && !data && <Spinner />}
      {!!error && <ErrorBox error={error} onRetry={reload} />}
      {data && (data.items.length === 0 ? (
        <Card><Empty>{status || demo || type || dq ? 'No properties match these filters.' : 'No properties yet. Click “Add new property” to create your first listing.'}</Empty></Card>
      ) : (
        <Card>
          <div className="hidden lg:block overflow-x-auto -mx-4">
            <table className="w-full text-sm min-w-[980px]">
              <thead><tr className="text-left text-[11px] uppercase tracking-wider text-stone-500 border-b"><th className="px-4 py-2">Property</th><th className="px-2 py-2">Location</th><th className="px-2 py-2">Price</th><th className="px-2 py-2">Rooms / guests</th><th className="px-2 py-2">Status</th><th className="px-2 py-2">Updated</th><th className="px-4 py-2 text-right">Actions</th></tr></thead>
              <tbody>
                {data.items.map((v) => (
                  <tr key={v.id} className="border-b last:border-0 hover:bg-stone-50 align-middle">
                    <td className="px-4 py-2.5"><div className="flex items-center gap-3"><div className="w-16 h-11 rounded overflow-hidden bg-stone-200 shrink-0"><SafeImage src={v.image ?? ''} alt="" className="w-full h-full object-cover" /></div>
                      <div className="min-w-0"><div className="font-medium truncate max-w-[220px]">{v.name}</div><div className="text-xs text-stone-500 truncate max-w-[220px]">{v.propertyType}</div></div></div></td>
                    <td className="px-2 py-2.5">{v.location || '—'}</td>
                    <td className="px-2 py-2.5 whitespace-nowrap">{price(v.startingPrice, v.currency)}{v.isDemo && v.startingPrice != null && <span className="ml-1 text-[10px] text-amber-700">(sample)</span>}</td>
                    <td className="px-2 py-2.5 whitespace-nowrap">{v.bedrooms} bed · {v.bathrooms} bath · {v.maxGuests} guests</td>
                    <td className="px-2 py-2.5"><div className="flex flex-wrap gap-1">
                      <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${v.isPublished ? 'bg-emerald-100 text-emerald-900 border-emerald-300' : 'bg-stone-100 text-stone-600 border-stone-300'}`}>{v.isPublished ? 'Published' : 'Draft'}</span>
                      {v.isFeatured && <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full border bg-yellow-100 text-yellow-900 border-yellow-300 inline-flex items-center gap-1"><Star className="w-3 h-3" />Featured</span>}
                      {v.isDemo && <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full border bg-amber-100 text-amber-900 border-amber-300 inline-flex items-center gap-1"><FlaskConical className="w-3 h-3" />Demo</span>}</div></td>
                    <td className="px-2 py-2.5 text-xs text-stone-500 whitespace-nowrap">{fmtDateTime(v.updatedAt)}</td>
                    <td className="px-4 py-2.5"><Actions v={v} busy={busy === v.id} canEdit={canEdit} onPreview={() => openPreview(v.id)} onToggle={() => act(v.id, () => adminApi.publishVilla(v.id, !v.isPublished), v.isPublished ? 'Unpublished.' : 'Published — it is now live on the website.')} onFeature={() => act(v.id, () => adminApi.featureVilla(v.id, !v.isFeatured), v.isFeatured ? 'Removed from featured.' : 'Marked as featured.')} onDuplicate={() => act(v.id, () => adminApi.duplicateVilla(v.id), 'Duplicated as a draft.')} onDelete={() => setToDelete({ id: v.id, name: v.name, isDemo: v.isDemo })} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <ul className="lg:hidden space-y-3">
            {data.items.map((v) => (
              <li key={v.id} className="border border-stone-200 rounded-lg overflow-hidden">
                <div className="flex gap-3 p-3"><div className="w-20 h-16 rounded overflow-hidden bg-stone-200 shrink-0"><SafeImage src={v.image ?? ''} alt="" className="w-full h-full object-cover" /></div>
                  <div className="min-w-0 flex-1"><div className="font-semibold truncate">{v.name}</div><div className="text-xs text-stone-500 truncate">{v.location || '—'} · {v.propertyType}</div>
                    <div className="text-xs mt-0.5">{price(v.startingPrice, v.currency)} · {v.bedrooms} bed · {v.maxGuests} guests</div>
                    <div className="flex flex-wrap gap-1 mt-1.5"><span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full border ${v.isPublished ? 'bg-emerald-100 text-emerald-900 border-emerald-300' : 'bg-stone-100 text-stone-600 border-stone-300'}`}>{v.isPublished ? 'Published' : 'Draft'}</span>{v.isFeatured && <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full border bg-yellow-100 border-yellow-300">Featured</span>}{v.isDemo && <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full border bg-amber-100 border-amber-300">Demo</span>}</div></div></div>
                <div className="border-t bg-stone-50 px-3 py-2"><Actions v={v} busy={busy === v.id} canEdit={canEdit} onPreview={() => openPreview(v.id)} onToggle={() => act(v.id, () => adminApi.publishVilla(v.id, !v.isPublished), v.isPublished ? 'Unpublished.' : 'Published — it is now live on the website.')} onFeature={() => act(v.id, () => adminApi.featureVilla(v.id, !v.isFeatured), v.isFeatured ? 'Removed from featured.' : 'Marked as featured.')} onDuplicate={() => act(v.id, () => adminApi.duplicateVilla(v.id), 'Duplicated as a draft.')} onDelete={() => setToDelete({ id: v.id, name: v.name, isDemo: v.isDemo })} /></div>
              </li>
            ))}
          </ul>
          <Pagination page={data.meta.page} totalPages={data.meta.totalPages} total={data.meta.total} onPage={(p) => set('page', String(p))} />
        </Card>
      ))}

      {toDelete && (
        <Dialog title="Delete this property?" onClose={() => setToDelete(null)}>
          <p className="text-sm text-stone-700 mb-2">You are about to permanently delete <strong>{toDelete.name}</strong>{toDelete.isDemo ? ' (demo content)' : ''}. It will disappear from the website and its images will be removed from storage if no other property uses them.</p>
          <p className="text-xs text-stone-500 mb-4">Existing enquiries are kept (with the property name as it was). This cannot be undone. To hide a property temporarily, unpublish it instead.</p>
          <div className="flex justify-end gap-2"><button className={btnGhost} onClick={() => setToDelete(null)}>Cancel</button>
            <button className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold rounded-md bg-rose-700 text-white hover:bg-rose-800" onClick={() => { const t = toDelete; setToDelete(null); act(t.id, () => adminApi.deleteVilla(t.id), `Deleted “${t.name}”.`); }}>Delete permanently</button></div>
        </Dialog>
      )}
      <VillaDetailModal villa={preview} preview onClose={() => setPreview(null)} onBookEnquiry={() => undefined} />
    </>
  );
};

const Actions: React.FC<{ v: { isPublished: boolean; isFeatured: boolean; id: string }; busy: boolean; canEdit: boolean; onPreview: () => void; onToggle: () => void; onFeature: () => void; onDuplicate: () => void; onDelete: () => void }> = ({ v, busy, canEdit, onPreview, onToggle, onFeature, onDuplicate, onDelete }) => (
  <div className="flex flex-wrap items-center gap-1.5 lg:justify-end">
    <button className={btnGhost} onClick={onPreview} title="Preview" aria-label="Preview"><Eye className="w-4 h-4" /></button>
    {canEdit && <>
      <Link to={`/admin/villas/${v.id}`} className={btnGhost} title="Edit" aria-label="Edit"><Pencil className="w-4 h-4" /></Link>
      <button className={btnGhost} disabled={busy} onClick={onToggle}>{v.isPublished ? 'Unpublish' : 'Publish'}</button>
      <button className={btnGhost} disabled={busy} onClick={onFeature} title={v.isFeatured ? 'Remove featured' : 'Mark featured'} aria-label="Toggle featured"><Star className={`w-4 h-4 ${v.isFeatured ? 'fill-yellow-400 text-yellow-600' : ''}`} /></button>
      <button className={btnGhost} disabled={busy} onClick={onDuplicate} title="Duplicate as draft" aria-label="Duplicate"><Copy className="w-4 h-4" /></button>
      <button className={`${btnGhost} text-rose-700`} disabled={busy} onClick={onDelete} title="Delete" aria-label="Delete"><Trash2 className="w-4 h-4" /></button>
    </>}
  </div>
);
