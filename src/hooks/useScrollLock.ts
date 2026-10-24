import { useEffect } from 'react';

let locks = 0;
let saved: { overflow: string; paddingRight: string; htmlOverflow: string } | null = null;

/** Locks page scrolling while a modal/drawer is open (ref-counted so stacked modals are safe). */
export function useScrollLock(active: boolean) {
  useEffect(() => {
    if (!active) return;
    const body = document.body;
    const html = document.documentElement;
    if (locks === 0) {
      saved = { overflow: body.style.overflow, paddingRight: body.style.paddingRight, htmlOverflow: html.style.overflow };
      const scrollbar = window.innerWidth - html.clientWidth;
      if (scrollbar > 0) body.style.paddingRight = `${scrollbar}px`; // avoid layout shift when the scrollbar disappears
      body.style.overflow = 'hidden';
      html.style.overflow = 'hidden';
    }
    locks++;
    return () => {
      locks--;
      if (locks === 0 && saved) {
        body.style.overflow = saved.overflow;
        body.style.paddingRight = saved.paddingRight;
        html.style.overflow = saved.htmlOverflow;
        saved = null;
      }
    };
  }, [active]);
}
