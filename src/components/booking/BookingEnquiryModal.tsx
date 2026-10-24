import React, { useEffect, useRef, useState } from 'react';
import { X, ArrowRight, Check, AlertCircle, Minus, Plus } from 'lucide-react';
import { useSiteData } from '../../context/SiteDataContext';
import { useModal } from '../../hooks/useModal';
import { ApiError, newIdempotencyKey } from '../../services/api';
import { submitBookingEnquiry } from '../../services/publicApi';
import { events } from '../../lib/analytics';
import { addDaysISO, formatReadableDate, toLocalISODate, validateEmail, validatePhone } from '../../lib/validation';
import { bookingWhatsAppText, buildWhatsAppUrl } from '../../lib/whatsapp';
import { useWhatsAppHandoff } from '../../hooks/useWhatsAppHandoff';
import { WhatsAppSend } from '../common/WhatsAppSend';
import type { EnquiryReceipt } from '../../types';

interface BookingEnquiryModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialParams?: { villaId?: string; villaName?: string; checkIn?: string; checkOut?: string; adults?: number; children?: number };
  onShowToast: (title: string, message: string, type: 'success' | 'error') => void;
}

/** Outer shell mounts the form only while open, so every opening starts with fresh state and a fresh idempotency key. */
export const BookingEnquiryModal: React.FC<BookingEnquiryModalProps> = (props) =>
  props.isOpen ? <BookingForm {...props} /> : null;

const BookingForm: React.FC<BookingEnquiryModalProps> = ({ onClose, initialParams, onShowToast }) => {
  const { villas, settings } = useSiteData();
  const dialogRef = useModal<HTMLDivElement>(true, onClose);
  const today = toLocalISODate(new Date());

  const [villaId, setVillaId] = useState(initialParams?.villaId || 'any');
  const [checkIn, setCheckIn] = useState(initialParams?.checkIn || addDaysISO(today, 4));
  const [checkOut, setCheckOut] = useState(initialParams?.checkOut || addDaysISO(initialParams?.checkIn || today, initialParams?.checkIn ? 1 : 7));
  const [adults, setAdults] = useState(initialParams?.adults ?? 4);
  const [children, setChildren] = useState(initialParams?.children ?? 0);
  const [guestName, setGuestName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [consent, setConsent] = useState(false);

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [receipt, setReceipt] = useState<EnquiryReceipt | null>(null);
  const inFlight = useRef(false);
  const wa = useWhatsAppHandoff(!!settings?.whatsappNumber);
  const idemKey = useRef(newIdempotencyKey()); // reused for retries so a retry can never create a duplicate

  const selectedVilla = villas.find((v) => v.id === villaId);
  const maxGuests = selectedVilla ? selectedVilla.maxGuests : villas.length ? Math.max(...villas.map((v) => v.maxGuests)) : 100;
  const currentVillaName = selectedVilla ? selectedVilla.name : 'Any Villa';

  useEffect(() => {
    if (villaId !== 'any' && villas.length && !selectedVilla) setVillaId('any');
  }, [villas, villaId, selectedVilla]);

  const clear = (k: string) => { if (errors[k]) setErrors((p) => ({ ...p, [k]: '' })); setFormError(null); };

  const validate = () => {
    const e: Record<string, string> = {};
    if (!guestName.trim()) e.guestName = 'Please enter your name';
    if (!phone.trim()) e.phone = 'Please enter your phone number';
    else if (!validatePhone(phone)) e.phone = 'Please enter a valid phone number';
    if (!email.trim()) e.email = 'Please enter your email';
    else if (!validateEmail(email)) e.email = 'Please enter a valid email address';
    if (!checkIn) e.checkIn = 'Please select check-in date';
    else if (checkIn < today) e.checkIn = 'Check-in cannot be in the past';
    if (!checkOut) e.checkOut = 'Please select check-out date';
    else if (checkIn && checkOut <= checkIn) e.checkOut = 'Check-out must be after check-in';
    if (adults + children > maxGuests) e.adults = `${selectedVilla ? selectedVilla.name : 'Our largest villa'} accommodates up to ${maxGuests} guests`;
    if (!consent) e.consent = 'Consent is required to submit';
    return e;
  };

  const handleSubmit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    if (inFlight.current) return; // block double clicks / Enter-key repeats
    const e = validate();
    setErrors(e);
    if (Object.keys(e).length) return;

    const trap = (new FormData(ev.currentTarget as HTMLFormElement).get('website') as string) || '';
    wa.prepare(); // opens the WhatsApp tab inside this click (popup-blocker safe); filled in only after the server saves the enquiry
    inFlight.current = true;
    setIsSubmitting(true);
    setFormError(null);
    try {
      const r = await submitBookingEnquiry(
        { villaId: villaId === 'any' ? null : villaId, checkIn, checkOut, adults, children, guestName, phone, email: email || undefined, message: message || undefined, consent, website: trap || undefined },
        idemKey.current,
      );
      events.bookingEnquiry({ villaSlug: villas.find((v) => v.id === villaId)?.slug, guests: adults + children, nights: Math.max(1, Math.round((Date.parse(checkOut) - Date.parse(checkIn)) / 86_400_000)) });
      setReceipt(r); // success is shown only after the server confirms the database write
      wa.open(buildWhatsAppUrl(settings?.whatsappNumber, bookingWhatsAppText({ reference: r.reference, propertyName: r.villaName ?? currentVillaName, checkIn: formatReadableDate(r.checkIn ?? checkIn), checkOut: formatReadableDate(r.checkOut ?? checkOut), adults, children, guestName, phone, email, message })));
      onShowToast('Enquiry received', `Reference ${r.reference}. Our team will contact you to confirm availability.`, 'success');
    } catch (err) {
      wa.abort(); // nothing was saved: close the placeholder tab, keep the form as it was
      const apiErr = err instanceof ApiError ? err : null;
      if (apiErr && Object.keys(apiErr.fieldErrors).length) {
        const map: Record<string, string> = {};
        for (const [k, v] of Object.entries(apiErr.fieldErrors)) map[k === 'children' ? 'adults' : k === 'phone' ? 'phone' : k] = v;
        setErrors(map);
      }
      setFormError(apiErr?.message ?? 'Something went wrong. Please try again.'); // all entered details are kept
    } finally {
      inFlight.current = false;
      setIsSubmitting(false);
    }
  };

  const waUrl = receipt ? buildWhatsAppUrl(settings?.whatsappNumber, bookingWhatsAppText({ reference: receipt.reference, propertyName: receipt.villaName ?? currentVillaName, checkIn: formatReadableDate(receipt.checkIn ?? checkIn), checkOut: formatReadableDate(receipt.checkOut ?? checkOut), adults, children, guestName, phone, email, message })) : null;

  const inputCls = (k: string) => `w-full px-3 py-2 text-xs bg-white border rounded-[5px] focus:outline-none focus:ring-1 focus:ring-[#D8AD57] ${errors[k] ? 'border-red-500' : 'border-[#DDD8CF]'}`;
  const Err = ({ k }: { k: string }) => (errors[k] ? <span className="text-[11px] text-red-600 block mt-0.5" role="alert">{errors[k]}</span> : null);
  const Stepper = ({ label, value, set, min, max }: { label: string; value: number; set: (n: number) => void; min: number; max: number }) => (
    <div className="flex items-center justify-between gap-2">
      <span className="text-[11px] text-[#42403B]">{label}</span>
      <div className="flex items-center gap-2">
        <button type="button" aria-label={`Fewer ${label.toLowerCase()}`} disabled={value <= min} onClick={() => { set(value - 1); clear('adults'); }} className="w-6 h-6 rounded-full border border-[#DDD8CF] flex items-center justify-center disabled:opacity-30"><Minus className="w-3 h-3" /></button>
        <span className="w-5 text-center text-xs font-semibold">{value}</span>
        <button type="button" aria-label={`More ${label.toLowerCase()}`} disabled={value >= max} onClick={() => { set(value + 1); clear('adults'); }} className="w-6 h-6 rounded-full border border-[#DDD8CF] flex items-center justify-center disabled:opacity-30"><Plus className="w-3 h-3" /></button>
      </div>
    </div>
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/70 backdrop-blur-xs"
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        ref={dialogRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby="booking-modal-title"
        className="relative w-full max-w-xl bg-white rounded-xl shadow-2xl border border-[#EAE3D8] overflow-hidden max-h-[92vh] max-h-[92dvh] flex flex-col focus:outline-none"
      >
        <div className="flex items-center justify-between px-6 py-4 bg-[#FBF7EF] border-b border-[#EAE3D8] shrink-0">
          <div>
            <h3 id="booking-modal-title" className="font-editorial text-2xl font-semibold text-[#171916]">Villa Booking Enquiry</h3>
            <p className="text-xs text-[#68675F] mt-0.5">A request to our team · No payment is taken · Not a confirmed booking</p>
          </div>
          <button onClick={onClose} className="p-1.5 text-[#68675F] hover:text-[#171916] rounded" aria-label="Close dialog"><X className="w-5 h-5" /></button>
        </div>

        <div className="p-6 overflow-y-auto overscroll-contain flex-1 min-h-0">
          {receipt ? (
            <div className="py-6 text-center flex flex-col items-center">
              <div className="w-12 h-12 rounded-full bg-[#092D28] text-[#E8C77F] flex items-center justify-center mb-3"><Check className="w-6 h-6" /></div>
              <h4 className="font-editorial text-2xl font-semibold text-[#171916] mb-1">Enquiry Received</h4>
              <p className="text-[11px] uppercase tracking-wider text-[#645F56] mt-1">Your reference</p>
              <p className="font-mono text-lg font-semibold text-[#092D28] select-all" data-testid="enquiry-reference">{receipt.reference}</p>
              <p className="text-xs sm:text-sm text-[#68675F] max-w-sm my-4 leading-relaxed">
                We have saved your request for <strong>{receipt.villaName ?? currentVillaName}</strong> from <strong>{formatReadableDate(receipt.checkIn ?? checkIn)}</strong> to{' '}
                <strong>{formatReadableDate(receipt.checkOut ?? checkOut)}</strong>. <strong>Availability is not confirmed yet</strong> — our team will check and contact you by phone or WhatsApp.
              </p>
              {settings?.bookingInstructions && <p className="text-xs text-[#68675F] max-w-sm mb-4 whitespace-pre-line">{settings.bookingInstructions}</p>}
              <WhatsAppSend url={waUrl} state={wa.state} />
              <button onClick={onClose} className="mt-3 px-5 py-2.5 text-xs font-semibold text-[#68675F] hover:text-[#171916] bg-[#F5EFE4] rounded-md">Done</button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4 relative" noValidate>
                <div aria-hidden="true" style={{ position: 'absolute', left: '-10000px', width: 1, height: 1, overflow: 'hidden' }}>
                  <label>Leave this field empty<input type="text" name="website" tabIndex={-1} autoComplete="off" defaultValue="" /></label>
                </div>
              {formError && (
                <div role="alert" className="flex items-start gap-2 p-3 rounded-md bg-red-50 border border-red-200 text-xs text-red-700">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-px" /><span>{formError} Your details have been kept.</span>
                </div>
              )}

              <div className="p-3 bg-[#FBF7EF] rounded-lg border border-[#EAE3D8] grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="sm:col-span-2">
                  <label htmlFor="bk-villa" className="text-[11px] text-[#645F56] font-semibold uppercase block mb-0.5">Villa</label>
                  <select id="bk-villa" value={villaId} onChange={(e) => { setVillaId(e.target.value); clear('adults'); }} className="w-full bg-white border border-[#DDD8CF] rounded px-2 py-1.5 font-medium text-[#171916] focus:outline-none focus:ring-1 focus:ring-[#D8AD57]">
                    <option value="any">Any Villa (All Options)</option>
                    {villas.map((v) => <option key={v.id} value={v.id}>{v.name} ({v.specs})</option>)}
                  </select>
                </div>
                <div>
                  <label htmlFor="bk-in" className="text-[11px] text-[#645F56] font-semibold uppercase block mb-0.5">Check-in</label>
                  <input id="bk-in" type="date" min={today} value={checkIn} onChange={(e) => { const v = e.target.value; setCheckIn(v); if (v && v >= checkOut) setCheckOut(addDaysISO(v, 1)); clear('checkIn'); }} className={inputCls('checkIn')} />
                  {Err({ k: "checkIn" })}
                </div>
                <div>
                  <label htmlFor="bk-out" className="text-[11px] text-[#645F56] font-semibold uppercase block mb-0.5">Check-out</label>
                  <input id="bk-out" type="date" min={checkIn ? addDaysISO(checkIn, 1) : today} value={checkOut} onChange={(e) => { setCheckOut(e.target.value); clear('checkOut'); }} className={inputCls('checkOut')} />
                  {Err({ k: "checkOut" })}
                </div>
                <div className="sm:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2">
                  {Stepper({ label: "Adults", value: adults, set: setAdults, min: 1, max: 100 })}
                  {Stepper({ label: "Children", value: children, set: setChildren, min: 0, max: 100 })}
                  <div className="sm:col-span-2 text-[11px] text-[#6B665D]">Total {adults + children} guest{adults + children === 1 ? '' : 's'} · {selectedVilla ? `${selectedVilla.name} sleeps up to ${maxGuests}` : `largest villa sleeps up to ${maxGuests}`}</div>
                  <div className="sm:col-span-2">{Err({ k: "adults" })}</div>
                </div>
              </div>

              <div className="space-y-3">
                <div>
                  <label htmlFor="bk-name" className="block text-[11px] font-semibold uppercase tracking-wider text-[#645F56] mb-1">Your Full Name *</label>
                  <input id="bk-name" type="text" autoComplete="name" value={guestName} maxLength={120} onChange={(e) => { setGuestName(e.target.value); clear('guestName'); }} placeholder="e.g. Rahul Kapoor" className={inputCls('guestName')} />
                  {Err({ k: "guestName" })}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="bk-phone" className="block text-[11px] font-semibold uppercase tracking-wider text-[#645F56] mb-1">Phone Number *</label>
                    <input id="bk-phone" type="tel" autoComplete="tel" value={phone} onChange={(e) => { setPhone(e.target.value); clear('phone'); }} placeholder="e.g. +91 98200 12345" className={inputCls('phone')} />
                    {Err({ k: "phone" })}
                  </div>
                  <div>
                    <label htmlFor="bk-email" className="block text-[11px] font-semibold uppercase tracking-wider text-[#645F56] mb-1">Email Address *</label>
                    <input id="bk-email" type="email" autoComplete="email" value={email} onChange={(e) => { setEmail(e.target.value); clear('email'); }} placeholder="e.g. rahul@example.com" className={inputCls('email')} />
                    {Err({ k: "email" })}
                  </div>
                </div>
                <div>
                  <label htmlFor="bk-msg" className="block text-[11px] font-semibold uppercase tracking-wider text-[#645F56] mb-1">Special Requests (Optional)</label>
                  <textarea id="bk-msg" rows={2} maxLength={2000} value={message} onChange={(e) => setMessage(e.target.value)} placeholder="e.g. Private chef required, early check-in requested, celebrating anniversary" className="w-full px-3 py-2 text-xs bg-white border border-[#DDD8CF] rounded-[5px] focus:outline-none focus:ring-1 focus:ring-[#D8AD57] resize-none" />
                </div>
                <div className="flex items-start gap-2 pt-1">
                  <input type="checkbox" id="consentBooking" checked={consent} onChange={(e) => { setConsent(e.target.checked); clear('consent'); }} className="mt-0.5 rounded border-[#DDD8CF] text-[#B58B35] focus:ring-[#D8AD57]" />
                  <label htmlFor="consentBooking" className="text-[11px] text-[#645F56]">I agree to be contacted by Holiday Alibaug regarding villa availability and stay confirmation.</label>
                </div>
                {Err({ k: "consent" })}
              </div>

              <div className="pt-3 border-t border-[#F0EAE1] flex flex-col sm:flex-row items-center gap-2.5">
                <button type="submit" disabled={isSubmitting} aria-busy={isSubmitting} className="w-full sm:flex-1 py-2.5 text-xs font-semibold text-[#171916] bg-[#E8C77F] hover:bg-[#D8AD57] disabled:opacity-60 disabled:cursor-wait rounded-[6px] transition-all flex items-center justify-center gap-1.5 shadow-sm">
                  {isSubmitting ? <span>Sending enquiry…</span> : (<><span>Submit Booking Enquiry</span><ArrowRight className="w-3.5 h-3.5" /></>)}
                </button>
              </div>
              {settings?.whatsappNumber && <p className="text-[11px] text-[#6B665D] text-center -mt-1">We save your enquiry first, then open WhatsApp so you can send the details to our team.</p>}
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
