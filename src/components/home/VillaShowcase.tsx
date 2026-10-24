import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowRight, ChevronLeft, ChevronRight, SearchX } from 'lucide-react';
import { fetchFacets, fetchVillaPage } from '../../services/publicApi';
import { ApiError } from '../../services/api';
import { PageMeta, Villa, VillaFacets, VillaFilters } from '../../types';
import { PropertyFilters } from './PropertyFilters';
import { VillaCard } from './VillaCard';

interface VillaShowcaseProps {
  onViewDetails: (villa: Villa) => void;
  onBookNow: (villa: Villa) => void;
}

export const VillaShowcase: React.FC<VillaShowcaseProps> = ({ onViewDetails, onBookNow }) => {
  const [filters, setFilters] = useState<VillaFilters>({ pageSize: 8 });
  const [facets, setFacets] = useState<VillaFacets | null>(null);
  const [items, setItems] = useState<Villa[]>([]);
  const [meta, setMeta] = useState<PageMeta | null>(null);
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [error, setError] = useState<string | null>(null);
  const [nonce, setNonce] = useState(0);
  const gridRef = useRef<HTMLDivElement>(null);
  const debounced = useDebounce(filters, 350);

  useEffect(() => { fetchFacets().then(setFacets).catch(() => undefined); }, [nonce]);

  useEffect(() => {
    const ctl = new AbortController();
    setState((s) => (s === 'ready' ? 'ready' : 'loading'));
    fetchVillaPage(debounced, ctl.signal)
      .then((r) => { setItems(r.items); setMeta(r.meta); setState('ready'); setError(null); })
      .catch((e) => { if (e instanceof ApiError && e.code === 'aborted') return; setError(e instanceof ApiError ? e.message : 'Properties could not be loaded.'); setState('error'); });
    return () => ctl.abort();
  }, [debounced, nonce]);

  const activeCount = useMemo(() => ['q', 'location', 'type', 'guests', 'bedrooms', 'minPrice', 'maxPrice', 'featured'].filter((k) => (filters as any)[k] !== undefined).length + (filters.sort && filters.sort !== 'order' ? 1 : 0), [filters]);
  const reset = useCallback(() => setFilters({ pageSize: 8 }), []);
  const goTo = (page: number) => { setFilters((f) => ({ ...f, page })); gridRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }); };
  const catalogueEmpty = state === 'ready' && facets !== null && facets.total === 0;

  return (
    <section id="villas" className="relative w-full bg-[#FBF7EF] py-10 sm:py-14 lg:py-16">
      {/* Decorative subtle botanical foliage outline on sides */}
      <div className="absolute top-0 left-0 w-32 h-full opacity-5 pointer-events-none select-none overflow-hidden">
        <svg viewBox="0 0 100 300" className="w-full h-full text-[#092D28] fill-current">
          <path d="M10,20 Q40,60 10,120 Q50,180 15,240" stroke="currentColor" strokeWidth="2" fill="none" />
          <path d="M25,50 Q60,80 30,130" stroke="currentColor" strokeWidth="1.5" fill="none" />
        </svg>
      </div>
      <div className="absolute top-0 right-0 w-32 h-full opacity-5 pointer-events-none select-none overflow-hidden">
        <svg viewBox="0 0 100 300" className="w-full h-full text-[#092D28] fill-current">
          <path d="M90,20 Q60,60 90,120 Q50,180 85,240" stroke="currentColor" strokeWidth="2" fill="none" />
        </svg>
      </div>

      <div className="max-w-[1440px] mx-auto px-5 sm:px-8 lg:px-12">
        {/* Desktop Layout: 2-part composition with Left Column + 4 Villa Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">
          {/* Left Introductory Column */}
          <div className="lg:col-span-3 flex flex-col justify-start lg:pr-2">
            <span className="text-[11px] font-semibold tracking-[0.2em] text-[#7A5410] uppercase mb-1.5">
              Our Villas
            </span>
            <h2 className="font-editorial text-2xl sm:text-3xl lg:text-[32px] font-semibold text-[#171916] leading-[1.08] mb-3">
              Handpicked Villas for Every Moment
            </h2>
            <p className="text-xs sm:text-[13px] text-[#68675F] font-normal leading-relaxed mb-5 max-w-sm">
              Choose from our exclusive collection of private villas in Alibaug. Whether it's a family vacation, a getaway with friends or a special celebration, we have the perfect stay for you.
            </p>
            <div>
              <a
                href="#villas"
                onClick={(e) => {
                  e.preventDefault();
                  // scroll smoothly to cards
                  const el = document.getElementById('villa-collection-grid');
                  if (el) el.scrollIntoView({ behavior: 'smooth' });
                }}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-[11px] font-semibold text-[#171916] bg-[#E8C77F] hover:bg-[#D8AD57] active:scale-[0.98] rounded-[6px] shadow-xs transition-all"
              >
                <span>View All Villas</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>

          {/* Right Area: filters + paginated property cards */}
          <div className="lg:col-span-9 min-w-0">
            <PropertyFilters facets={facets} value={filters} onChange={setFilters} onReset={reset} activeCount={activeCount} />

            <div id="villa-collection-grid" ref={gridRef} className={`grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 sm:gap-4 lg:gap-3.5 scroll-mt-24 transition-opacity ${state === 'loading' && items.length ? 'opacity-60' : ''}`} aria-busy={state === 'loading'}>
              {state === 'loading' && !items.length && [0, 1, 2, 3].map((i) => <div key={i} className="h-80 rounded-[10px] bg-[#F0EAE1] animate-pulse" aria-hidden="true" />)}
              {state === 'error' && (
                <div role="alert" className="sm:col-span-2 xl:col-span-4 p-6 rounded-[10px] border border-[#EAE3D8] bg-white text-center text-xs text-[#68675F]">
                  <p className="mb-3 max-w-xl mx-auto">{error ?? 'Properties could not be loaded.'}</p>
                  <button onClick={() => setNonce((n) => n + 1)} className="px-4 py-1.5 text-[11px] font-semibold text-[#171916] bg-[#E8C77F] hover:bg-[#D8AD57] rounded">Try again</button>
                </div>
              )}
              {catalogueEmpty && (
                <div className="sm:col-span-2 xl:col-span-4 p-6 rounded-[10px] border border-[#EAE3D8] bg-white text-center text-xs text-[#68675F]">Our property collection is being updated. Please check back soon.</div>
              )}
              {state === 'ready' && !catalogueEmpty && items.length === 0 && (
                <div className="sm:col-span-2 xl:col-span-4 p-8 rounded-[10px] border border-[#EAE3D8] bg-white text-center">
                  <SearchX className="w-7 h-7 mx-auto text-[#B58B35] mb-2" />
                  <p className="text-sm font-semibold text-[#171916]">No properties match these filters</p>
                  <p className="text-xs text-[#68675F] mt-1 mb-3">Try fewer filters, a different location or a smaller group size.</p>
                  <button onClick={reset} className="px-4 py-1.5 text-[11px] font-semibold text-[#171916] bg-[#E8C77F] hover:bg-[#D8AD57] rounded">Reset filters</button>
                </div>
              )}
              {items.map((villa) => <VillaCard key={villa.id} villa={villa} onViewDetails={onViewDetails} onBookNow={onBookNow} />)}
            </div>

            {meta && meta.totalPages > 1 && (
              <nav className="flex items-center justify-between mt-5 text-[11px] text-[#68675F]" aria-label="Property pages">
                <span>{meta.total} properties · page {meta.page} of {meta.totalPages}</span>
                <div className="flex items-center gap-2">
                  <button disabled={meta.page <= 1} onClick={() => goTo(meta.page - 1)} className="flex items-center gap-1 px-3 py-1.5 rounded-[5px] border border-[#DDD8CF] bg-white font-semibold text-[#171916] disabled:opacity-40 hover:bg-[#F5EFE4]"><ChevronLeft className="w-3.5 h-3.5" />Previous</button>
                  <button disabled={meta.page >= meta.totalPages} onClick={() => goTo(meta.page + 1)} className="flex items-center gap-1 px-3 py-1.5 rounded-[5px] border border-[#DDD8CF] bg-white font-semibold text-[#171916] disabled:opacity-40 hover:bg-[#F5EFE4]">Next<ChevronRight className="w-3.5 h-3.5" /></button>
                </div>
              </nav>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};

function useDebounce<T>(value: T, ms: number): T {
  const [v, setV] = useState(value);
  useEffect(() => { const t = setTimeout(() => setV(value), ms); return () => clearTimeout(t); }, [value, ms]);
  return v;
}
