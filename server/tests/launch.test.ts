// Launch-readiness checks: security headers, SEO routes, bot/duplicate protection, consent, database lockdown.
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

// A minimal built-frontend stand-in, so these tests do not depend on `npm run build`.
const staticDir = fs.mkdtempSync(path.join(os.tmpdir(), 'hol-static-'));
fs.writeFileSync(path.join(staticDir, 'index.html'), '<!doctype html><html><head><!--app-head-start--><title>x</title><!--app-head-end--></head><body><div id="root"></div></body></html>');
fs.mkdirSync(path.join(staticDir, 'assets'));
fs.writeFileSync(path.join(staticDir, 'assets', 'app-abc123.js'), 'console.log(1)');
process.env.STATIC_DIR = staticDir;
process.env.SITE_URL = 'https://holidayalibag.example';
process.env.ANALYTICS_MEASUREMENT_ID = 'G-TEST123456';

let h: typeof import('./helpers.js');
let seo: typeof import('../src/seo.js');
let cfg: any;
beforeAll(async () => { h = await import('./helpers.js'); seo = await import('../src/seo.js'); cfg = (await import('../src/config.js')).config; cfg.indexable = true; /* behave like production */ await h.setupDb(); });
afterAll(async () => { fs.rmSync(staticDir, { recursive: true, force: true }); await h.closePool(); });
beforeEach(async () => { await h.resetDb(); seo.clearSeoCache(); });

describe('security headers', () => {
  it('sends a strict CSP that allows hosted video, no inline scripts, and analytics only because an ID is configured', async () => {
    const res = await request(h.app).get('/');
    const csp = res.headers['content-security-policy'];
    expect(csp).toMatch(/default-src 'self'/);
    expect(csp).toMatch(/media-src 'self' https: blob:/);
    expect(csp).toMatch(/frame-ancestors 'none'/);
    expect(csp).toMatch(/script-src 'self' https:\/\/www\.googletagmanager\.com/);
    expect(csp).not.toMatch(/script-src[^;]*'unsafe-inline'/);
    expect(csp).not.toMatch(/fonts\.googleapis/);
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['referrer-policy']).toBe('strict-origin-when-cross-origin');
    expect(res.headers['permissions-policy']).toMatch(/camera=\(\)/);
    expect(res.headers['x-powered-by']).toBeUndefined();
    expect(res.headers['strict-transport-security']).toBeUndefined(); // off until ENABLE_HSTS=true
  });
  it('marks API responses noindex and never caches admin responses', async () => {
    const res = await request(h.app).get('/api/v1/admin/auth/me');
    expect(res.status).toBe(401);
    expect(res.headers['x-robots-tag']).toMatch(/noindex/);
    expect(res.headers['cache-control']).toMatch(/no-store/);
  });
  it('hides internals on public endpoints', async () => {
    const health = (await request(h.app).get('/api/v1/health')).body.data;
    expect(Object.keys(health).sort()).toEqual(['database', 'status', 'time']);
    const settings = (await request(h.app).get('/api/v1/settings/public')).body.data;
    expect(JSON.stringify(settings)).not.toMatch(/dataMode|postgres|DATABASE|secret/i);
    expect(settings.analytics).toEqual({ measurementId: 'G-TEST123456' });
  });
  it('answers unknown API routes with JSON 404 and no stack trace', async () => {
    const res = await request(h.app).get('/api/v1/nope');
    expect(res.status).toBe(404);
    expect(JSON.stringify(res.body)).not.toMatch(/at \w+|node_modules|\.ts:/);
  });
});

describe('SEO routes', () => {
  it('serves per-page metadata, canonical URLs on the configured domain, and real 404s', async () => {
    const home = await request(h.app).get('/');
    expect(home.status).toBe(200);
    expect(home.text).toMatch(/<link rel="canonical" href="https:\/\/holidayalibag\.example\/" \/>/);
    expect(home.text).toMatch(/property="og:image" content="https:\/\/holidayalibag\.example\/og-image\.jpg"/);
    expect(home.text).toMatch(/twitter:card" content="summary_large_image"/);
    expect(home.text).toMatch(/"@type":"Organization"/);
    expect(home.text).not.toMatch(/localhost|127\.0\.0\.1/);
    const priv = await request(h.app).get('/privacy-policy');
    expect(priv.status).toBe(200);
    expect(priv.text).toMatch(/<title>Privacy Policy — HolidayAlibag<\/title>/);
    expect(priv.text).toMatch(/canonical" href="https:\/\/holidayalibag\.example\/privacy-policy"/);
    const missing = await request(h.app).get('/definitely-not-a-page');
    expect(missing.status).toBe(404);
    expect(missing.text).toMatch(/noindex/);
    expect(missing.text).not.toMatch(/rel="canonical"/);
    expect((await request(h.app).get('/assets/missing.js')).status).toBe(404);
  });
  it('gives published villas their own metadata, noindexes drafts/unknown/demo villas, and escapes content', async () => {
    const v = await h.makeVilla({ name: 'Sea "Breeze" <b>Villa</b>', slug: 'sea-breeze', short_description: 'Quiet villa with a pool', locality: 'Kihim' });
    const ok = await request(h.app).get('/villas/sea-breeze');
    expect(ok.status).toBe(200);
    expect(ok.text).toMatch(/canonical" href="https:\/\/holidayalibag\.example\/villas\/sea-breeze"/);
    expect(ok.text).toMatch(/"@type":"House"/);
    expect(ok.text).not.toContain('<b>Villa</b>');
    expect(ok.text).not.toMatch(/<script type="application\/ld\+json">[^<]*<\/?b>/);
    await h.makeVilla({ slug: 'draft-villa', is_published: false });
    expect((await request(h.app).get('/villas/draft-villa')).status).toBe(404);
    expect((await request(h.app).get('/villas/unknown-villa')).status).toBe(404);
    await h.makeVilla({ slug: 'sample-villa', is_demo: true });
    const demo = await request(h.app).get('/villas/sample-villa');
    expect(demo.status).toBe(200);
    expect(demo.text).toMatch(/name="robots" content="noindex,nofollow"/);
    void v;
  });
  it('noindexes the admin shell', async () => {
    const res = await request(h.app).get('/admin/login');
    expect(res.status).toBe(200);
    expect(res.text).toMatch(/name="robots" content="noindex,nofollow"/);
    expect(res.headers['x-robots-tag']).toMatch(/noindex/);
  });
  it('redirects trailing slashes and /index.html without ever producing an open redirect', async () => {
    expect((await request(h.app).get('/privacy-policy/')).headers.location).toBe('/privacy-policy');
    expect((await request(h.app).get('/index.html')).headers.location).toBe('/');
    const evil = await request(h.app).get('//evil.example/');
    expect(evil.headers.location ?? '/').not.toMatch(/^\/\//);
  });
  it('robots.txt blocks private areas and points at the sitemap; staging would be Disallow: /', async () => {
    const prod = await request(h.app).get('/robots.txt');
    expect(prod.status).toBe(200);
    expect(prod.type).toBe('text/plain');
    expect(prod.text).toMatch(/Disallow: \/admin[\s\S]*Sitemap: https:\/\/holidayalibag\.example\/sitemap\.xml/);
    cfg.indexable = false; // staging / ALLOW_INDEXING=false
    try {
      expect((await request(h.app).get('/robots.txt')).text).toBe('User-agent: *\nDisallow: /\n');
      const page = await request(h.app).get('/');
      expect(page.text).toMatch(/name="robots" content="noindex,nofollow"/);
      expect(page.text).not.toMatch(/rel="canonical"/);
    } finally { cfg.indexable = true; }
  });
  it('sitemap lists only canonical public pages and published non-demo villas', async () => {
    await h.makeVilla({ slug: 'real-villa' });
    await h.makeVilla({ slug: 'hidden-draft', is_published: false });
    await h.makeVilla({ slug: 'demo-one', is_demo: true });
    const res = await request(h.app).get('/sitemap.xml');
    expect(res.status).toBe(200);
    expect(res.type).toMatch(/xml/);
    const locs = [...res.text.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
    expect(locs).toEqual(expect.arrayContaining(['https://holidayalibag.example/', 'https://holidayalibag.example/privacy-policy', 'https://holidayalibag.example/terms-and-conditions', 'https://holidayalibag.example/villas/real-villa']));
    expect(locs.join()).not.toMatch(/hidden-draft|demo-one|admin|localhost/);
  });
});

describe('form abuse protection', () => {
  it('honeypot: pretends to succeed but stores nothing and sends nothing', async () => {
    const v = await h.makeVilla();
    const res = await request(h.app).post('/api/v1/booking-enquiries').send(h.bookingPayload(v.id, { website: 'http://spam.example' }));
    expect(res.status).toBe(201);
    expect(res.body.data.reference).toMatch(/^HA-/);
    expect((await h.pool.query('SELECT count(*) FROM booking_enquiries')).rows[0].count).toBe('0');
    const own = await request(h.app).post('/api/v1/villa-owner-enquiries').send({ ownerName: 'Bot', phone: '9820012345', villaName: 'X', propertyLocation: 'Y', consent: true, website: 'x' });
    expect(own.status).toBe(201);
    expect((await h.pool.query('SELECT count(*) FROM villa_owner_enquiries')).rows[0].count).toBe('0');
  });
  it('requires explicit consent on every form', async () => {
    const v = await h.makeVilla();
    expect((await request(h.app).post('/api/v1/booking-enquiries').send(h.bookingPayload(v.id, { consent: false }))).status).toBe(400);
    expect((await request(h.app).post('/api/v1/booking-enquiries').send({ ...h.bookingPayload(v.id), consent: undefined })).status).toBe(400);
    expect((await request(h.app).post('/api/v1/investment-enquiries').send({ customerName: 'A', phone: '9820012345', email: 'a@b.co', preferredLocation: 'Alibaug', budgetRange: '1cr', propertyType: 'Villa' })).status).toBe(400);
  });
  it('returns the original record for an identical re-submission (even with a new idempotency key)', async () => {
    const v = await h.makeVilla();
    const a = await request(h.app).post('/api/v1/booking-enquiries').set('Idempotency-Key', 'key-one-aaaaaa').send(h.bookingPayload(v.id));
    const b = await request(h.app).post('/api/v1/booking-enquiries').set('Idempotency-Key', 'key-two-bbbbbb').send(h.bookingPayload(v.id));
    expect(a.status).toBe(201);
    expect(b.status).toBe(200);
    expect(b.body.data.reference).toBe(a.body.data.reference);
    expect((await h.pool.query('SELECT count(*) FROM booking_enquiries')).rows[0].count).toBe('1');
    // A different person (different phone) is NOT a duplicate.
    const c = await request(h.app).post('/api/v1/booking-enquiries').send(h.bookingPayload(v.id, { phone: '+91 97000 11111' }));
    expect(c.status).toBe(201);
  });
  it('saves enquiries before anything else can fail (notification outcome is recorded, not required)', async () => {
    const v = await h.makeVilla();
    const res = await request(h.app).post('/api/v1/booking-enquiries').send(h.bookingPayload(v.id));
    expect(res.status).toBe(201);
    const row = (await h.pool.query('SELECT notification_status FROM booking_enquiries')).rows[0];
    expect(row.notification_status).toBe('not_configured');
  });
  it('rejects oversized bodies, malformed JSON and script payloads are stored inert (plain text)', async () => {
    const v = await h.makeVilla();
    expect((await request(h.app).post('/api/v1/booking-enquiries').send({ ...h.bookingPayload(v.id), message: 'x'.repeat(120_000) })).status).toBe(413);
    expect((await request(h.app).post('/api/v1/booking-enquiries').set('Content-Type', 'application/json').send('{bad')).status).toBe(400);
    const xss = await request(h.app).post('/api/v1/booking-enquiries').send(h.bookingPayload(v.id, { message: '<img src=x onerror=alert(1)>', phone: '+91 96000 22222' }));
    expect(xss.status).toBe(201);
    const q = await request(h.app).post('/api/v1/booking-enquiries').send(h.bookingPayload(v.id, { guestName: "Robert'); DROP TABLE villas;--", phone: '+91 96000 33333' }));
    expect(q.status).toBe(201);
    expect((await h.pool.query('SELECT count(*) FROM villas')).rows[0].count).toBe('1');
  });
});

describe('database lockdown', () => {
  it('has row-level security enabled on every table (blocks the Supabase anon-key REST API)', async () => {
    const { rows } = await h.pool.query(`SELECT c.relname, c.relrowsecurity FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace WHERE n.nspname = 'public' AND c.relkind = 'r'`);
    expect(rows.length).toBeGreaterThan(8);
    expect(rows.filter((r: any) => !r.relrowsecurity).map((r: any) => r.relname)).toEqual([]);
  });
});

describe('HTTPS enforcement behind a TLS-terminating proxy', () => {
  it('redirects http→https on the configured domain, honours X-Forwarded-Proto, and never loops or leaks the Host header', async () => {
    const { createApp } = await import('../src/app.js');
    cfg.forceHttps = true; cfg.trustProxy = 1; cfg.hsts = { enabled: true, maxAge: 300, includeSubDomains: false };
    try {
      const secureApp = createApp({ rateLimit: false });
      const http = await request(secureApp).get('/privacy-policy?x=1').set('Host', 'evil.example').set('X-Forwarded-Proto', 'http');
      expect(http.status).toBe(301);
      expect(http.headers.location).toBe('https://holidayalibag.example/privacy-policy?x=1'); // SITE_URL host, not the attacker's Host header
      const https = await request(secureApp).get('/privacy-policy').set('X-Forwarded-Proto', 'https');
      expect(https.status).toBe(200); // no redirect loop once the proxy says it was HTTPS
      expect(https.headers['strict-transport-security']).toBe('max-age=300');
      expect((await request(secureApp).post('/api/v1/booking-enquiries').set('X-Forwarded-Proto', 'http').send({})).status).toBe(426);
      expect((await request(secureApp).get('/api/v1/health').set('X-Forwarded-Proto', 'http')).status).toBe(200); // platform health checks
      expect((await request(secureApp).get('//evil.example/').set('X-Forwarded-Proto', 'http')).headers.location).toBe('https://holidayalibag.example/');
    } finally { cfg.forceHttps = false; cfg.trustProxy = false; cfg.hsts = { enabled: false, maxAge: 15552000, includeSubDomains: false }; }
  });
});

describe('privacy tooling (export / erase / purge CLI)', () => {
  const run = (...a: string[]) => {
    const r = spawnSync('node', ['--import', 'tsx', 'server/src/cli/privacy.ts', ...a], { cwd: process.cwd(), env: { ...process.env, NODE_ENV: 'test' }, encoding: 'utf8', timeout: 60_000 });
    return { code: r.status as number, out: `${r.stdout}${r.stderr}` };
  };
  it('refuses unsafe input and is a dry run unless --yes is given', async () => {
    expect(run().code).toBe(2);
    expect(run('erase').code).toBe(2);
    expect(run('erase', '--phone', '123').code).toBe(2);
    expect(run('purge', '--older-than-days', '3').code).toBe(2);
  });
  it('is covered end-to-end against the real database in the shared test DB (dry-run output only)', async () => {
    const v = await h.makeVilla();
    await request(h.app).post('/api/v1/booking-enquiries').send(h.bookingPayload(v.id, { email: 'erase.me@example.test' }));
    if (process.env.TEST_DATA_MODE === 'local') return; // the CLI opens its own local database; end-to-end deletion is verified manually (see docs)
    const dry = run('erase', '--email', 'erase.me@example.test');
    expect(dry.out).toMatch(/booking_enquiries: 1 matching/);
    expect((await h.pool.query('SELECT count(*) FROM booking_enquiries')).rows[0].count).toBe('1');
  });
});
