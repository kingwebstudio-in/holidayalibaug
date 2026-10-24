import React from 'react';
import { Link, useOutletContext } from 'react-router-dom';
import { CheckCircle2, AlertTriangle } from 'lucide-react';
import type { AdminOutletContext } from '../AdminLayout';
import { adminApi } from '../../services/adminApi';
import { Card, Empty, ErrorBox, PageTitle, Spinner, StatusBadge, fmtDate, fmtDateTime, useAsync } from '../ui';

const Stat: React.FC<{ label: string; value: number; to?: string; accent?: boolean }> = ({ label, value, to, accent }) => {
  const body = (
    <div className={`rounded-lg border p-4 h-full ${accent ? 'bg-[#092D28] text-white border-[#092D28]' : 'bg-white border-stone-200'}`}>
      <div className={`text-[11px] uppercase tracking-wider font-semibold ${accent ? 'text-white/70' : 'text-stone-500'}`}>{label}</div>
      <div className="text-3xl font-semibold mt-1 tabular-nums">{value}</div>
    </div>
  );
  return to ? <Link to={to} className="block hover:shadow-md transition-shadow rounded-lg">{body}</Link> : body;
};

export const OverviewPage: React.FC = () => {
  const { data: d, loading, error, reload } = useAsync(() => adminApi.dashboard(), []);
  const { meta } = useOutletContext<AdminOutletContext>();
  const env = meta?.environment;
  const row = (label: string, ok: boolean | null, text: string) => (
    <li className="flex items-start gap-2 py-1.5 text-sm">{ok === null ? <span className="w-4" /> : ok ? <CheckCircle2 className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" /> : <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />}<span><span className="text-stone-500">{label}: </span>{text}</span></li>
  );
  return (
    <>
      <PageTitle title="Overview" sub="Live figures from the database." />
      {env && (
        <Card title="Environment" className="mb-5">
          <ul className="grid md:grid-cols-2 gap-x-8">
            {row('Data mode', env.dataMode === 'postgres', env.dataMode === 'postgres' ? `PostgreSQL (${env.database.host}${env.database.tls ? ', TLS' : ''})` : 'Local demo (embedded database on this machine)')}
            {row('Database', env.database.connected && env.database.pendingMigrations.length === 0, env.database.connected ? (env.database.pendingMigrations.length ? `Pending migrations: ${env.database.pendingMigrations.join(', ')}` : `Connected · ${env.database.totalProperties} properties`) : (env.database.error ?? 'Not connected'))}
            {row('Image uploads', env.imageStorage.configured, env.imageStorage.configured ? `Cloudinary enabled` : env.imageStorage.partiallyConfigured ? 'Cloudinary partly configured — uploads disabled' : 'Not configured — add images by URL')}
            {row('E-mail alerts', env.email.configured, env.email.configured ? 'SMTP configured' : 'Not configured (enquiries are still saved)')}
            {row('Environment', null, env.nodeEnv)}
            {row('Demo properties', env.database.demoProperties === 0, `${env.database.demoProperties}`)}
          </ul>
          {env.warnings.length > 0 && <ul className="mt-3 text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-md p-3 space-y-1 list-disc pl-6">{env.warnings.map((w) => <li key={w}>{w}</li>)}</ul>}
        </Card>
      )}
      {loading && <Spinner />}
      {!!error && <ErrorBox error={error} onRetry={reload} />}
      {d && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3 mb-6">
            <Stat label="Published villas" value={d.publishedVillas} to="/admin/villas" />
            <Stat label="Booking enquiries" value={d.totalBookings} to="/admin/bookings" />
            <Stat label="Pending enquiries" value={d.pendingBookings} to="/admin/bookings?status=Pending" accent />
            <Stat label="Confirmed bookings" value={d.confirmedBookings} to="/admin/bookings?status=Confirmed" />
            <Stat label="New owner enquiries" value={d.newOwnerEnquiries} to="/admin/owner-enquiries?status=New" />
            <Stat label="New investment enquiries" value={d.newInvestmentEnquiries} to="/admin/investment-enquiries?status=New" />
          </div>
          <Card title="Recent booking enquiries" actions={<span className="text-xs text-stone-500">{d.bookingsLast7Days} in the last 7 days</span>}>
            {d.recentBookings.length === 0 ? <Empty>No booking enquiries yet. They will appear here as soon as guests submit the form.</Empty> : (
              <div className="overflow-x-auto -mx-4">
                <table className="w-full text-sm min-w-[720px]">
                  <thead><tr className="text-left text-[11px] uppercase tracking-wider text-stone-500 border-b">
                    <th className="px-4 py-2">Reference</th><th className="px-2 py-2">Customer</th><th className="px-2 py-2">Villa</th><th className="px-2 py-2">Dates</th><th className="px-2 py-2">Guests</th><th className="px-2 py-2">Submitted</th><th className="px-2 py-2">Status</th><th className="px-4 py-2" />
                  </tr></thead>
                  <tbody>
                    {d.recentBookings.map((b) => (
                      <tr key={b.id} className="border-b last:border-0 hover:bg-stone-50">
                        <td className="px-4 py-2.5 font-mono text-xs">{b.reference}</td>
                        <td className="px-2 py-2.5">{b.customerName}</td>
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
            )}
          </Card>
        </>
      )}
    </>
  );
};
