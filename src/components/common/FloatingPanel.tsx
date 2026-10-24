import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

interface FloatingPanelProps {
  open: boolean;
  /** Element the panel is attached to (the trigger wrapper). */
  anchorRef: React.RefObject<HTMLElement | null>;
  onClose: () => void;
  /** Preferred width in px (clamped to the viewport). */
  width?: number;
  align?: 'left' | 'right';
  className?: string;
  role?: string;
  id?: string;
  'aria-label'?: string;
  tabIndex?: number;
  onKeyDown?: React.KeyboardEventHandler<HTMLDivElement>;
  'aria-activedescendant'?: string;
  panelRef?: React.RefObject<HTMLDivElement | null>;
  children: React.ReactNode;
}

/** Never rendered in normal flow: fixed + invisible until measured, so it can't extend the page or attract scrollIntoView. */
const HIDDEN: React.CSSProperties = { position: 'fixed', top: 0, left: 0, visibility: 'hidden', pointerEvents: 'none' };
const GAP = 8;
const MARGIN = 8;

/**
 * Popover rendered in a portal (document.body) and positioned with fixed coordinates, so it can never be
 * clipped by an ancestor's `overflow:hidden` or trapped under a lower stacking context (hero section, wave SVG, header).
 * Its height is capped to the space available in the viewport and the list scrolls inside it.
 * It flips above the trigger when there is more room there, and follows the trigger on scroll/resize.
 */
export const FloatingPanel: React.FC<FloatingPanelProps> = ({
  open, anchorRef, onClose, width = 256, align = 'left', className = '', children, panelRef, ...aria
}) => {
  const inner = useRef<HTMLDivElement>(null);
  const ref = panelRef ?? inner;
  const [style, setStyle] = useState<React.CSSProperties>(HIDDEN);

  const place = useCallback(() => {
    const a = anchorRef.current;
    if (!a) return;
    const r = a.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.visualViewport?.height ?? window.innerHeight;
    if (r.bottom < 0 || r.top > vh) { onClose(); return; } // trigger scrolled out of view
    const w = Math.min(width, vw - MARGIN * 2);
    let left = align === 'right' ? r.right - w : r.left;
    left = Math.max(MARGIN, Math.min(left, vw - w - MARGIN));
    const below = vh - r.bottom - GAP - MARGIN;
    const above = r.top - GAP - MARGIN;
    const natural = ref.current?.scrollHeight ?? 0;
    const placeAbove = natural > below && above > below;
    const maxHeight = Math.max(120, Math.min(placeAbove ? above : below, 420));
    setStyle({
      position: 'fixed', left, width: w, maxHeight, zIndex: 60, visibility: 'visible', pointerEvents: 'auto',
      ...(placeAbove ? { bottom: vh - r.top + GAP } : { top: r.bottom + GAP }),
    });
  }, [anchorRef, align, width, onClose, ref]);

  useLayoutEffect(() => {
    if (!open) { setStyle(HIDDEN); return; }
    place();
    const raf = requestAnimationFrame(place); // re-measure once content has laid out
    return () => cancelAnimationFrame(raf);
  }, [open, place, children]);

  useEffect(() => {
    if (!open) return;
    const onMove = () => place();
    window.addEventListener('resize', onMove);
    window.addEventListener('scroll', onMove, { passive: true, capture: true });
    window.visualViewport?.addEventListener('resize', onMove);
    const onDown = (e: PointerEvent) => {
      const t = e.target as Node;
      if (ref.current?.contains(t) || anchorRef.current?.contains(t)) return;
      onClose();
    };
    document.addEventListener('pointerdown', onDown);
    return () => {
      window.removeEventListener('resize', onMove);
      window.removeEventListener('scroll', onMove, true);
      window.visualViewport?.removeEventListener('resize', onMove);
      document.removeEventListener('pointerdown', onDown);
    };
  }, [open, place, onClose, anchorRef, ref]);

  if (!open) return null;
  return createPortal(
    <div
      ref={ref}
      style={style}
      className={`overflow-y-auto overscroll-contain [-webkit-overflow-scrolling:touch] bg-white rounded-lg shadow-xl border border-[#E7E3DA] ${className}`}
      {...aria}
    >
      {children}
    </div>,
    document.body,
  );
};
