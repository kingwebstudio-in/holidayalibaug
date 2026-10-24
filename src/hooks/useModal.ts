import { useEffect, useRef } from 'react';
import { useScrollLock } from './useScrollLock';

const FOCUSABLE = 'a[href],button:not([disabled]),textarea:not([disabled]),input:not([disabled]),select:not([disabled]),[tabindex]:not([tabindex="-1"])';

/** Open dialogs, topmost last. Only the topmost handles Escape/Tab, so a lightbox inside a dialog closes alone. */
const stack: symbol[] = [];

/**
 * Dialog behaviour: page-scroll lock, Escape to close, focus moved into the dialog, Tab kept inside,
 * and focus restored to the opener on close. Attach the returned ref to the dialog card.
 */
export function useModal<T extends HTMLElement>(isOpen: boolean, onClose: () => void) {
  const ref = useRef<T>(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  useScrollLock(isOpen);

  useEffect(() => {
    if (!isOpen) return;
    const id = Symbol('modal');
    stack.push(id);
    const opener = document.activeElement as HTMLElement | null;
    const node = ref.current;
    node?.focus({ preventScroll: true });

    const onKey = (e: KeyboardEvent) => {
      if (stack[stack.length - 1] !== id) return;
      if (e.key === 'Escape') {
        e.stopPropagation();
        closeRef.current();
      } else if (e.key === 'Tab' && node) {
        const items = [...node.querySelectorAll<HTMLElement>(FOCUSABLE)].filter((el) => el.offsetParent !== null);
        if (!items.length) { e.preventDefault(); return; }
        const first = items[0], last = items[items.length - 1];
        if (e.shiftKey && (document.activeElement === first || document.activeElement === node)) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      const i = stack.indexOf(id);
      if (i >= 0) stack.splice(i, 1);
      opener?.focus?.({ preventScroll: true });
    };
  }, [isOpen]);

  return ref;
}
