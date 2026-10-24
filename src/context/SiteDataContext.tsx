import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { PublicSettings, Testimonial, Villa, VillaOption } from '../types';
import { fetchSettings, fetchTestimonials, fetchVillaOptions, fetchVillaPage } from '../services/publicApi';
import { ApiError } from '../services/api';

type Status = 'loading' | 'ready' | 'error';

interface SiteData {
  status: Status;
  error: string | null;
  /** Every published property as a lightweight option (hero selector, booking form, footer). */
  villas: VillaOption[];
  /** First few full property records (video showcase). */
  showcaseVillas: Villa[];
  settings: PublicSettings | null;
  testimonials: Testimonial[];
  reload: () => void;
}

const Ctx = createContext<SiteData | null>(null);

export const SiteDataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [status, setStatus] = useState<Status>('loading');
  const [error, setError] = useState<string | null>(null);
  const [villas, setVillas] = useState<VillaOption[]>([]);
  const [showcaseVillas, setShowcaseVillas] = useState<Villa[]>([]);
  const [settings, setSettings] = useState<PublicSettings | null>(null);
  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
  const [nonce, setNonce] = useState(0);

  useEffect(() => {
    const ctl = new AbortController();
    setStatus('loading');
    setError(null);
    // Villas are essential; settings/testimonials degrade gracefully.
    Promise.all([
      fetchVillaOptions(ctl.signal),
      fetchVillaPage({ pageSize: 8 }, ctl.signal).then((r) => r.items).catch(() => [] as Villa[]),
      fetchSettings(ctl.signal).catch(() => null),
      fetchTestimonials(ctl.signal).catch(() => []),
    ])
      .then(([v, sv, s, t]) => {
        setVillas(v);
        setShowcaseVillas(sv);
        setSettings(s);
        setTestimonials(t);
        setStatus('ready');
      })
      .catch((e: unknown) => {
        if (e instanceof ApiError && e.code === 'aborted') return;
        setError(e instanceof ApiError ? e.message : 'Could not load villas.');
        setStatus('error');
      });
    return () => ctl.abort();
  }, [nonce]);

  const reload = useCallback(() => setNonce((n) => n + 1), []);
  const value = useMemo(() => ({ status, error, villas, showcaseVillas, settings, testimonials, reload }), [status, error, villas, showcaseVillas, settings, testimonials, reload]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
};

export function useSiteData(): SiteData {
  const v = useContext(Ctx);
  if (!v) throw new Error('useSiteData must be used inside <SiteDataProvider>');
  return v;
}

/** Same as useSiteData but returns null outside the provider (e.g. the admin preview). */
export function useOptionalSiteData(): SiteData | null {
  return useContext(Ctx);
}
