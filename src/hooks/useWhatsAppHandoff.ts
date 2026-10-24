import { useCallback, useRef, useState } from 'react';

export type HandoffState = 'idle' | 'opened' | 'blocked';

/**
 * Opens WhatsApp after an enquiry has been SAVED.
 * Browsers only allow a new tab as a direct result of a click, but the reference number is only known after the server
 * has saved the enquiry. So: `prepare()` (called synchronously in the submit handler, after validation) opens a blank tab,
 * `open(url)` points it at WhatsApp once the save succeeded, and `abort()` closes it if the save failed.
 * If the browser blocks the tab, state becomes "blocked" and the UI shows a "Send on WhatsApp" button instead — the
 * enquiry is saved either way.
 */
export function useWhatsAppHandoff(enabled: boolean) {
  const [state, setState] = useState<HandoffState>('idle');
  const win = useRef<Window | null>(null);

  const prepare = useCallback(() => {
    win.current = null;
    if (!enabled) return;
    try {
      const w = window.open('', '_blank');
      if (w) {
        w.opener = null;
        w.document.title = 'Opening WhatsApp…';
        w.document.body.textContent = 'Saving your enquiry — opening WhatsApp…';
      }
      win.current = w;
    } catch {
      win.current = null;
    }
  }, [enabled]);

  const open = useCallback((url: string | null) => {
    const w = win.current;
    win.current = null;
    if (!url) { try { w?.close(); } catch { /* ignore */ } return; }
    if (w && !w.closed) {
      try { w.location.href = url; setState('opened'); return; } catch { /* fall through */ }
    }
    setState('blocked');
  }, []);

  const abort = useCallback(() => {
    try { win.current?.close(); } catch { /* ignore */ }
    win.current = null;
    setState('idle');
  }, []);

  return { state, prepare, open, abort };
}
