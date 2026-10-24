/**
 * Privacy-conscious Google Analytics 4 wrapper.
 *
 *  - Nothing is downloaded or sent until the visitor grants "analytics" consent AND the server reports a measurement ID
 *    (ANALYTICS_MEASUREMENT_ID). Before consent there are no Google requests and no analytics cookies.
 *  - Withdrawing consent stops tracking at once and removes the _ga cookies this site set.
 *  - Google signals / ad personalisation are off; page views are sent manually (single-page app).
 *  - Event parameters go through an allow-list. Names, phone numbers, e-mail addresses, message text and other personal
 *    data are never sent — only coarse facts such as which villa was viewed or which form type was submitted.
 */
type Params = Record<string, string | number | boolean>;

declare global {
  interface Window { dataLayer?: unknown[]; gtag?: (...a: unknown[]) => void; [k: `ga-disable-${string}`]: boolean | undefined }
}

let measurementId = '';
let loaded = false;
let enabled = false;

/** The only parameters that may leave the browser. */
const ALLOWED: Record<string, 'string' | 'number' | 'boolean'> = {
  villa_slug: 'string', villa_name: 'string', form: 'string', guests: 'number', nights: 'number', has_email: 'boolean', page_path: 'string', page_title: 'string',
};
const SAFE_STRING = /^[\p{L}\p{N} ._\-/&',()–—]{0,100}$/u;

export function sanitizeParams(input: Record<string, unknown>): Params {
  const out: Params = {};
  for (const [k, v] of Object.entries(input)) {
    const kind = ALLOWED[k];
    if (!kind || typeof v !== kind) continue;
    if (typeof v === 'string' && (!SAFE_STRING.test(v) || /@|\d{8,}/.test(v))) continue; // looks like an e-mail address or phone number: drop it
    if (typeof v === 'number' && !Number.isFinite(v)) continue;
    out[k] = v as never;
  }
  return out;
}

function clearAnalyticsCookies() {
  const names = document.cookie.split(';').map((c) => c.split('=')[0].trim()).filter((n) => n === '_ga' || n.startsWith('_ga_') || n === '_gid' || n.startsWith('_gat'));
  const host = location.hostname.split('.');
  const domains = ['', location.hostname, ...host.slice(1).map((_, i) => `.${host.slice(i + 1).join('.')}`)];
  for (const n of names) for (const d of domains) document.cookie = `${n}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/${d ? `; domain=${d}` : ''}`;
}

/** Call whenever the consent decision or the configured measurement ID changes. */
export function applyAnalyticsConsent(granted: boolean, id: string | null | undefined) {
  const valid = !!id && /^G-[A-Z0-9]{6,14}$/.test(id);
  if (!granted || !valid) {
    if (loaded && measurementId) { window[`ga-disable-${measurementId}`] = true; clearAnalyticsCookies(); }
    enabled = false;
    return;
  }
  measurementId = id!;
  window[`ga-disable-${measurementId}`] = false;
  enabled = true;
  if (loaded) return;
  loaded = true;
  window.dataLayer = window.dataLayer || [];
  window.gtag = function gtag() { (window.dataLayer as unknown[]).push(arguments); };
  window.gtag('js', new Date());
  window.gtag('config', measurementId, { send_page_view: false, allow_google_signals: false, allow_ad_personalization_signals: false, cookie_flags: 'SameSite=Lax;Secure' });
  const s = document.createElement('script');
  s.async = true;
  s.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(measurementId)}`;
  document.head.appendChild(s);
}

export const analyticsActive = () => enabled && loaded;

export function trackEvent(name: string, params: Record<string, unknown> = {}) {
  if (!analyticsActive() || !window.gtag) return;
  window.gtag('event', name, sanitizeParams(params));
}

export function trackPageView(path: string, title: string) {
  trackEvent('page_view', { page_path: path, page_title: title });
}

/** Events used by the site (kept in one place so nothing personal is ever added by accident). */
export const events = {
  villaView: (slug: string, name: string) => trackEvent('villa_view', { villa_slug: slug, villa_name: name }),
  bookingEnquiry: (o: { villaSlug?: string; guests: number; nights: number }) => trackEvent('booking_enquiry_submit', { form: 'booking', villa_slug: o.villaSlug ?? 'any', guests: o.guests, nights: o.nights }),
  ownerEnquiry: () => trackEvent('owner_enquiry_submit', { form: 'villa_owner' }),
  investmentEnquiry: () => trackEvent('investment_enquiry_submit', { form: 'investment' }),
  whatsappClick: (where: string) => trackEvent('whatsapp_click', { form: where }),
};
