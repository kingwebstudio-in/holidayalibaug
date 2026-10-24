import 'dotenv/config';
import path from 'node:path';
import { z } from 'zod';

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(4000),
  /** local = embedded on-disk PostgreSQL (demo/dev). postgres = your real database (e.g. Supabase). */
  DATA_MODE: z.enum(['local', 'postgres']).optional(),
  DATABASE_URL: z.string().default(''),
  /** auto = TLS for any non-localhost host (Supabase etc.). true/false force it. */
  DATABASE_SSL: z.enum(['true', 'false', 'auto']).default('auto'),
  /** Optional path to a CA certificate to fully verify the database TLS certificate. */
  DATABASE_SSL_CA: z.string().default(''),
  /** Where local demo mode keeps its data (a directory). `memory://` = not persisted (used by tests). */
  LOCAL_DATA_DIR: z.string().default(''),
  /** Load the demo villas the first time local mode starts. */
  LOCAL_AUTO_SEED: z.enum(['true', 'false']).default('true'),
  /** Comma-separated list of browser origins allowed to call the API (only needed if the frontend is on another origin). */
  FRONTEND_URL: z.string().default(''),
  /** Used to HMAC session tokens before they are stored. Required (>=32 chars) in production. */
  SESSION_SECRET: z.string().default(''),
  SESSION_TTL_HOURS: z.coerce.number().int().positive().default(12),
  COOKIE_SAMESITE: z.enum(['strict', 'lax', 'none']).default('lax'),
  /**
   * How many reverse proxies sit in front of the app (e.g. 1 on Render/Railway/Fly/Heroku), or `false` when the app is
   * reached directly. Required in production so rate limiting and HTTPS detection see the real visitor, not the proxy.
   */
  TRUST_PROXY: z.string().default(''),
  /** Public https origin of the live website, e.g. https://holidayalibag.com (no path, no trailing slash). Required in production. */
  SITE_URL: z.string().default(''),
  /** Redirect plain-HTTP requests to HTTPS (needs TRUST_PROXY). Default: on in production, off elsewhere. */
  FORCE_HTTPS: z.enum(['true', 'false']).optional(),
  /** Send Strict-Transport-Security. OFF by default: turn on only after HTTPS works on the live domain. */
  ENABLE_HSTS: z.enum(['true', 'false']).default('false'),
  HSTS_MAX_AGE: z.coerce.number().int().min(0).max(63_072_000).default(15_552_000),
  HSTS_INCLUDE_SUBDOMAINS: z.enum(['true', 'false']).default('false'),
  /** Staging/preview deployments: set to false so search engines are told not to index anything. */
  ALLOW_INDEXING: z.enum(['true', 'false']).default('true'),
  /** Google Analytics 4 measurement ID (G-XXXXXXXXXX). Empty = analytics disabled. Loaded only after the visitor consents. */
  ANALYTICS_MEASUREMENT_ID: z.string().default(''),
  BUSINESS_TIMEZONE: z.string().default('Asia/Kolkata'),
  /** Optional fallback if no WhatsApp number has been saved in Website Settings. Digits with country code. */
  WHATSAPP_NUMBER: z.string().default(''),
  SMTP_HOST: z.string().default(''),
  SMTP_PORT: z.coerce.number().int().default(587),
  SMTP_SECURE: z.enum(['true', 'false']).default('false'),
  SMTP_USER: z.string().default(''),
  SMTP_PASS: z.string().default(''),
  NOTIFY_EMAIL_FROM: z.string().default(''),
  NOTIFY_EMAIL_TO: z.string().default(''),
  /** Optional Cloudinary image storage. Either the three values below or CLOUDINARY_URL. */
  CLOUDINARY_CLOUD_NAME: z.string().default(''),
  CLOUDINARY_API_KEY: z.string().default(''),
  CLOUDINARY_API_SECRET: z.string().default(''),
  CLOUDINARY_URL: z.string().default(''),
  CLOUDINARY_FOLDER: z.string().default('holidayalibag/properties'),
  /** Directory containing the built frontend (served by Express in production). */
  STATIC_DIR: z.string().default('dist'),
});

export class ConfigError extends Error {}

function load() {
  const parsed = schema.safeParse(process.env);
  if (!parsed.success) {
    throw new ConfigError(`Invalid environment configuration:\n${parsed.error.issues.map((i) => `  - ${i.path.join('.')}: ${i.message}`).join('\n')}`);
  }
  const env = parsed.data;
  const isProd = env.NODE_ENV === 'production';
  const problems: string[] = [];

  // ── Data mode ──
  const mode: 'local' | 'postgres' = env.DATA_MODE ?? (env.DATABASE_URL ? 'postgres' : isProd ? 'postgres' : 'local');
  let dbHost = '';
  if (mode === 'postgres') {
    if (!env.DATABASE_URL) {
      problems.push(
        isProd && !env.DATA_MODE
          ? 'DATABASE_URL is required in production. Production never falls back to local demo data.'
          : 'DATA_MODE=postgres requires DATABASE_URL (your Supabase/PostgreSQL connection string).',
      );
    } else {
      try {
        const u = new URL(env.DATABASE_URL);
        if (!/^postgres(ql)?:$/.test(u.protocol)) throw new Error('bad protocol');
        dbHost = u.hostname;
      } catch {
        problems.push('DATABASE_URL is not a valid PostgreSQL connection string. Expected: postgresql://USER:PASSWORD@HOST:5432/DATABASE (special characters in the password must be URL-encoded).');
      }
    }
  } else if (isProd) {
    problems.push('DATA_MODE=local (embedded demo database) is not allowed in production. Set DATA_MODE=postgres and DATABASE_URL.');
  }

  // ── Secrets ──
  let sessionSecret = env.SESSION_SECRET;
  if (isProd && sessionSecret.length < 32) problems.push('SESSION_SECRET must be set to a random string of at least 32 characters in production.');
  else if (isProd && (/^(change[-_ ]?me|your[-_ ]|example|placeholder|test-secret|dev-)/i.test(sessionSecret) || new Set(sessionSecret).size < 12)) problems.push('SESSION_SECRET looks like a placeholder or a low-entropy value. Generate one: node -e "console.log(require(\'crypto\').randomBytes(48).toString(\'base64url\'))"');
  if (!isProd && sessionSecret.length < 16) sessionSecret = `dev-${Math.random().toString(36).slice(2)}${Date.now().toString(36)}-ephemeral`;

  // ── Reverse proxy / HTTPS ──
  const tp = env.TRUST_PROXY.trim();
  let trustProxy: boolean | number | string = false;
  if (tp === '' || /^(false|0)$/i.test(tp)) trustProxy = false;
  else if (/^\d+$/.test(tp)) trustProxy = Number(tp);
  else if (/^true$/i.test(tp)) problems.push('TRUST_PROXY=true would trust any client-supplied X-Forwarded-For header. Use the number of proxies (e.g. 1) or a subnet list such as "loopback, uniquelocal".');
  else trustProxy = tp;
  const forceHttps = (env.FORCE_HTTPS ?? (isProd ? 'true' : 'false')) === 'true';
  if (isProd && tp === '') problems.push('TRUST_PROXY must be set explicitly in production (use 1 behind a single proxy/PaaS, or false if the app is reached directly). Without it, rate limiting treats every visitor as the proxy.');
  if (forceHttps && trustProxy === false) problems.push('FORCE_HTTPS needs TRUST_PROXY (the platform proxy terminates TLS; without trusting it every request looks like plain HTTP and would redirect forever). Set TRUST_PROXY=1, or FORCE_HTTPS=false if TLS is handled elsewhere.');

  // ── Public site URL (canonical URLs, sitemap, social previews) ──
  let siteUrl = env.SITE_URL.trim().replace(/\/+$/, '');
  if (siteUrl) {
    try {
      const u = new URL(siteUrl);
      if (!/^https?:$/.test(u.protocol) || u.pathname !== '/' || u.search || u.hash) throw new Error('shape');
      if (isProd && u.protocol !== 'https:') problems.push('SITE_URL must use https:// in production.');
      if (isProd && /^(localhost|127\.|0\.0\.0\.0|\[::1\])/i.test(u.hostname)) problems.push('SITE_URL must be the live public domain in production, not localhost.');
      siteUrl = u.origin;
    } catch {
      problems.push('SITE_URL must be an origin such as https://holidayalibag.com (no path, query or trailing slash).');
    }
  } else if (isProd) problems.push('SITE_URL is required in production (e.g. https://holidayalibag.com). It is used for canonical URLs, the sitemap and social previews.');

  // ── Analytics ──
  const gaId = env.ANALYTICS_MEASUREMENT_ID.trim();
  if (gaId && !/^G-[A-Z0-9]{6,14}$/.test(gaId)) problems.push('ANALYTICS_MEASUREMENT_ID must look like G-XXXXXXXXXX (a Google Analytics 4 measurement ID), or be left empty to disable analytics.');

  // ── Cloudinary (optional) ──
  let cName = env.CLOUDINARY_CLOUD_NAME, cKey = env.CLOUDINARY_API_KEY, cSecret = env.CLOUDINARY_API_SECRET;
  if (env.CLOUDINARY_URL && !(cName && cKey && cSecret)) {
    const m = env.CLOUDINARY_URL.match(/^cloudinary:\/\/([^:]+):([^@]+)@(.+)$/);
    if (m) [, cKey, cSecret, cName] = m;
    else problems.push('CLOUDINARY_URL is malformed. Expected cloudinary://API_KEY:API_SECRET@CLOUD_NAME');
  }
  const cloudinaryPartial = [cName, cKey, cSecret].some(Boolean) && ![cName, cKey, cSecret].every(Boolean);

  if (problems.length) throw new ConfigError(`Configuration problems:\n${problems.map((p) => `  - ${p}`).join('\n')}`);

  const ssl = env.DATABASE_SSL === 'auto' ? !['localhost', '127.0.0.1', '::1', ''].includes(dbHost) : env.DATABASE_SSL === 'true';

  return {
    ...env,
    SESSION_SECRET: sessionSecret,
    trustProxy,
    forceHttps,
    siteUrl,
    hsts: { enabled: env.ENABLE_HSTS === 'true', maxAge: env.HSTS_MAX_AGE, includeSubDomains: env.HSTS_INCLUDE_SUBDOMAINS === 'true' },
    /** Search engines may index only the real production site. */
    indexable: isProd && env.ALLOW_INDEXING === 'true' && Boolean(siteUrl),
    analyticsId: gaId,
    isProd,
    isTest: env.NODE_ENV === 'test',
    dataMode: mode,
    isLocalMode: mode === 'local',
    dbHost,
    dbSsl: ssl,
    localDataDir: env.LOCAL_DATA_DIR || path.resolve(process.cwd(), 'server/.data/local-db'),
    allowedOrigins: env.FRONTEND_URL.split(',').map((s) => s.trim().replace(/\/$/, '')).filter(Boolean),
    smtpConfigured: Boolean(env.SMTP_HOST && env.NOTIFY_EMAIL_FROM && env.NOTIFY_EMAIL_TO),
    cloudinary: { cloudName: cName, apiKey: cKey, apiSecret: cSecret, folder: env.CLOUDINARY_FOLDER.replace(/^\/|\/$/g, ''), configured: Boolean(cName && cKey && cSecret), partial: cloudinaryPartial },
  };
}

function build() {
  try {
    return load();
  } catch (e) {
    if (e instanceof ConfigError) {
      // Fail fast with a readable message (never prints secrets).
      console.error(`\n✖ ${e.message}\n\n  See .env.example and the README ("Configuration"). Run \`npm run doctor\` for diagnostics.\n`);
      process.exit(1);
    }
    throw e;
  }
}

export const config = build();
