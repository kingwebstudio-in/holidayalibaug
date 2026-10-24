import React, { useEffect, useState } from 'react';
import { Expand, Images, X, MapPin, Users, Check, ArrowRight, PhoneCall, BedDouble, Bath, Clock, FlaskConical, ChevronLeft, ChevronRight } from 'lucide-react';
import { Villa } from '../../types';
import { useModal } from '../../hooks/useModal';
import { useOptionalSiteData } from '../../context/SiteDataContext';
import { fetchRelated } from '../../services/publicApi';
import { SafeImage } from '../common/SafeImage';
import { Lightbox } from '../common/Lightbox';
import { AmenityIcon } from '../home/VillaCard';
import { whatsappGeneralUrl } from '../../lib/whatsapp';

interface VillaDetailModalProps {
  villa: Villa | null;
  onClose: () => void;
  onBookEnquiry: (villa: Villa) => void;
  /** Open another property (related listings). */
  onSelectVilla?: (villa: Villa) => void;
  /** Admin preview of an unsaved/unpublished property: hides related listings and enquiry actions. */
  preview?: boolean;
}

export const VillaDetailModal: React.FC<VillaDetailModalProps> = ({ villa, onClose, onBookEnquiry, onSelectVilla, preview }) =>
  villa ? <VillaDetail key={villa.id + (preview ? ':p' : '')} villa={villa} onClose={onClose} onBookEnquiry={onBookEnquiry} onSelectVilla={onSelectVilla} preview={preview} /> : null;

const VillaDetail: React.FC<{ villa: Villa; onClose: () => void; onBookEnquiry: (v: Villa) => void; onSelectVilla?: (v: Villa) => void; preview?: boolean }> = ({ villa, onClose, onBookEnquiry, onSelectVilla, preview }) => {
  const settings = useOptionalSiteData()?.settings ?? null;
  const [related, setRelated] = useState<Villa[]>([]);
  useEffect(() => {
    if (preview) return;
    const ctl = new AbortController();
    fetchRelated(villa.slug, ctl.signal).then(setRelated).catch(() => setRelated([]));
    return () => ctl.abort();
  }, [villa.slug, preview]);
  const dialogRef = useModal<HTMLDivElement>(true, onClose);
  const [activeImage, setActiveImage] = useState<string>(villa.image);
  const [lightbox, setLightbox] = useState<number | null>(null);
  useEffect(() => setActiveImage(villa.image), [villa.image]);
  const wa = preview ? null : whatsappGeneralUrl(settings?.whatsappNumber, settings?.whatsappDefaultMessage, villa.name);
  const idx = Math.max(0, villa.gallery.indexOf(activeImage));
  const step = (d: number) => setActiveImage(villa.gallery[(idx + d + villa.gallery.length) % villa.gallery.length]);
  const altFor = (u: string) => villa.galleryAlts?.[u] || villa.name;

  return (
    // Overlay is NOT a scroller; the page behind is locked (useModal) and only the body region inside the card scrolls.
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/70 backdrop-blur-xs overscroll-none"
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        ref={dialogRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby="villa-modal-title"
        className="relative w-full max-w-3xl bg-white rounded-xl shadow-2xl border border-[#EAE3D8] overflow-hidden max-h-[92vh] max-h-[92dvh] flex flex-col focus:outline-none"
      >
        <button onClick={onClose} className="absolute top-3 right-3 z-20 w-9 h-9 rounded-full bg-black/60 text-white hover:bg-black flex items-center justify-center transition-colors shadow-md" aria-label="Close dialog">
          <X className="w-4 h-4" />
        </button>

        {/* Scrollable content region: flex-1 + min-h-0 lets it shrink and scroll inside the card */}
        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain [-webkit-overflow-scrolling:touch]" tabIndex={0} role="region" aria-label={`${villa.name} details`}>
          <div className="relative h-56 sm:h-80 w-full bg-[#171916]">
            <button type="button" onClick={() => setLightbox(idx)} aria-label={`Open photo viewer — ${villa.gallery.length} photo${villa.gallery.length === 1 ? '' : 's'}`} data-testid="open-lightbox" className="block w-full h-full cursor-zoom-in focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#E8C77F]">
              <SafeImage src={activeImage} widths={[800, 1200, 1600]} sizes="(min-width:1024px) 55vw, 96vw" alt={altFor(activeImage)} loading="eager" className="w-full h-full object-cover object-center" />
            </button>
            {villa.gallery.length > 1 && (
              <button type="button" onClick={() => setLightbox(idx)} className="absolute bottom-3 left-3 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/60 hover:bg-black/80 text-white text-[11px] font-medium"><Images className="w-3.5 h-3.5" />View all {villa.gallery.length} photos<Expand className="w-3 h-3 opacity-70" /></button>
            )}
            {villa.gallery.length > 1 && (
              <>
                <button type="button" onClick={() => step(-1)} aria-label="Previous photo" className="absolute left-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/55 text-white hover:bg-black flex items-center justify-center"><ChevronLeft className="w-4 h-4" /></button>
                <button type="button" onClick={() => step(1)} aria-label="Next photo" className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/55 text-white hover:bg-black flex items-center justify-center"><ChevronRight className="w-4 h-4" /></button>
                <span className="absolute bottom-3 right-3 px-2 py-0.5 rounded-full bg-black/60 text-white text-[11px]">{idx + 1} / {villa.gallery.length}</span>
              </>
            )}
            {villa.badge && (
              <div className="absolute top-4 left-4 z-10">
                <span className="px-3 py-1 text-xs font-semibold tracking-wider text-[#171916] bg-[#E8C77F] rounded-full shadow">{villa.badge}</span>
              </div>
            )}
          </div>

          {villa.gallery.length > 1 && (
            <div className="flex gap-2 p-3 bg-[#FBF7EF] border-b border-[#EAE3D8] overflow-x-auto overscroll-x-contain">
              {villa.gallery.map((img, idx) => (
                <button key={img + idx} onClick={() => setActiveImage(img)} aria-label={`Show photo ${idx + 1}`} aria-pressed={activeImage === img}
                  className={`w-20 h-14 rounded-md overflow-hidden shrink-0 border-2 transition-all ${activeImage === img ? 'border-[#B58B35] ring-2 ring-[#B58B35]/30' : 'border-transparent opacity-70 hover:opacity-100'}`}>
                  <SafeImage src={img} widths={[160, 320]} sizes="96px" alt={altFor(img)} className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}

          <div className="p-5 sm:p-6">
            {villa.isDemo && (
              <div role="note" className="mb-4 flex items-start gap-2 p-2.5 rounded-md bg-[#171916] text-white text-[11px] leading-snug">
                <FlaskConical className="w-4 h-4 text-[#E8C77F] shrink-0 mt-px" />
                <span><strong>Sample listing.</strong> This is illustrative demo content, not a real property. Prices, capacity and availability shown are examples only.</span>
              </div>
            )}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#F0EAE1] pb-4">
              <div>
                <p className="text-[11px] font-semibold tracking-[0.14em] uppercase text-[#7A5410] mb-0.5">{villa.propertyType}</p>
                <h2 id="villa-modal-title" className="font-editorial text-2xl sm:text-3xl font-semibold text-[#171916]">{villa.name}</h2>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[#645F56] mt-1">
                  {villa.location && <span className="flex items-center gap-1 font-medium"><MapPin className="w-3.5 h-3.5 text-[#B58B35]" />{villa.location}</span>}
                  <span className="flex items-center gap-1 font-medium text-[#171916]"><BedDouble className="w-3.5 h-3.5 text-[#645F56]" />{villa.bedrooms} bedrooms</span>
                  {villa.bathrooms > 0 && <span className="flex items-center gap-1 font-medium text-[#171916]"><Bath className="w-3.5 h-3.5 text-[#645F56]" />{villa.bathrooms} bathrooms</span>}
                  <span className="flex items-center gap-1 font-medium text-[#171916]"><Users className="w-3.5 h-3.5 text-[#645F56]" />Up to {villa.maxGuests} guests</span>
                </div>
              </div>
              <div className="text-left sm:text-right">
                {villa.displayPrice ? (
                  <>
                    <div className="text-xs text-[#645F56] uppercase tracking-wider font-medium">{villa.isDemo ? 'Sample price from' : 'Starting from'}</div>
                    <div className="text-lg sm:text-xl font-bold text-[#092D28] font-editorial">{villa.displayPrice}</div>
                  </>
                ) : (
                  <div className="text-xs text-[#645F56] uppercase tracking-wider font-medium">Price on enquiry</div>
                )}
              </div>
            </div>

            {villa.fullDescription && (
              <div className="py-4 border-b border-[#F0EAE1]">
                <h3 className="text-xs uppercase tracking-wider font-semibold text-[#645F56] mb-1.5">About the Estate</h3>
                <p className="text-xs sm:text-[13px] text-[#42403B] leading-relaxed whitespace-pre-line break-words">{villa.fullDescription}</p>
              </div>
            )}

            {villa.amenities.length > 0 && (
              <div className="py-4 border-b border-[#F0EAE1]">
                <h3 className="text-xs uppercase tracking-wider font-semibold text-[#645F56] mb-2.5">Included Amenities</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                  {villa.amenities.map((a, i) => (
                    <div key={i} className="flex items-center gap-2 p-2 bg-[#FBF7EF] rounded-md border border-[#EAE3D8] text-xs text-[#171916]">
                      <AmenityIcon name={a.icon} className="w-4 h-4 text-[#B58B35] shrink-0" /><span className="font-medium">{a.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {villa.highlights.length > 0 && (
              <div className="py-4 border-b border-[#F0EAE1]">
                <h3 className="text-xs uppercase tracking-wider font-semibold text-[#645F56] mb-2">Property Highlights</h3>
                <ul className="space-y-1.5 text-xs text-[#42403B]">
                  {villa.highlights.map((h, i) => (
                    <li key={i} className="flex items-start gap-2"><Check className="w-3.5 h-3.5 text-[#B58B35] shrink-0 mt-0.5" /><span>{h}</span></li>
                  ))}
                </ul>
              </div>
            )}

            <div className="py-4 border-b border-[#F0EAE1] flex flex-wrap gap-x-8 gap-y-2 text-xs text-[#42403B]">
              <span className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5 text-[#B58B35]" />Check-in from <strong>{villa.checkInTime}</strong></span>
              <span className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5 text-[#B58B35]" />Check-out by <strong>{villa.checkOutTime}</strong></span>
            </div>

            {villa.rules.length > 0 && (
              <div className="pt-4">
                <h3 className="text-xs uppercase tracking-wider font-semibold text-[#645F56] mb-2">House Guidelines</h3>
                <ul className="space-y-1 text-xs text-[#68675F]">
                  {villa.rules.map((r, i) => <li key={i}>• {r}</li>)}
                </ul>
              </div>
            )}

            {!preview && related.length > 0 && (
              <div className="pt-5 mt-5 border-t border-[#F0EAE1]">
                <h3 className="text-xs uppercase tracking-wider font-semibold text-[#645F56] mb-2.5">You may also like</h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {related.map((r) => (
                    <button key={r.id} type="button" onClick={() => onSelectVilla?.(r)} className="text-left rounded-lg border border-[#EAE3D8] overflow-hidden hover:shadow-md transition-shadow bg-white">
                      <SafeImage src={r.image} widths={[400, 640]} sizes="(min-width:640px) 30vw, 90vw" alt={r.name} className="w-full aspect-[16/10] object-cover" />
                      <div className="p-2.5">
                        <div className="text-[11px] uppercase tracking-wider font-semibold text-[#7A5410]">{r.propertyType}</div>
                        <div className="text-[12.5px] font-semibold text-[#171916] leading-tight">{r.name}</div>
                        <div className="text-[12px] text-[#68675F] mt-0.5">{r.specs}{r.displayPrice ? ` · ${r.displayPrice}` : ' · Price on enquiry'}</div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer actions stay pinned and reachable; they never scroll away */}
        <div className="shrink-0 p-3 sm:p-4 bg-[#FBF7EF] border-t border-[#EAE3D8] flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-xs text-[#68675F] text-center sm:text-left">Enquiry-first · Availability is confirmed by our team after your request</div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            {wa && (
              <a href={wa} target="_blank" rel="noopener noreferrer" className="flex-1 sm:flex-initial px-4 py-2 text-xs font-semibold text-[#092D28] bg-white border border-[#EAE3D8] hover:bg-[#F5EFE4] rounded-md flex items-center justify-center gap-1.5 transition-colors">
                <PhoneCall className="w-3.5 h-3.5 text-[#B58B35]" /><span>WhatsApp</span>
              </a>
            )}
            <button disabled={preview} onClick={() => { onClose(); onBookEnquiry(villa); }} className="flex-1 sm:flex-initial px-5 py-2 text-xs font-semibold text-[#171916] bg-[#E8C77F] hover:bg-[#D8AD57] disabled:opacity-60 disabled:cursor-not-allowed rounded-md flex items-center justify-center gap-1.5 shadow-sm transition-all">
              <span>{preview ? 'Preview only' : 'Enquire to Book'}</span><ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    {lightbox !== null && <Lightbox images={villa.gallery.map((u) => ({ url: u, alt: villa.galleryAlts?.[u] || '' }))} index={lightbox} onIndex={(i) => { setLightbox(i); setActiveImage(villa.gallery[i]); }} onClose={() => setLightbox(null)} title={villa.name} />}
    </div>
  );
};
