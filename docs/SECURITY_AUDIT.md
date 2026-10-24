# Security & launch audit — HolidayAlibag.com

Architecture found: React 19 + Vite + TypeScript + Tailwind frontend; Express 5 + TypeScript API (`/api/v1`) serving the built frontend on one origin; PostgreSQL (Supabase) or an embedded local demo database; optional Cloudinary uploads and SMTP notifications; cookie-session admin with CSRF header. Public forms: booking, villa-owner, investment.

Status key — **Verified**: checked by an automated test or real-browser run in this audit. **Not verified live**: written and unit-tested, but needs checking on the real deployment.

## Findings fixed
| # | Sev | Finding | Fix | Evidence |
|---|-----|---------|-----|----------|
| 1 | High | No row-level security. On Supabase, tables in `public` are exposed through the REST API with the (public) anon key — admin password hashes, session hashes and all enquiries readable. | Migration `003_row_level_security.sql`: RLS on every table, privileges revoked from `anon`/`authenticated`. | Test: every table has RLS (local engine). **Not verified on a live Supabase project.** |
| 2 | High (business) | Old policy popup invented refund percentages, deposits, house rules. | Removed. New `/privacy-policy` and `/terms-and-conditions` describe only real behaviour; cancellation = "agreed in writing", no numbers; draft notice shown. | Browser test |
| 3 | Med | Consent checkbox pre-ticked on all forms. | Unticked by default; server requires it. | Browser + API tests |
| 4 | Med | CSP had no `media-src`; hosted hero videos were blocked. | `media-src 'self' https: blob:`. | Header test |
| 5 | Med | Behind a proxy, rate limits saw only the proxy IP unless `TRUST_PROXY` set. | Production refuses to start without it; `true` rejected. | Startup tests |
| 6 | Med | No HTTPS redirect / HSTS control. | `FORCE_HTTPS` (redirect to `SITE_URL` host, never Host header; 426 for non-GET), opt-in `ENABLE_HSTS`. | Unit tests with proxy headers. **Not verified live.** |
| 7 | Med | Unknown URLs returned 200; no per-page metadata; raw `index.html` served. | Server-injected title/description/canonical/OG/Twitter/JSON-LD, real 404s, trailing-slash + `/index.html` redirects (no open redirect), generated `robots.txt` / `sitemap.xml`. | Tests + browser |
| 8 | Med | No bot / duplicate protection. | Honeypot (fake success, nothing stored), 15-min duplicate detection, 8/10 min + 25/hour limits, read limiter. | Tests |
| 9 | Med | Public API revealed data engine and DB operational hints. | Removed; generic 503 in production. | Tests |
| 10 | Low | Google Fonts (third-party request before consent). | Self-hosted fonts. | Browser: zero third-party requests pre-consent |
| 11 | Low | Placeholder `SESSION_SECRET` accepted. | Rejected in production. | Startup test |
| 12 | Low | Unused `@google/genai`; esbuild advisory. | Removed / upgraded. | `npm audit` = 0 |
| 13 | Low | Stray empty `src/.git`. | Removed. | — |
| 14 | Low | Slowloris exposure. | Header/request/keep-alive timeouts. | — |
| 15 | Func | Mobile menu code clobbered other modals' scroll lock; Home/End scrolled the page from the villa selector. | Shared lock; key handling. | Scroll suite, 8 viewports |

Checked and found sound (no change needed): parameterised SQL with whitelisted sort columns, bcrypt (cost 12), HMAC-hashed session tokens, HttpOnly/Secure/SameSite cookies scoped to `/api/v1/admin`, CSRF header on admin writes, every admin route returns 401 without a session (existing table-driven test), UUID-validated IDs, image magic-byte sniffing and no SVG uploads, HTML-escaped notification e-mails, no secrets/source maps/env files in `dist`.

## Remaining risks
| Sev | Risk | Mitigation |
|-----|------|-----------|
| Medium | DB TLS accepts any certificate unless `DATABASE_SSL_CA` is set (Supabase default chain isn't in system store). | Download Supabase's CA, set `DATABASE_SSL_CA`. |
| Medium | 5 wrong passwords lock an admin account 15 min (an attacker can keep you out). | Per-IP limiter slows it; keep a second admin. |
| Low | Rate limits are in memory, per instance. | Fine for one instance; use a shared store if scaled out. |
| Low | `style-src 'unsafe-inline'` (React inline styles). Scripts stay strict. | Accepted. |
| Low | Admin link visible in footer. | No security impact. |
| Low | 50 MB video uploads buffered in memory (admin only). | Rate-limited, admin-only. |
| Info | Admin screens not accessibility-audited. | Public pages only were. |

## Not verified
Live domain/HTTPS/HSTS, live Supabase (RLS + TLS), Cloudinary, SMTP delivery, Google Analytics delivery, Docker build, real-device Core Web Vitals, real WhatsApp hand-off. Existing e2e `whatsapp-media` gallery step times out identically on the original ZIP.

## Measured results
Unit/API: 109 passed, 1 skipped (PostgreSQL-only). Browser launch audit: 57 checks passed. Scroll suite: 8 viewports passed. Flow/properties: passed. Lighthouse mobile (simulated slow 4G, local): accessibility 100, best-practices 100, SEO 100, performance 77 (LCP 4.3 s, CLS 0.001, TBT 210 ms) — lab numbers; re-test on the live domain. axe: 0 serious/critical on public pages at 360/768/1440 px.
