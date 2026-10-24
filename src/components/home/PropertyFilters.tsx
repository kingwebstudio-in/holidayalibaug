import React from 'react';
import { RotateCcw, Search, SlidersHorizontal } from 'lucide-react';
import type { VillaFacets, VillaFilters } from '../../types';

interface Props {
  facets: VillaFacets | null;
  value: VillaFilters;
  onChange: (next: VillaFilters) => void;
  onReset: () => void;
  activeCount: number;
}

const field = 'w-full px-2.5 py-1.5 text-[11.5px] bg-white border border-[#DDD8CF] rounded-[5px] text-[#171916] focus:outline-none focus:ring-1 focus:ring-[#D8AD57]';
const label = 'block text-[11px] uppercase tracking-wider font-semibold text-[#6B665D] mb-1';

/** Filters offer only values that exist in the catalogue; price controls appear only when listings have prices. */
export const PropertyFilters: React.FC<Props> = ({ facets, value, onChange, onReset, activeCount }) => {
  const set = (patch: Partial<VillaFilters>) => onChange({ ...value, ...patch, page: 1 });
  const guestChoices = [2, 4, 6, 8, 10, 12, 15, 20].filter((n) => !facets || n <= Math.max(facets.maxGuests, 2));
  const bedChoices = Array.from({ length: Math.min(facets?.maxBedrooms ?? 6, 8) }, (_, i) => i + 1);

  return (
    <form onSubmit={(e) => e.preventDefault()} role="search" aria-label="Filter properties" className="mb-4 p-3 bg-white border border-[#EAE3D8] rounded-[10px] shadow-xs">
      <div className="flex items-center justify-between mb-2.5">
        <span className="flex items-center gap-1.5 text-[11px] font-semibold text-[#171916]"><SlidersHorizontal className="w-3.5 h-3.5 text-[#B58B35]" />Find your stay</span>
        {activeCount > 0 && (
          <button type="button" onClick={onReset} className="flex items-center gap-1 text-[12px] font-semibold text-[#7A5410] hover:text-[#171916]"><RotateCcw className="w-3 h-3" />Reset filters ({activeCount})</button>
        )}
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-6 gap-2.5">
        <div className="col-span-2 md:col-span-2 xl:col-span-2">
          <label className={label} htmlFor="pf-q">Search</label>
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-[#6B665D]" />
            <input id="pf-q" className={`${field} pl-8`} placeholder="Name or area" value={value.q ?? ''} maxLength={100} onChange={(e) => set({ q: e.target.value || undefined })} />
          </div>
        </div>
        <div>
          <label className={label} htmlFor="pf-loc">Location</label>
          <select id="pf-loc" className={field} value={value.location ?? ''} onChange={(e) => set({ location: e.target.value || undefined })}>
            <option value="">Any location</option>
            {facets?.locations.map((l) => <option key={l.value} value={l.value}>{l.value} ({l.count})</option>)}
          </select>
        </div>
        <div>
          <label className={label} htmlFor="pf-type">Property type</label>
          <select id="pf-type" className={field} value={value.type ?? ''} onChange={(e) => set({ type: e.target.value || undefined })}>
            <option value="">Any type</option>
            {facets?.propertyTypes.map((t) => <option key={t.value} value={t.value}>{t.value} ({t.count})</option>)}
          </select>
        </div>
        <div>
          <label className={label} htmlFor="pf-guests">Guests</label>
          <select id="pf-guests" className={field} value={value.guests ?? ''} onChange={(e) => set({ guests: e.target.value ? Number(e.target.value) : undefined })}>
            <option value="">Any</option>
            {guestChoices.map((n) => <option key={n} value={n}>{n}+ guests</option>)}
          </select>
        </div>
        <div>
          <label className={label} htmlFor="pf-beds">Bedrooms</label>
          <select id="pf-beds" className={field} value={value.bedrooms ?? ''} onChange={(e) => set({ bedrooms: e.target.value ? Number(e.target.value) : undefined })}>
            <option value="">Any</option>
            {bedChoices.map((n) => <option key={n} value={n}>{n}+ bedrooms</option>)}
          </select>
        </div>
        {facets?.priceRange && (
          <>
            <div>
              <label className={label} htmlFor="pf-min">Min price (₹)</label>
              <input id="pf-min" type="number" inputMode="numeric" min={0} className={field} placeholder={String(facets.priceRange.min)} value={value.minPrice ?? ''} onChange={(e) => set({ minPrice: e.target.value ? Number(e.target.value) : undefined })} />
            </div>
            <div>
              <label className={label} htmlFor="pf-max">Max price (₹)</label>
              <input id="pf-max" type="number" inputMode="numeric" min={0} className={field} placeholder={String(facets.priceRange.max)} value={value.maxPrice ?? ''} onChange={(e) => set({ maxPrice: e.target.value ? Number(e.target.value) : undefined })} />
            </div>
          </>
        )}
        <div>
          <label className={label} htmlFor="pf-sort">Sort by</label>
          <select id="pf-sort" className={field} value={value.sort ?? 'order'} onChange={(e) => set({ sort: e.target.value as VillaFilters['sort'] })}>
            <option value="order">Recommended</option>
            {facets?.priceRange && <option value="price_asc">Price: low to high</option>}
            {facets?.priceRange && <option value="price_desc">Price: high to low</option>}
            <option value="guests_desc">Largest groups</option>
            <option value="newest">Newest</option>
          </select>
        </div>
        <label className="flex items-end pb-1.5 gap-2 text-[11px] text-[#42403B] cursor-pointer select-none">
          <input type="checkbox" checked={!!value.featured} onChange={(e) => set({ featured: e.target.checked || undefined })} className="rounded border-[#DDD8CF] text-[#B58B35] focus:ring-[#D8AD57]" />Featured only
        </label>
      </div>
    </form>
  );
};
