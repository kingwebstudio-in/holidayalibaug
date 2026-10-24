import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { applyAnalyticsConsent } from '../../lib/analytics';
import { useSiteData } from '../../context/SiteDataContext';

/**
 * Cookie / storage consent.
 *  - "Necessary" is always on (it keeps the site and the admin sign-in working) and needs no consent.
 *  - "Analytics" and "Marketing" are OFF until the visitor opts in. No analytics script is requested before that.
 *  - The choice is kept in this browser (localStorage, first-party) and can be changed at any time from "Cookie settings"
 *    in the footer. Bumping CONSENT_VERSION asks everyone again (e.g. when a new category of cookie is introduced).
 */
export const CONSENT_VERSION = 1;
const KEY = 'ha_consent';

export interface Consent { analytics: boolean; marketing: boolean }
interface Stored extends Consent { v: number; at: string }

function read(): Stored | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const p = JSON.parse(raw) as Stored;
    return p && p.v === CONSENT_VERSION && typeof p.analytics === 'boolean' && typeof p.marketing === 'boolean' ? p : null;
  } catch { return null; }
}
function write(c: Consent) {
  try { localStorage.setItem(KEY, JSON.stringify({ ...c, v: CONSENT_VERSION, at: new Date().toISOString() } satisfies Stored)); } catch { /* storage blocked: the choice lasts for this page view only */ }
}

interface Ctx {
  /** Whether the visitor has made a choice (banner hidden). */
  decided: boolean;
  consent: Consent;
  prefsOpen: boolean;
  analyticsAvailable: boolean;
  acceptAll: () => void;
  rejectOptional: () => void;
  save: (c: Consent) => void;
  openPreferences: () => void;
  closePreferences: () => void;
}
const C = createContext<Ctx | null>(null);

export const ConsentProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { settings } = useSiteData();
  const measurementId = settings?.analytics?.measurementId ?? null;
  const initial = useMemo(read, []);
  const [consent, setConsent] = useState<Consent>(initial ?? { analytics: false, marketing: false });
  const [decided, setDecided] = useState(initial !== null);
  const [prefsOpen, setPrefsOpen] = useState(false);

  // Analytics runs only while consent is granted — and re-evaluates if the ID arrives after the visitor's saved choice.
  useEffect(() => { applyAnalyticsConsent(consent.analytics, measurementId); }, [consent.analytics, measurementId]);

  const commit = useCallback((c: Consent) => { write(c); setConsent(c); setDecided(true); setPrefsOpen(false); }, []);
  const value = useMemo<Ctx>(() => ({
    decided,
    consent, prefsOpen,
    analyticsAvailable: !!measurementId,
    acceptAll: () => commit({ analytics: true, marketing: true }),
    rejectOptional: () => commit({ analytics: false, marketing: false }),
    save: commit,
    openPreferences: () => setPrefsOpen(true),
    closePreferences: () => setPrefsOpen(false),
  }), [decided, consent, prefsOpen, measurementId, commit]);
  return <C.Provider value={value}>{children}</C.Provider>;
};

export function useConsent(): Ctx {
  const v = useContext(C);
  if (!v) throw new Error('useConsent must be used inside <ConsentProvider>');
  return v;
}
export const useOptionalConsent = () => useContext(C);
