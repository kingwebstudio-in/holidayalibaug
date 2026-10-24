import { config } from './config.js';
import { query } from './db/pool.js';
import { getSettings } from './services/settings.js';

/**
 * Server-side SEO for the single-page app.
 *
 * Search engines and social-sharing crawlers (WhatsApp, Facebook, X, LinkedIn…) do not run the site's JavaScript, so every
 * public URL gets its own <title>, description, canonical, Open Graph / Twitter tags and (only where accurate) JSON-LD
 * written into the HTML shell by the server. The React app updates the same tags on client-side navigation.
 * Unknown URLs get a real HTTP 404; admin and demo content get noindex.
 */

export const SITE_NAME = 'HolidayAlibag';
export const DEFAULT_TITLE = 'HolidayAlibag — Luxury Coastal Villas & Getaways in Alibaug';
export const DEFAULT_DESCRIPTION =
  'Discover private luxury villas and coastal stays in Alibaug, Maharashtra. Browse handpicked villas and send an enquiry — our team confirms availability.';
export const OG_IMAGE_PATH = '/og-image.jpg';
/** The default hero photo is the Largest Contentful Paint element; preloading it lets the browser fetch it before any JavaScript runs. */
const HERO_PRELOAD = { srcset: '/hero/hero-640.webp 640w, /hero/hero-960.webp 960w, /hero/hero-1376.webp 1376w', fallback: '/hero/hero-960.webp' };

export interface PageMeta {
  status: 200 | 404;
  title: string;
  description: string;
  /** Canonical path, or null for pages that must not be indexed. */
  path: string | null;
  robots: 'index,follow' | 'noindex,nofollow';
  /** Absolute or site-relative image URL for social previews. */
  image: string;
  imageIsDefault: boolean;
  jsonLd: object[];
  /** Preload the default hero image (only when the admin has not configured a custom hero image/video). */
  preloadHero?: boolean;
}

const PAGES: Record<string, { title: string; description: string }> = {
  '/privacy-policy': {
    title: 'Privacy Policy — HolidayAlibag',
    description: 'How HolidayAlibag collects, uses and protects the personal information you share when you send a villa, owner or investment enquiry.',
  },
  '/terms-and-conditions': {
    title: 'Terms & Conditions — HolidayAlibag',
    description: 'Terms for using HolidayAlibag.com: enquiry-only bookings, availability confirmation, property information and acceptable use.',
  },
};

// ───────────────────────────── tiny TTL cache ─────────────────────────────
// The HTML shell is public and unauthenticated; caching keeps page views from becoming database queries.
const cache = new Map<string, { at: number; value: unknown }>();
async function cached<T>(key: string, ttlMs: number, load: () => Promise<T>): Promise<T> {
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < ttlMs) return hit.value as T;
  const value = await load();
  if (cache.size > 600) cache.clear();
  cache.set(key, { at: Date.now(), value });
  return value;
}
export const clearSeoCache = () => cache.clear();

// ───────────────────────────────── helpers ─────────────────────────────────
export const escAttr = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
const jsonForHtml = (o: unknown) => JSON.stringify(o).replace(/</g, '\\u003c').replace(/>/g, '\\u003e').replace(/&/g, '\\u0026').replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029');

export function truncate(s: string, max: number): string {
  const v = s.replace(/\s+/g, ' ').trim();
  if (v.length <= max) return v;
  const cut = v.slice(0, max - 1);
  return `${cut.slice(0, Math.max(cut.lastIndexOf(' '), max - 25))}…`;
}

const absolute = (base: string, url: string) => (/^https?:\/\//i.test(url) ? url : `${base}${url.startsWith('/') ? '' : '/'}${url}`);

const SLUG = /^\/villas\/([a-z0-9]+(?:-[a-z0-9]+)*)$/;

async function siteSettings(): Promise<Record<string, any>> {
  try { return await cached('settings', 60_000, () => getSettings()) as Record<string, any>; } catch { return {}; /* the shell must render even if the database is down */ }
}

async function organizationLd(base: string, s: Record<string, any>) {
  const sameAs = Object.values(s.socialLinks ?? {}).filter((u): u is string => typeof u === 'string' && /^https:\/\//.test(u));
  // Only facts the business has entered in the admin are published as structured data; nothing is invented.
  return [
    {
      '@context': 'https://schema.org',
      '@type': 'Organization',
      name: s.businessName || SITE_NAME,
      url: `${base}/`,
      logo: `${base}/icon-512.png`,
      ...(s.publicEmail ? { email: s.publicEmail } : {}),
      ...(s.publicPhone ? { telephone: s.publicPhone } : {}),
      ...(sameAs.length ? { sameAs } : {}),
    },
    { '@context': 'https://schema.org', '@type': 'WebSite', name: SITE_NAME, url: `${base}/` },
  ];
}

interface VillaRow {
  name: string; slug: string; short_description: string; full_description: string; location: string; locality: string;
  bedrooms: number; bathrooms: number; max_guests: number; featured_image: string | null; first_image: string | null;
  seo_title: string | null; seo_description: string | null; is_demo: boolean;
}

async function loadVilla(slug: string): Promise<VillaRow | null> {
  return cached(`villa:${slug}`, 60_000, async () => {
    const { rows } = await query(
      `SELECT v.name, v.slug, v.short_description, v.full_description, v.location, v.locality, v.bedrooms, v.bathrooms, v.max_guests,
              v.featured_image, v.seo_title, v.seo_description, v.is_demo,
              (SELECT i.url FROM villa_images i WHERE i.villa_id = v.id ORDER BY i.sort_order LIMIT 1) AS first_image
         FROM villas v WHERE v.slug = $1 AND v.is_published`,
      [slug],
    );
    return (rows[0] as VillaRow | undefined) ?? null;
  });
}

const NOT_FOUND = (base: string): PageMeta => ({
  status: 404, title: `Page not found — ${SITE_NAME}`, description: 'The page you are looking for does not exist or has moved.',
  path: null, robots: 'noindex,nofollow', image: `${base}${OG_IMAGE_PATH}`, imageIsDefault: true, jsonLd: [],
});

/** Resolves the metadata and HTTP status for a public URL path. Never throws: the shell must render even if the database is down. */
export async function resolvePage(pathname: string, base: string): Promise<PageMeta> {
  const defaultImage = `${base}${OG_IMAGE_PATH}`;
  try {
    if (pathname === '/') {
      const s = await siteSettings();
      return { status: 200, title: DEFAULT_TITLE, description: DEFAULT_DESCRIPTION, path: '/', robots: 'index,follow', image: defaultImage, imageIsDefault: true, jsonLd: await organizationLd(base, s), preloadHero: !s.heroImage && !s.heroVideo };
    }
    if (PAGES[pathname]) {
      return { status: 200, ...PAGES[pathname], path: pathname, robots: 'index,follow', image: defaultImage, imageIsDefault: true, jsonLd: [] };
    }
    if (pathname === '/admin' || pathname.startsWith('/admin/')) {
      return { status: 200, title: `Admin — ${SITE_NAME}`, description: 'Private administration area.', path: null, robots: 'noindex,nofollow', image: defaultImage, imageIsDefault: true, jsonLd: [] };
    }
    const m = SLUG.exec(pathname);
    if (m) {
      const v = await loadVilla(m[1]);
      if (!v) return NOT_FOUND(base);
      const place = v.locality || v.location;
      const title = truncate(v.seo_title || `${v.name}${place ? ` — ${place}` : ''} | ${SITE_NAME}`, 70);
      const description = truncate(v.seo_description || v.short_description || v.full_description || `${v.name}: ${v.bedrooms}-bedroom villa for up to ${v.max_guests} guests in ${place || 'Alibaug'}.`, 160);
      const img = v.featured_image || v.first_image;
      const url = `${base}${pathname}`;
      return {
        status: 200, title, description, path: pathname,
        // Sample/demo properties must never be indexed.
        robots: v.is_demo ? 'noindex,nofollow' : 'index,follow',
        image: img ? absolute(base, img) : defaultImage, imageIsDefault: !img,
        jsonLd: [
          {
            '@context': 'https://schema.org', '@type': 'House', name: v.name, url,
            description: truncate(v.short_description || v.full_description, 300) || undefined,
            ...(img ? { image: absolute(base, img) } : {}),
            numberOfBedrooms: v.bedrooms, numberOfBathroomsTotal: v.bathrooms,
            occupancy: { '@type': 'QuantitativeValue', maxValue: v.max_guests },
            ...(place ? { address: { '@type': 'PostalAddress', addressLocality: place, addressCountry: 'IN' } } : {}),
          },
          {
            '@context': 'https://schema.org', '@type': 'BreadcrumbList',
            itemListElement: [
              { '@type': 'ListItem', position: 1, name: 'Home', item: `${base}/` },
              { '@type': 'ListItem', position: 2, name: v.name, item: url },
            ],
          },
        ],
      };
    }
  } catch (e) {
    // Database unavailable: serve the generic shell rather than failing the page (the app itself shows its error state).
    if (!config.isTest) console.error('SEO metadata lookup failed:', (e as Error).message);
    if (pathname === '/' || PAGES[pathname]) return { status: 200, title: DEFAULT_TITLE, description: DEFAULT_DESCRIPTION, path: pathname, robots: 'index,follow', image: defaultImage, imageIsDefault: true, jsonLd: [] };
    if (SLUG.test(pathname)) return { status: 200, title: DEFAULT_TITLE, description: DEFAULT_DESCRIPTION, path: null, robots: 'noindex,nofollow', image: defaultImage, imageIsDefault: true, jsonLd: [] };
  }
  return NOT_FOUND(base);
}

/** The block of <head> tags for a page. Replaces the region between the app-head markers in index.html. */
export function renderHead(m: PageMeta, base: string): string {
  const robots = config.indexable ? m.robots : 'noindex,nofollow';
  const canonical = m.path !== null && robots.startsWith('index') ? `${base}${m.path === '/' ? '/' : m.path}` : null;
  const t = escAttr(m.title), d = escAttr(m.description), img = escAttr(m.image);
  const lines = [
    `<title>${escAttr(m.title)}</title>`,
    `<meta name="description" content="${d}" />`,
    `<meta name="robots" content="${robots}" />`,
    canonical ? `<link rel="canonical" href="${escAttr(canonical)}" />` : '',
    m.preloadHero ? `<link rel="preload" as="image" href="${HERO_PRELOAD.fallback}" imagesrcset="${HERO_PRELOAD.srcset}" imagesizes="100vw" fetchpriority="high" />` : '',
    `<meta property="og:site_name" content="${SITE_NAME}" />`,
    `<meta property="og:type" content="website" />`,
    `<meta property="og:locale" content="en_IN" />`,
    `<meta property="og:title" content="${t}" />`,
    `<meta property="og:description" content="${d}" />`,
    canonical ? `<meta property="og:url" content="${escAttr(canonical)}" />` : '',
    `<meta property="og:image" content="${img}" />`,
    m.imageIsDefault ? `<meta property="og:image:width" content="1200" />\n    <meta property="og:image:height" content="630" />\n    <meta property="og:image:alt" content="Luxury private villa with a pool in Alibaug at sunset" />` : '',
    `<meta name="twitter:card" content="summary_large_image" />`,
    `<meta name="twitter:title" content="${t}" />`,
    `<meta name="twitter:description" content="${d}" />`,
    `<meta name="twitter:image" content="${img}" />`,
    ...m.jsonLd.map((o) => `<script type="application/ld+json">${jsonForHtml(o)}</script>`),
  ];
  return lines.filter(Boolean).join('\n    ');
}

const HEAD_RE = /<!--app-head-start-->[\s\S]*?<!--app-head-end-->/;
export const hasHeadMarkers = (html: string) => HEAD_RE.test(html);
export function injectHead(html: string, m: PageMeta, base: string): string {
  return html.replace(HEAD_RE, () => `<!--app-head-start-->\n    ${renderHead(m, base)}\n    <!--app-head-end-->`);
}

// ─────────────────────────── robots.txt / sitemap.xml ───────────────────────────
export function robotsTxt(base: string): string {
  if (!config.indexable) return 'User-agent: *\nDisallow: /\n';
  return ['User-agent: *', 'Allow: /', 'Disallow: /admin', 'Disallow: /api/', '', `Sitemap: ${base}/sitemap.xml`, ''].join('\n');
}

const xml = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' })[c]!);

/** Only canonical, public, indexable URLs: home, policy pages and published non-demo properties. */
export async function sitemapXml(base: string): Promise<string> {
  const villas = await cached('sitemap-villas', 5 * 60_000, async () =>
    (await query(`SELECT slug, updated_at FROM villas WHERE is_published AND NOT is_demo ORDER BY display_order, name LIMIT 5000`)).rows as { slug: string; updated_at: string | Date }[]);
  const entries: { loc: string; lastmod?: string }[] = [
    { loc: `${base}/` },
    ...Object.keys(PAGES).map((p) => ({ loc: `${base}${p}` })),
    ...villas.map((v) => ({ loc: `${base}/villas/${v.slug}`, lastmod: new Date(v.updated_at).toISOString().slice(0, 10) })),
  ];
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${entries
    .map((e) => `  <url><loc>${xml(e.loc)}</loc>${e.lastmod ? `<lastmod>${e.lastmod}</lastmod>` : ''}</url>`)
    .join('\n')}\n</urlset>\n`;
}
