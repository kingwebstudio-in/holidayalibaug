import React, { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Search } from 'lucide-react';
import { adminApi } from '../../services/adminApi';
import { BOOKING_STATUSES } from '../../types';
import { Card, Empty, ErrorBox, PageTitle, Pagination, Spinner, StatusBadge, fmtDate, fmtDateTime, inputCls, useAsync, useDebounced } from '../ui';

export const BookingsPage: React.FC = () => {
  const [sp, setSp] = useSearchParams();
  const [q, setQ] = useState(sp.get('q') ?? '');
  const dq = useDebounced(q);
  const status = sp.get('status') ?? '';
  const villaId = sp.get('villaId') ?? '';
  const from = sp.get('from') ?? '';
  const to = sp.get('to') ?? '';
  const page = Number(sp.get('page') ?? 1) || 1;

  const set = (k: string, v: string) => {
    const n = new URLSearchParams(sp);
    v ? n.set(k, v) : n.delete(k);
    if (k !== 'page') n.delete('page');
    setSp(n, { replace: true });
  };
  const villas = useAsync(() => adminApi.villaOptions(), []);
  const { data, loading, error, reload } = useAsync(() => adminApi.bookings({ q: dq, status, villaId, from, to, page, pageSize: 15 }), [dq, status, villaId, from, to, page]);

  return (
    <>
      <PageTitle title="Booking enquiries" sub="Requests from guests. A request is never a confirmed booking until you confirm it." />
      <Card className="mb-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <div className="relative lg:col-span-2">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
            <input className={`${inputCls} pl-9`} placeholder="Search name, phone or reference" aria-label="Search enquiries" value={q} onChange={(e) => { setQ(e.target.value); set('page', ''); }} />
          </div>
          <select className={inputCls} aria-label="Filter by status" value={status} onChange={(e) => set('status', e.target.value)}>
            <option value="">All statuses</option>{BOOKING_STATUSES.map((s) => <option key={s}>{s}</option>)}
          </select>
          <select className={inputCls} aria-label="Filter by villa" value={villaId} onChange={(e) => set('villaId', e.target.value)}>
            <option value="">All villas</option>{villas.data?.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
          </select>
          <div className="grid grid-cols-2 gap-2 sm:col-span-2 lg:col-span-1">
            <input type="date" className={inputCls} aria-label="Check-in from" value={from} onChange={(e) => set('from', e.target.value)} />
            <input type="date" className={inputCls} aria-label="Check-in to" value={to} min={from || undefined} onChange={(e) => set('to', e.target.value)} />
          </div>
        </div>
      </Card>

      <Card>
        {loading && !data && <Spinner />}
        {!!error && <ErrorBox error={error} onRetry={reload} />}
        {data && (data.items.length === 0 ? <Empty>No enquiries match these filters.</Empty> : (
          <>
            {/* Desktop table */}
            <div className="hidden md:block overflow-x-auto -mx-4">
              <table className="w-full text-sm min-w-[860px]">
                <thead><tr className="text-left text-[11px] uppercase tracking-wider text-stone-500 border-b">
                  <th className="px-4 py-2">Reference</th><th className="px-2 py-2">Customer</th><th className="px-2 py-2">Villa</th><th className="px-2 py-2">Dates</th><th className="px-2 py-2">Guests</th><th className="px-2 py-2">Submitted</th><th className="px-2 py-2">Status</th><th className="px-4 py-2" />
                </tr></thead>
                <tbody>
                  {data.items.map((b) => (
                    <tr key={b.id} className="border-b last:border-0 hover:bg-stone-50">
                      <td className="px-4 py-2.5 font-mono text-xs">{b.reference}</td>
                      <td className="px-2 py-2.5">{b.customerName}<div className="text-xs text-stone-500">{b.phone}</div></td>
                      <td className="px-2 py-2.5">{b.villaName}</td>
                      <td className="px-2 py-2.5 whitespace-nowrap">{fmtDate(b.checkIn)} – {fmtDate(b.checkOut)}</td>
                      <td className="px-2 py-2.5">{b.adults + b.children}</td>
                      <td className="px-2 py-2.5 whitespace-nowrap text-stone-500">{fmtDateTime(b.createdAt)}</td>
                      <td className="px-2 py-2.5"><StatusBadge status={b.status} /></td>
                      <td className="px-4 py-2.5 text-right"><Link className="text-[#B58B35] font-semibold hover:underline" to={`/admin/bookings/${b.id}`}>Open</Link></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {/* Mobile cards */}
            <ul className="md:hidden space-y-3">
              {data.items.map((b) => (
                <li key={b.id} className="border border-stone-200 rounded-lg p-3">
                  <div className="flex items-start justify-between gap-2"><div><div className="font-semibold">{b.customerName}</div><div className="font-mono text-[11px] text-stone-500">{b.reference}</div></div><StatusBadge status={b.status} /></div>
                  <div className="text-sm mt-2">{b.villaName}</div>
                  <div className="text-xs text-stone-600">{fmtDate(b.checkIn)} – {fmtDate(b.checkOut)} · {b.adults + b.children} guests</div>
                  <Link to={`/admin/bookings/${b.id}`} className="mt-3 inline-flex w-full justify-center py-2 text-sm font-semibold rounded-md bg-[#092D28] text-white">Open details</Link>
                </li>
              ))}
            </ul>
            <Pagination page={data.meta.page} totalPages={data.meta.totalPages} total={data.meta.total} onPage={(p) => set('page', String(p))} />
          </>
        ))}
      </Card>
    </>
  );
};
