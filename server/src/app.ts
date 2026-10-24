import fs from 'node:fs';
import path from 'node:path';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import { config } from './config.js';
import { apiNotFound, errorHandler } from './middleware/error.js';
import { hasHeadMarkers, injectHead, resolvePage, robotsTxt, sitemapXml } from './seo.js';
import { adminRoutes } from './routes/admin.js';
import { publicRoutes } from './routes/public.js';

const HOST_RE = /^[a-z0-9]([a-z0-9.-]*[a-z0-9])?(:\d{1,5})?$/i;

/** Origin used for canonical URLs and redirects. Production always uses the configured SITE_URL, never the Host header. */
export function publicBase(req: express.Request): string {
  if (config.siteUrl) return config.siteUrl;
  const host = req.get('host') ?? '';
  return HOST_RE.test(host) ? `${req.protocol}://${host}` : 'http://localhost';
}

export function createApp(opts: { rateLimit?: boolean } = {}) {
  const rateLimit = opts.rateLimit ?? !config.isTest;
  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', config.trustProxy);

  // ── HTTPS enforcement (TLS terminates at the platform proxy; X-Forwarded-Proto is trusted only via TRUST_PROXY) ──
  if (config.forceHttps) {
    app.use((req, res, next) => {
      if (req.secure || req.path === '/api/v1/health') return next(); // health checks come from inside the platform over HTTP
      if (req.method !== 'GET' && req.method !== 'HEAD') return res.status(426).type('text/plain').send('HTTPS is required.');
      const host = config.siteUrl ? new URL(config.siteUrl).host : (HOST_RE.test(req.get('host') ?? '') ? req.get('host')! : '');
      if (!host) return res.status(400).type('text/plain').send('Bad request');
      res.redirect(301, `https://${host}${req.originalUrl.startsWith('/') && !req.originalUrl.startsWith('//') ? req.originalUrl : '/'}`);
    });
  }

  // ── Security headers ──
  const ga = config.analyticsId
    ? { script: ['https://www.googletagmanager.com'], connect: ['https://www.googletagmanager.com', 'https://www.google-analytics.com', 'https://*.google-analytics.com', 'https://*.analytics.google.com'] }
    : { script: [] as string[], connect: [] as string[] };
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'", ...ga.script],
          // React sets inline style attributes (positions, sizes); style attributes cannot be nonce'd. Scripts stay strict.
          styleSrc: ["'self'", "'unsafe-inline'"],
          fontSrc: ["'self'", 'data:'],
          imgSrc: ["'self'", 'data:', 'https:'],
          // Hero/property videos may be hosted on Cloudinary or any https host the admin pastes.
          mediaSrc: ["'self'", 'https:', 'blob:'],
          connectSrc: ["'self'", ...config.allowedOrigins, ...ga.connect],
          manifestSrc: ["'self'"],
          frameSrc: ["'none'"],
          frameAncestors: ["'none'"],
          objectSrc: ["'none'"],
          baseUri: ["'self'"],
          formAction: ["'self'"],
          upgradeInsecureRequests: config.isProd ? [] : null,
        },
      },
      // Only sent when ENABLE_HSTS=true — switch it on after HTTPS is verified on the live domain.
      strictTransportSecurity: config.hsts.enabled ? { maxAge: config.hsts.maxAge, includeSubDomains: config.hsts.includeSubDomains, preload: false } : false,
      referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
      crossOriginEmbedderPolicy: false,
    }),
  );
  app.use((_req, res, next) => {
    res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()');
    next();
  });
  app.use(['/api', '/admin'], (_req, res, next) => { res.setHeader('X-Robots-Tag', 'noindex, nofollow'); next(); });
  app.use(compression({ threshold: 1024 }));

  // CORS is only needed when the frontend lives on a different origin; same-origin deployments need none.
  app.use('/api', cors({ origin: config.allowedOrigins.length ? config.allowedOrigins : false, credentials: true, allowedHeaders: ['Content-Type', 'Idempotency-Key', 'X-Requested-With'], maxAge: 600 }));
  app.use(express.json({ limit: '100kb' }));
  app.use(cookieParser());

  app.use('/api/v1/admin', (_req, res, next) => { res.set('Cache-Control', 'no-store'); next(); }, adminRoutes({ rateLimit }));
  app.use('/api/v1', publicRoutes({ rateLimit }));
  app.use('/api', apiNotFound);

  // ── robots.txt and sitemap.xml: generated, so they always match the configured domain and the published properties ──
  app.get('/robots.txt', (req, res) => {
    res.type('text/plain').set('Cache-Control', 'public, max-age=3600').send(robotsTxt(publicBase(req)));
  });
  app.get('/sitemap.xml', async (req, res, next) => {
    try {
      res.type('application/xml').set('Cache-Control', 'public, max-age=3600').send(await sitemapXml(publicBase(req)));
    } catch (e) { next(e); }
  });

  // ── Built frontend (single-origin deployment) ──
  const staticDir = path.resolve(process.cwd(), config.STATIC_DIR);
  const indexPath = path.join(staticDir, 'index.html');
  if (fs.existsSync(indexPath)) {
    // The HTML shell is cached, but re-read if a new build replaces it (checked at most every 2 s), so a redeploy can never serve stale asset hashes.
    let shell = fs.readFileSync(indexPath, 'utf8'), shellMtime = fs.statSync(indexPath).mtimeMs, shellChecked = Date.now();
    const currentShell = () => {
      if (Date.now() - shellChecked > 2000) {
        shellChecked = Date.now();
        try { const m = fs.statSync(indexPath).mtimeMs; if (m !== shellMtime) { shell = fs.readFileSync(indexPath, 'utf8'); shellMtime = m; } } catch { /* keep the cached shell */ }
      }
      return shell;
    };
    // The raw template (with its injection markers) must never be served; /index.html is not a canonical URL.
    app.get('/index.html', (_req, res) => res.redirect(301, '/'));
    app.use(express.static(staticDir, { index: false, dotfiles: 'ignore', maxAge: '1h', setHeaders: (res, p) => {
      if (/[\\/]assets[\\/]/.test(p)) res.setHeader('Cache-Control', 'public, max-age=31536000, immutable'); // content-hashed file names
      else if (/[\\/](hero|demo-villas)[\\/]/.test(p)) res.setHeader('Cache-Control', 'public, max-age=2592000'); // 30 days: give a replacement photo a new file name
    } }));
    // Page routes only: a missing file (e.g. /demo-villas/x.jpg) is a real 404, and unknown pages get a real 404 status with the branded page.
    app.get(/^(?!\/api\/).*/, async (req, res, next) => {
      try {
        if (path.extname(req.path)) return res.status(404).type('text/plain').send('Not found');
        if (req.path.length > 1 && req.path.endsWith('/')) {
          const clean = `/${req.path.replace(/^\/+/, '').replace(/\/+$/, '')}`; // exactly one leading slash: never a protocol-relative redirect
          const qs = req.originalUrl.includes('?') ? req.originalUrl.slice(req.originalUrl.indexOf('?')) : '';
          return res.redirect(301, clean + qs);
        }
        const base = publicBase(req);
        const meta = await resolvePage(req.path, base);
        res.status(meta.status).set('Cache-Control', 'no-cache').type('html');
        const html = currentShell();
        res.send(hasHeadMarkers(html) ? injectHead(html, meta, base) : html);
      } catch (e) { next(e); }
    });
  }

  app.use(errorHandler);
  return app;
}
