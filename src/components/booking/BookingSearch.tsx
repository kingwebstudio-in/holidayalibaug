import React, { useCallback, useEffect, useId, useRef, useState } from 'react';
import { Building2, Calendar, Users, ChevronDown, ArrowRight, Minus, Plus, RefreshCw } from 'lucide-react';
import { useSiteData } from '../../context/SiteDataContext';
import { FloatingPanel } from '../common/FloatingPanel';
import { addDaysISO, toLocalISODate } from '../../lib/validation';

interface BookingSearchParams {
  villaId: string;
  villaName: string;
  checkIn: string;
  checkOut: string;
  adults: number;
  children: number;
}

interface BookingSearchProps {
  onCheckAvailability: (params: BookingSearchParams) => void;
}

export const BookingSearch: React.FC<BookingSearchProps> = ({ onCheckAvailability }) => {
  const { villas, status, reload } = useSiteData();
  const today = toLocalISODate(new Date());
  const [selectedVillaId, setSelectedVillaId] = useState<string>('any');
  const [checkIn, setCheckIn] = useState<string>(addDaysISO(today, 4));
  const [checkOut, setCheckOut] = useState<string>(addDaysISO(today, 7));
  const [adults, setAdults] = useState<number>(4);
  const [children, setChildren] = useState<number>(0);

  const [isVillaOpen, setIsVillaOpen] = useState(false);
  const [isGuestsOpen, setIsGuestsOpen] = useState(false);
  const [activeIdx, setActiveIdx] = useState(0);

  const villaRef = useRef<HTMLDivElement>(null);
  const guestsRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const listId = useId();

  // Option 0 is "Any Villa"; the rest are the published villas from the API.
  const options = [{ id: 'any', name: 'Any Villa (All Collection)', specs: '' }, ...villas.map((v) => ({ id: v.id, name: v.name, specs: v.specs }))];
  const selected = villas.find((v) => v.id === selectedVillaId);
  const villaDisplayName = selected ? selected.name : 'Any Villa';

  // If the selected villa disappears (unpublished), fall back to "any".
  useEffect(() => {
    if (selectedVillaId !== 'any' && status === 'ready' && !selected) setSelectedVillaId('any');
  }, [selectedVillaId, selected, status]);

  const closeVilla = useCallback(() => setIsVillaOpen(false), []);
  const closeGuests = useCallback(() => setIsGuestsOpen(false), []);

  const openVilla = () => {
    setIsGuestsOpen(false);
    setActiveIdx(Math.max(0, options.findIndex((o) => o.id === selectedVillaId)));
    setIsVillaOpen(true);
  };

  // Keep the active (or selected) option scrolled into view inside the list.
  useEffect(() => {
    if (!isVillaOpen) return;
    // Scroll only the list itself (scrollIntoView could also scroll the page).
    const list = listRef.current;
    const el = list?.querySelector<HTMLElement>(`[data-idx="${activeIdx}"]`);
    if (list && el) {
      if (el.offsetTop < list.scrollTop) list.scrollTop = el.offsetTop;
      else if (el.offsetTop + el.offsetHeight > list.scrollTop + list.clientHeight) list.scrollTop = el.offsetTop + el.offsetHeight - list.clientHeight;
    }
  }, [isVillaOpen, activeIdx, options.length, status]);

  // Move focus into the list when it opens so arrow keys work.
  useEffect(() => {
    if (isVillaOpen) listRef.current?.focus({ preventScroll: true });
  }, [isVillaOpen]);

  const choose = (id: string) => {
    setSelectedVillaId(id);
    setIsVillaOpen(false);
    triggerRef.current?.focus({ preventScroll: true });
  };

  const onListKey = (e: React.KeyboardEvent) => {
    const last = options.length - 1;
    if (e.key === 'ArrowDown') { e.preventDefault(); setActiveIdx((i) => Math.min(last, i + 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActiveIdx((i) => Math.max(0, i - 1)); }
    else if (e.key === 'Home') { e.preventDefault(); setActiveIdx(0); }
    else if (e.key === 'End') { e.preventDefault(); setActiveIdx(last); }
    else if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); choose(options[activeIdx].id); }
    else if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); setIsVillaOpen(false); triggerRef.current?.focus({ preventScroll: true }); }
    else if (e.key === 'Tab') setIsVillaOpen(false);
  };

  const formatDisplayDate = (dStr: string) => {
    if (!dStr) return 'Select Date';
    const [y, m, d] = dStr.split('-').map(Number);
    const dt = new Date(y, m - 1, d);
    if (isNaN(dt.getTime())) return dStr;
    return dt.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  const handleCheckInChange = (newDate: string) => {
    setCheckIn(newDate);
    if (newDate && newDate >= checkOut) setCheckOut(addDaysISO(newDate, 1));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onCheckAvailability({ villaId: selectedVillaId, villaName: villaDisplayName, checkIn, checkOut, adults, children });
  };

  return (
    <div className="w-full max-w-[700px] relative z-20">
      <form
        onSubmit={handleSubmit}
        className="bg-white rounded-[9px] shadow-[0_8px_30px_rgb(0,0,0,0.14)] border border-[#E7E3DA] p-2 sm:p-2.5 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-2 md:gap-0"
      >
        {/* Field 1: Select Villa */}
        <div ref={villaRef} className="relative flex-1 px-3 py-1.5 md:py-1 cursor-pointer">
          <div
            ref={triggerRef}
            onClick={() => (isVillaOpen ? closeVilla() : openVilla())}
            className="flex flex-col text-left group focus:outline-none focus-visible:ring-2 focus-visible:ring-[#D8AD57] rounded"
            role="combobox"
            aria-haspopup="listbox"
            aria-expanded={isVillaOpen}
            aria-controls={listId}
            aria-label={`Select Villa ${villaDisplayName}`}
            tabIndex={0}
            onKeyDown={(e) => {
              // While the list is open, navigation keys belong to the list even if focus is still on the trigger
              // (otherwise Home/End scroll the whole page away from the hero).
              if (isVillaOpen && ['ArrowDown', 'ArrowUp', 'Home', 'End', 'Escape'].includes(e.key)) { onListKey(e); return; }
              if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') {
                e.preventDefault();
                isVillaOpen ? closeVilla() : openVilla();
              }
            }}
          >
            <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-wider font-semibold text-[#6B665D]">
              <Building2 className="w-3 h-3 text-[#D8AD57]" />
              <span>Select Villa</span>
            </div>
            <div className="flex items-center justify-between mt-0.5">
              <span className="text-[12.5px] font-semibold text-[#171916] truncate max-w-[110px]">{villaDisplayName}</span>
              <ChevronDown className={`w-3 h-3 text-[#6B665D] ml-1 shrink-0 transition-transform ${isVillaOpen ? 'rotate-180' : ''}`} />
            </div>
          </div>

          {/* Villa list: portalled, viewport-constrained and scrollable */}
          <FloatingPanel
            open={isVillaOpen}
            anchorRef={villaRef}
            onClose={closeVilla}
            width={256}
            panelRef={listRef}
            id={listId}
            role="listbox"
            aria-label="Villas"
            tabIndex={0}
            aria-activedescendant={`${listId}-opt-${activeIdx}`}
            onKeyDown={onListKey}
            className="py-1.5 focus:outline-none"
          >
            {status === 'loading' && <div className="px-3.5 py-3 text-xs text-[#6B665D]">Loading villas…</div>}
            {status === 'error' && (
              <div className="px-3.5 py-3 text-xs text-[#68675F] flex items-center justify-between gap-2">
                <span>Villas could not be loaded.</span>
                <button type="button" onClick={reload} className="flex items-center gap-1 font-semibold text-[#B58B35]">
                  <RefreshCw className="w-3 h-3" /> Retry
                </button>
              </div>
            )}
            {status === 'ready' &&
              options.map((o, idx) => {
                const isSel = o.id === selectedVillaId;
                return (
                  <React.Fragment key={o.id}>
                    <div
                      id={`${listId}-opt-${idx}`}
                      data-idx={idx}
                      role="option"
                      aria-selected={isSel}
                      onClick={() => choose(o.id)}
                      onMouseEnter={() => setActiveIdx(idx)}
                      className={`w-full text-left px-3.5 py-2 text-xs transition-colors flex items-center justify-between cursor-pointer ${
                        idx === activeIdx ? 'bg-[#F5EFE4]' : ''
                      } ${isSel ? 'bg-[#FBF7EF] text-[#B58B35] font-semibold' : 'text-[#171916]'}`}
                    >
                      <div>
                        <div className={o.id === 'any' ? '' : 'font-medium text-[#171916]'}>{o.name}</div>
                        {o.specs && <div className="text-[11px] text-[#6B665D] font-normal">{o.specs}</div>}
                      </div>
                      {isSel && <span className="text-[11px] text-[#D8AD57]">✓</span>}
                    </div>
                    {idx === 0 && <div className="h-[1px] bg-[#E7E3DA] my-1" role="separator" />}
                  </React.Fragment>
                );
              })}
            {status === 'ready' && villas.length === 0 && <div className="px-3.5 py-2 text-[11px] text-[#6B665D]">No villas are listed yet.</div>}
          </FloatingPanel>
        </div>

        <div className="hidden md:block w-[1px] h-7 bg-[#E7E3DA] my-auto" />

        {/* Field 2: Check In */}
        <div className="relative flex-1 px-3 py-1.5 md:py-1">
          <label className="flex items-center gap-1.5 text-[11px] uppercase tracking-wider font-semibold text-[#6B665D] cursor-pointer">
            <Calendar className="w-3 h-3 text-[#D8AD57]" />
            <span>Check In</span>
          </label>
          <div className="relative flex items-center justify-between mt-0.5">
            <span className="text-[12.5px] font-semibold text-[#171916] pointer-events-none">{formatDisplayDate(checkIn)}</span>
            <ChevronDown className="w-3 h-3 text-[#6B665D] ml-1 shrink-0 pointer-events-none" />
            <input type="date" value={checkIn} min={today} onChange={(e) => handleCheckInChange(e.target.value)} className="absolute inset-0 opacity-0 cursor-pointer w-full h-full" aria-label="Check in date" />
          </div>
        </div>

        <div className="hidden md:block w-[1px] h-7 bg-[#E7E3DA] my-auto" />

        {/* Field 3: Check Out */}
        <div className="relative flex-1 px-3 py-1.5 md:py-1">
          <label className="flex items-center gap-1.5 text-[11px] uppercase tracking-wider font-semibold text-[#6B665D] cursor-pointer">
            <Calendar className="w-3 h-3 text-[#D8AD57]" />
            <span>Check Out</span>
          </label>
          <div className="relative flex items-center justify-between mt-0.5">
            <span className="text-[12.5px] font-semibold text-[#171916] pointer-events-none">{formatDisplayDate(checkOut)}</span>
            <ChevronDown className="w-3 h-3 text-[#6B665D] ml-1 shrink-0 pointer-events-none" />
            <input type="date" value={checkOut} min={checkIn ? addDaysISO(checkIn, 1) : today} onChange={(e) => setCheckOut(e.target.value)} className="absolute inset-0 opacity-0 cursor-pointer w-full h-full" aria-label="Check out date" />
          </div>
        </div>

        <div className="hidden md:block w-[1px] h-7 bg-[#E7E3DA] my-auto" />

        {/* Field 4: Guests */}
        <div ref={guestsRef} className="relative flex-1 px-3 py-1.5 md:py-1 cursor-pointer">
          <div
            onClick={() => { setIsVillaOpen(false); setIsGuestsOpen((o) => !o); }}
            className="flex flex-col text-left group focus:outline-none focus-visible:ring-2 focus-visible:ring-[#D8AD57] rounded"
            role="button"
            aria-haspopup="dialog"
            aria-expanded={isGuestsOpen}
            tabIndex={0}
            aria-label={`Select Guests ${adults + children}`}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setIsVillaOpen(false); setIsGuestsOpen((o) => !o); }
              if (e.key === 'Escape') setIsGuestsOpen(false);
            }}
          >
            <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-wider font-semibold text-[#6B665D]">
              <Users className="w-3 h-3 text-[#D8AD57]" />
              <span>Guests</span>
            </div>
            <div className="flex items-center justify-between mt-0.5">
              <span className="text-[12.5px] font-semibold text-[#171916]">{adults + children} Guests</span>
              <ChevronDown className="w-3 h-3 text-[#6B665D] ml-1 shrink-0" />
            </div>
          </div>

          <FloatingPanel open={isGuestsOpen} anchorRef={guestsRef} onClose={closeGuests} width={256} align="right" role="dialog" aria-label="Guests" className="p-3.5">
            {([
              { label: 'Adults', hint: 'Ages 12+', value: adults, set: setAdults, min: 1, max: 20 },
              { label: 'Children', hint: 'Ages 2–11', value: children, set: setChildren, min: 0, max: 10 },
            ] as const).map((row, i) => (
              <div key={row.label} className={`flex items-center justify-between py-2 ${i === 0 ? 'border-b border-[#E7E3DA]' : ''}`}>
                <div>
                  <div className="text-xs font-semibold text-[#171916]">{row.label}</div>
                  <div className="text-[11px] text-[#6B665D]">{row.hint}</div>
                </div>
                <div className="flex items-center gap-2.5">
                  <button type="button" aria-label={`Decrease ${row.label.toLowerCase()}`} onClick={() => row.set((p) => Math.max(row.min, p - 1))} disabled={row.value <= row.min} className="w-7 h-7 rounded-full border border-[#DDD8CF] flex items-center justify-center text-[#171916] disabled:opacity-30 hover:bg-[#F5EFE4]">
                    <Minus className="w-3 h-3" />
                  </button>
                  <span className="text-xs font-semibold w-4 text-center" aria-live="polite">{row.value}</span>
                  <button type="button" aria-label={`Increase ${row.label.toLowerCase()}`} onClick={() => row.set((p) => Math.min(row.max, p + 1))} className="w-7 h-7 rounded-full border border-[#DDD8CF] flex items-center justify-center text-[#171916] hover:bg-[#F5EFE4]">
                    <Plus className="w-3 h-3" />
                  </button>
                </div>
              </div>
            ))}
            <button type="button" onClick={closeGuests} className="w-full mt-2 py-1.5 text-center text-xs font-medium text-[#171916] bg-[#F5EFE4] hover:bg-[#EAE3D8] rounded transition-colors">
              Apply Guests
            </button>
          </FloatingPanel>
        </div>

        <button
          type="submit"
          className="w-full md:w-auto px-4 py-2.5 md:py-2 text-[11px] md:text-[11.5px] font-semibold text-[#171916] bg-gradient-to-r from-[#E8C77F] to-[#D8AD57] hover:from-[#F0D597] hover:to-[#E0B55E] active:scale-[0.98] rounded-[6px] transition-all flex items-center justify-center gap-1.5 shrink-0 shadow-sm"
        >
          <span>Request Availability</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </form>
    </div>
  );
};
