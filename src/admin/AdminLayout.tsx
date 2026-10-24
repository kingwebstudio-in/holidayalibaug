import React, { useEffect, useState } from 'react';
import { Link, NavLink, Navigate, Outlet, useLocation } from 'react-router-dom';
import { FlaskConical, ImageIcon, LayoutDashboard, CalendarCheck, Building2, KeyRound, TrendingUp, Quote, Settings, ShieldCheck, LogOut, Menu, X, ExternalLink } from 'lucide-react';
import { useAuth } from './AuthContext';
import { useScrollLock } from '../hooks/useScrollLock';
import { Spinner } from './ui';
import { adminApi } from '../services/adminApi';
import type { AdminMeta } from '../types';

export interface AdminOutletContext { meta: AdminMeta | null; reloadMeta: () => void }

const NAV = [
  { to: '/admin', label: 'Overview', icon: LayoutDashboard, end: true },
  { to: '/admin/bookings', label: 'Booking Enquiries', icon: CalendarCheck },
  { to: '/admin/villas', label: 'Properties', icon: Building2 },
  { to: '/admin/owner-enquiries', label: 'Villa-owner Enquiries', icon: KeyRound },
  { to: '/admin/investment-enquiries', label: 'Property Investment', icon: TrendingUp },
  { to: '/admin/testimonials', label: 'Testimonials', icon: Quote },
  { to: '/admin/media', label: 'Website Content / Media', icon: ImageIcon },
  { to: '/admin/settings', label: 'Website Settings', icon: Settings },
  { to: '/admin/account', label: 'Account & Security', icon: ShieldCheck },
];

const crumbs = (path: string) => {
  const parts = path.replace(/^\/admin\/?/, '').split('/').filter(Boolean);
  const hit = NAV.find((n) => n.to === `/admin/${parts[0] ?? ''}`.replace(/\/$/, ''));
  return [{ label: 'Admin', to: '/admin' }, ...(hit && parts[0] ? [{ label: hit.label, to: hit.to }] : []), ...(parts[1] ? [{ label: parts[1] === 'new' ? 'New' : 'Details', to: '' }] : [])];
};

export const AdminLayout: React.FC = () => {
  const { admin, loading, logout } = useAuth();
  const [drawer, setDrawer] = useState(false);
  const loc = useLocation();
  const [meta, setMeta] = useState<AdminMeta | null>(null);
  const [metaNonce, setMetaNonce] = useState(0);
  useEffect(() => { if (admin) adminApi.meta().then(setMeta).catch(() => setMeta(null)); }, [admin, metaNonce]);
  useScrollLock(drawer);
  useEffect(() => setDrawer(false), [loc.pathname]);
  useEffect(() => {
    document.title = 'Admin · HolidayAlibag';
    const m = document.createElement('meta'); m.name = 'robots'; m.content = 'noindex,nofollow'; document.head.appendChild(m);
    return () => { m.remove(); };
  }, []);

  if (loading) return <div className="min-h-dvh bg-stone-100 flex items-center justify-center"><Spinner label="Checking your session…" /></div>;
  if (!admin) return <Navigate to="/admin/login" replace state={{ from: loc.pathname }} />;

  const sidebar = (
    <div className="flex flex-col h-full bg-[#062722] text-white">
      <div className="px-5 py-5 border-b border-white/10">
        <div className="font-editorial text-2xl font-semibold">Holiday<span className="text-[#E8C77F]">Alibag</span></div>
        <div className="text-[10px] tracking-[0.2em] uppercase text-white/50 mt-0.5">Management console</div>
      </div>
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-0.5" aria-label="Admin">
        {NAV.map((n) => (
          <NavLink key={n.to} to={n.to} end={n.end} className={({ isActive }) => `flex items-center gap-3 px-3 py-2.5 rounded-md text-sm transition-colors ${isActive ? 'bg-white/10 text-[#E8C77F] font-semibold' : 'text-white/75 hover:bg-white/5 hover:text-white'}`}>
            <n.icon className="w-4 h-4 shrink-0" />{n.label}
          </NavLink>
        ))}
      </nav>
      <div className="p-3 border-t border-white/10 space-y-1">
        <a href="/" target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 px-3 py-2 rounded-md text-sm text-white/70 hover:bg-white/5"><ExternalLink className="w-4 h-4" />View public site</a>
        <button onClick={() => logout()} className="w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm text-white/70 hover:bg-white/5 text-left"><LogOut className="w-4 h-4" />Log out</button>
      </div>
    </div>
  );

  const bc = crumbs(loc.pathname);
  return (
    <div className="min-h-dvh bg-stone-100 text-stone-900 font-sans lg:grid lg:grid-cols-[260px_1fr]">
      <aside className="hidden lg:block sticky top-0 h-dvh">{sidebar}</aside>

      {drawer && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div className="w-72 max-w-[85vw] h-full shadow-xl">{sidebar}</div>
          <button aria-label="Close menu" className="flex-1 bg-black/50" onClick={() => setDrawer(false)} />
        </div>
      )}

      <div className="min-w-0 flex flex-col min-h-dvh">
        <header className="sticky top-0 z-30 bg-white/95 backdrop-blur border-b border-stone-200 px-4 sm:px-6 h-14 flex items-center gap-3">
          <button className="lg:hidden p-2 -ml-2 rounded hover:bg-stone-100" onClick={() => setDrawer(true)} aria-label="Open menu" aria-expanded={drawer}><Menu className="w-5 h-5" /></button>
          <nav aria-label="Breadcrumb" className="text-sm text-stone-500 truncate flex-1">
            {bc.map((b, i) => (
              <span key={i}>{i > 0 && <span className="mx-1.5">/</span>}{b.to && i < bc.length - 1 ? <Link to={b.to} className="hover:text-stone-900">{b.label}</Link> : <span className="text-stone-800 font-medium">{b.label}</span>}</span>
            ))}
          </nav>
          <div className="text-right leading-tight">
            <div className="text-sm font-medium truncate max-w-[40vw]">{admin.name}</div>
            <div className="text-[11px] text-stone-500 capitalize">{admin.role}</div>
          </div>
          <button onClick={() => logout()} className="hidden sm:inline-flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-md border border-stone-300 hover:bg-stone-50"><LogOut className="w-4 h-4" />Logout</button>
        </header>
        {meta?.environment.dataMode === 'local' && (
          <div role="status" className="flex items-center gap-2 px-4 sm:px-6 py-2 bg-amber-100 border-b border-amber-300 text-xs text-amber-900">
            <FlaskConical className="w-4 h-4 shrink-0" />
            <span><strong>Local demo mode.</strong> Data lives on this machine only{meta.environment.database.demoProperties ? ` and includes ${meta.environment.database.demoProperties} sample properties` : ''}. Set <code>DATABASE_URL</code> to use Supabase.</span>
          </div>
        )}
        {meta && meta.environment.dataMode === 'postgres' && meta.environment.database.demoProperties > 0 && (
          <div role="status" className="flex items-center gap-2 px-4 sm:px-6 py-2 bg-amber-50 border-b border-amber-200 text-xs text-amber-900">
            <FlaskConical className="w-4 h-4 shrink-0" /><span>{meta.environment.database.demoProperties} sample (demo) properties are in this database. Delete them before launch (filter the Properties list by “Demo”).</span>
          </div>
        )}
        <main className="flex-1 p-4 sm:p-6 max-w-[1400px] w-full mx-auto"><Outlet context={{ meta, reloadMeta: () => setMetaNonce((n) => n + 1) } satisfies AdminOutletContext} /></main>
      </div>
    </div>
  );
};
