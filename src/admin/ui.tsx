import React, { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, Loader2, AlertCircle, X } from 'lucide-react';
import { ApiError } from '../services/api';

export const fmtDate = (iso: string) => {
  if (!iso) return '';
  const d = iso.length === 10 ? new Date(`${iso}T00:00:00`) : new Date(iso);
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
};
export const fmtDateTime = (iso: string) => new Date(iso).toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });

const STATUS_STYLE: Record<string, string> = {
  Pending: 'bg-amber-100 text-amber-900 border-amber-300',
  New: 'bg-amber-100 text-amber-900 border-amber-300',
  Contacted: 'bg-sky-100 text-sky-900 border-sky-300',
  'In Discussion': 'bg-violet-100 text-violet-900 border-violet-300',
  Confirmed: 'bg-emerald-100 text-emerald-900 border-emerald-300',
  Completed: 'bg-teal-100 text-teal-900 border-teal-300',
  Cancelled: 'bg-rose-100 text-rose-900 border-rose-300',
  Closed: 'bg-stone-200 text-stone-700 border-stone-300',
};
export const StatusBadge: React.FC<{ status: string }> = ({ status }) => (
  <span className={`inline-block whitespace-nowrap px-2 py-0.5 rounded-full text-[11px] font-semibold border ${STATUS_STYLE[status] ?? 'bg-stone-100 border-stone-300'}`}>{status}</span>
);

export const Spinner: React.FC<{ label?: string }> = ({ label = 'Loading…' }) => (
  <div className="flex items-center gap-2 text-sm text-stone-500 py-10 justify-center" role="status"><Loader2 className="w-4 h-4 animate-spin" />{label}</div>
);
export const ErrorBox: React.FC<{ error: unknown; onRetry?: () => void }> = ({ error, onRetry }) => (
  <div role="alert" className="flex items-start gap-2 p-3 rounded-md bg-rose-50 border border-rose-200 text-sm text-rose-800">
    <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
    <div className="flex-1">{error instanceof ApiError ? error.message : 'Something went wrong.'}</div>
    {onRetry && <button onClick={onRetry} className="font-semibold underline">Retry</button>}
  </div>
);
export const Empty: React.FC<{ children: React.ReactNode }> = ({ children }) => <div className="py-12 text-center text-sm text-stone-500">{children}</div>;

export const Card: React.FC<{ title?: React.ReactNode; actions?: React.ReactNode; children: React.ReactNode; className?: string }> = ({ title, actions, children, className = '' }) => (
  <section className={`bg-white rounded-lg border border-stone-200 shadow-sm ${className}`}>
    {(title || actions) && (
      <header className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 border-b border-stone-100">
        <h2 className="text-sm font-semibold text-stone-800">{title}</h2>{actions}
      </header>
    )}
    <div className="p-4">{children}</div>
  </section>
);

export const PageTitle: React.FC<{ title: string; sub?: string; actions?: React.ReactNode }> = ({ title, sub, actions }) => (
  <div className="flex flex-wrap items-start justify-between gap-3 mb-5">
    <div><h1 className="text-xl sm:text-2xl font-semibold text-stone-900">{title}</h1>{sub && <p className="text-sm text-stone-500 mt-0.5">{sub}</p>}</div>
    {actions}
  </div>
);

export const Pagination: React.FC<{ page: number; totalPages: number; total: number; onPage: (p: number) => void }> = ({ page, totalPages, total, onPage }) => (
  <div className="flex items-center justify-between gap-2 pt-3 text-xs text-stone-600">
    <span>{total} result{total === 1 ? '' : 's'}</span>
    <div className="flex items-center gap-2">
      <button disabled={page <= 1} onClick={() => onPage(page - 1)} aria-label="Previous page" className="p-1.5 rounded border border-stone-300 disabled:opacity-40 hover:bg-stone-50"><ChevronLeft className="w-4 h-4" /></button>
      <span>Page {page} of {totalPages}</span>
      <button disabled={page >= totalPages} onClick={() => onPage(page + 1)} aria-label="Next page" className="p-1.5 rounded border border-stone-300 disabled:opacity-40 hover:bg-stone-50"><ChevronRight className="w-4 h-4" /></button>
    </div>
  </div>
);

export const inputCls = 'w-full px-3 py-2 text-sm bg-white border border-stone-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#D8AD57]/60 focus:border-[#B58B35] disabled:bg-stone-100';
export const btnPrimary = 'inline-flex items-center justify-center gap-1.5 px-4 py-2 text-sm font-semibold rounded-md bg-[#092D28] text-white hover:bg-[#123B33] disabled:opacity-50 disabled:cursor-not-allowed transition-colors';
export const btnGhost = 'inline-flex items-center justify-center gap-1.5 px-3 py-2 text-sm font-medium rounded-md border border-stone-300 bg-white text-stone-700 hover:bg-stone-50 disabled:opacity-50 transition-colors';
export const Field: React.FC<{ label: string; hint?: string; error?: string; children: React.ReactNode; className?: string }> = ({ label, hint, error, children, className = '' }) => (
  <label className={`block ${className}`}>
    <span className="block text-xs font-semibold text-stone-600 mb-1">{label}</span>
    {children}
    {hint && !error && <span className="block text-[11px] text-stone-500 mt-1">{hint}</span>}
    {error && <span role="alert" className="block text-[11px] text-rose-700 mt-1">{error}</span>}
  </label>
);

/** Simple dialog for confirmations (focus-trapped via autofocus, closes on Escape). */
export const Dialog: React.FC<{ title: string; onClose: () => void; children: React.ReactNode }> = ({ title, onClose, children }) => {
  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', k);
    return () => document.removeEventListener('keydown', k);
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/50" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div role="dialog" aria-modal="true" aria-label={title} className="w-full max-w-md bg-white rounded-lg shadow-xl max-h-[90dvh] overflow-y-auto">
        <div className="flex items-center justify-between px-4 py-3 border-b"><h3 className="font-semibold text-stone-900">{title}</h3><button onClick={onClose} aria-label="Close"><X className="w-4 h-4" /></button></div>
        <div className="p-4">{children}</div>
      </div>
    </div>
  );
};

/** Small hook for loading remote data with loading/error/reload state. */
export function useAsync<T>(fn: () => Promise<T>, deps: unknown[]) {
  const [state, setState] = useState<{ data: T | null; loading: boolean; error: unknown }>({ data: null, loading: true, error: null });
  const [nonce, setNonce] = useState(0);
  useEffect(() => {
    let alive = true;
    setState((s) => ({ ...s, loading: true, error: null }));
    fn().then((data) => alive && setState({ data, loading: false, error: null })).catch((error) => alive && setState({ data: null, loading: false, error }));
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, nonce]);
  return { ...state, reload: () => setNonce((n) => n + 1) };
}

export function useDebounced<T>(value: T, ms = 300) {
  const [v, setV] = useState(value);
  useEffect(() => { const t = setTimeout(() => setV(value), ms); return () => clearTimeout(t); }, [value, ms]);
  return v;
}
