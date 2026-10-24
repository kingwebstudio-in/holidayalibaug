import React, { useCallback, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { useModal } from '../../hooks/useModal';
import { SafeImage } from './SafeImage';

export interface LightboxImage { url: string; alt: string }

/** Full-screen image viewer: arrows / keyboard / swipe, caption (alt text), counter and a thumbnail strip. */
export const Lightbox: React.FC<{ images: LightboxImage[]; index: number; onIndex: (i: number) => void; onClose: () => void; title?: string }> = ({ images, index, onIndex, onClose, title }) => {
  const ref = useModal<HTMLDivElement>(true, onClose);
  const n = images.length;
  const go = useCallback((d: number) => onIndex((index + d + n) % n), [index, n, onIndex]);
  const touch = useRef<number | null>(null);

  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') go(1);
      else if (e.key === 'ArrowLeft') go(-1);
    };
    document.addEventListener('keydown', k);
    return () => document.removeEventListener('keydown', k);
  }, [go]);
  useEffect(() => { // keep the active thumbnail in view without scrolling the page
    const el = document.querySelector<HTMLElement>(`[data-lb-thumb="${index}"]`);
    el?.parentElement && el.offsetLeft !== undefined && (el.parentElement.scrollLeft = el.offsetLeft - el.parentElement.clientWidth / 2 + el.clientWidth / 2);
  }, [index]);

  const img = images[index];
  if (!img) return null;
  return createPortal(
    <div className="fixed inset-0 z-[80] bg-black/95 flex flex-col overscroll-none" role="presentation">
      <div
        ref={ref}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label={`${title ? `${title} — ` : ''}photo ${index + 1} of ${n}`}
        className="flex-1 min-h-0 flex flex-col focus:outline-none"
        onTouchStart={(e) => { touch.current = e.touches[0].clientX; }}
        onTouchEnd={(e) => { if (touch.current !== null) { const dx = e.changedTouches[0].clientX - touch.current; if (Math.abs(dx) > 50) go(dx < 0 ? 1 : -1); } touch.current = null; }}
      >
        <div className="flex items-center justify-between px-4 py-3 text-white shrink-0">
          <span className="text-xs tabular-nums" aria-live="polite" data-testid="lightbox-counter">{index + 1} / {n}</span>
          <button onClick={onClose} aria-label="Close photo viewer" className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center"><X className="w-5 h-5" /></button>
        </div>
        <div className="relative flex-1 min-h-0 flex items-center justify-center px-2 sm:px-14" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
          <SafeImage key={img.url} src={img.url} widths={[1200, 1920]} sizes="100vw" alt={img.alt || title || 'Property photo'} loading="eager" className="max-w-full max-h-full object-contain select-none" />
          {n > 1 && (
            <>
              <button onClick={() => go(-1)} aria-label="Previous photo" className="absolute left-2 sm:left-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/15 hover:bg-white/30 text-white flex items-center justify-center"><ChevronLeft className="w-5 h-5" /></button>
              <button onClick={() => go(1)} aria-label="Next photo" className="absolute right-2 sm:right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/15 hover:bg-white/30 text-white flex items-center justify-center"><ChevronRight className="w-5 h-5" /></button>
            </>
          )}
        </div>
        <p className="text-center text-white/90 text-xs sm:text-sm px-6 py-2 min-h-[2.25rem] shrink-0" data-testid="lightbox-caption">{img.alt}</p>
        {n > 1 && (
          <div className="flex gap-2 px-3 pb-3 overflow-x-auto shrink-0 justify-start sm:justify-center" aria-label="Photo thumbnails">
            {images.map((im, i) => (
              <button key={im.url + i} data-lb-thumb={i} onClick={() => onIndex(i)} aria-label={`Show photo ${i + 1}`} aria-current={i === index} className={`w-16 h-11 rounded overflow-hidden shrink-0 border-2 ${i === index ? 'border-[#E8C77F]' : 'border-transparent opacity-60 hover:opacity-100'}`}>
                <SafeImage src={im.url} widths={[120, 240]} sizes="64px" alt="" className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
};
