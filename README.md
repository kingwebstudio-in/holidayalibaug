# HolidayAlibag.com

Luxury villa **booking-enquiry** website: React + Vite + TypeScript + Tailwind frontend, Express + TypeScript API, a full-page admin at `/admin`.
Enquiry-only — no payments and no live availability. A booking is never confirmed by a form submission; only an admin who attests they checked real availability can confirm it.

## Quick start — local demo mode (no Supabase, no Cloudinary, no database server)

```bash
npm install
npm run local:setup      # creates the local database, loads 10 DEMO properties, creates an admin (random password printed ONCE)
npm run dev:all          # API on :4000 and website on :3000 in one terminal
```

Or in **two terminals**: `npm run dev:server` (API) and `npm run dev` (website).

* Website: <http://localhost:3000> · Admin: <http://localhost:3000/admin> (sign in with the e-mail/password printed by `local:setup`)
* Choose your own admin instead: `ADMIN_INITIAL_EMAIL=you@example.com ADMIN_INITIAL_PASSWORD='a-long-passphrase-1' npm run local:setup`
* Something wrong? `npm run doctor` explains it (mode, database, migrations, Cloudinary, SMTP) without printing secrets.

> **If the site says "could not reach its server":** the API is not running. Start it (`npm run dev:server`, or just use `npm run dev:all`). If the API exits on start, its message says why.

### How local mode stores data
Local mode runs an **embedded PostgreSQL** (PGlite) persisted in `server/.data/local-db` (git-ignored; never served by the web server). It runs the *same* migrations, SQL, validation and business rules as the real database, so behaviour in local and Supabase modes cannot drift apart. Edits, publishes, deletions and admin accounts survive restarts; demo properties are loaded only once. It is a development tool: local mode is refused when `NODE_ENV=production`. Reset it with `npm run local:reset -- --yes`.

## The three modes

| | Local demo (default for dev) | Supabase / PostgreSQL | Cloudinary uploads (optional, add-on) |
|---|---|---|---|
| Needs | nothing | `DATABASE_URL` | `CLOUDINARY_*` |
| Selected by | `DATA_MODE=local`, or no `DATABASE_URL` in development | `DATA_MODE=postgres`, or `DATABASE_URL` set | credentials present |
| If it fails | — | **server stops with a clear message; never falls back to demo data** | uploads disabled; site keeps working |

The admin dashboard shows the active mode, database status, pending migrations, upload and e-mail status, and how many demo properties exist. A badge/banner shows "Demo mode" on the public site and in admin whenever sample data is present.

## WhatsApp, enquiries and website media (admin → *Website Content / Media*)
* **WhatsApp number & default message** are set in the admin (`/admin/media`) — nothing is hardcoded. Enter the number in international format (country code + number, digits only, e.g. `91 98765 43210`; no `+`, no leading `0`). It is stored as digits and used for every `https://wa.me/<number>?text=<URL-encoded message>` link. With no number set, **all WhatsApp buttons are hidden** and the dashboard warns you. (`WHATSAPP_NUMBER` in `.env` is only a fallback.)
* **Floating button**: a fixed WhatsApp icon at the bottom-right of every public page; it opens your number with the default message.
* **All enquiry forms** (booking/availability, villa-owner, property-investment): the form is validated, the enquiry is **saved first** (admin Enquiries list), the success screen and reference number appear only after the server confirms the save, and *then* WhatsApp opens with a formatted message (reference, property, dates, guests, contact details, notes). If the browser blocks the window or you close it, the enquiry stays saved and the success screen has a **Send on WhatsApp** button to retry. Double-clicks cannot create duplicates (idempotency key + in-flight guard). A submission is never "confirmed" — only an admin can confirm a booking after checking availability. The WhatsApp message goes only to the number you configured; nothing is logged or stored elsewhere.
* **Hero image / hero video / poster**: set, replace or remove them in the same admin page. A live **preview** shows your unsaved choice; **Save & publish** updates the website immediately. Fallbacks: no image → bundled default; video fails to load, visitor prefers reduced motion, or data-saver is on → poster → hero image. Videos: MP4/WebM/MOV, up to 50 MB when uploaded via Cloudinary (keep clips short and compressed), or paste a hosted video URL.
* Replaced or removed hero/property images and videos are deleted from Cloudinary only when nothing else uses them.

## Property photos
Each property takes as many photos as you need (5–10 recommended; the editor accepts up to 100). In the property editor → **Images** you can upload several files at once (Cloudinary) or add URLs, drag-free **reorder** with ↑/↓, pick the ★ **cover** image, edit the **caption / alt text**, **replace** a photo (upload or edit its URL), **remove** it and **preview** the result. On the website the property modal shows a thumbnail strip and a full-screen **photo viewer** (arrows, keyboard, swipe, captions, counter, thumbnails). Asset ids and order are stored with the property.

## Adding your first property
1. Admin → **Properties** → **Add new property**.
2. Work through the tabs (basics, type & location, descriptions, pricing, capacity, amenities, images, rules & times, SEO, publishing). Only name, bedrooms and guests are needed for a **draft**; to **publish** you also need a location, short and full description and a featured image.
3. **Preview** shows exactly how it will look. **Save & publish** makes it live on the website immediately (no code changes).
4. Prices: enter a price only when it is verified; blank shows "Price on enquiry".
5. Remove the sample properties when you are ready: filter the list by **Demo only** and delete them, or `npm run db:remove-demo -- --yes`.

## Supabase (managed PostgreSQL) — do this later
1. Create a project at <https://supabase.com> and choose a strong database password (save it in a password manager).
2. In the project dashboard, open **Connect** and copy a PostgreSQL connection string. Use the **Session pooler** string (works on IPv4 networks) or the **Direct connection** (needs IPv6 on some plans). For `db:migrate` avoid the *Transaction pooler* (port 6543). Menu names can change — check Supabase's docs if the labels differ.
3. Put it in `.env` (never commit it, never use a `VITE_` prefix):
   ```
   DATA_MODE=postgres
   DATABASE_URL=postgresql://postgres.xxxx:YOUR-PASSWORD@aws-0-REGION.pooler.supabase.com:5432/postgres
   ```
   URL-encode special characters in the password (`@` → `%40`, `#` → `%23`, `/` → `%2F`). TLS is enabled automatically for non-local hosts (`DATABASE_SSL=auto`); to fully verify the certificate download Supabase's CA certificate and set `DATABASE_SSL_CA=/path/to/prod-ca.crt`.
4. Verify and create the schema:
   ```bash
   npm run doctor            # should report "Database is reachable" and list pending migrations
   npm run db:migrate        # applies server/migrations/*.sql (safe to re-run)
   npm run admin:create      # first admin (hidden password prompt)
   npm run doctor            # everything green
   ```
5. Optional sample data in the *real* database (not recommended for production): `npm run db:seed-demo` (idempotent, flagged as demo; remove later with `npm run db:remove-demo -- --yes`). Nothing is ever seeded, reset or deleted automatically.
6. Keep environments separate: use one Supabase project for development/testing and another for production.

## Cloudinary (image uploads) — do this later
1. Create a free account at <https://cloudinary.com>. In **Settings → API Keys** note the cloud name, API key and API secret.
2. Add to `.env` (server-side only): `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` (or the single `CLOUDINARY_URL=cloudinary://KEY:SECRET@CLOUD`). Optionally `CLOUDINARY_FOLDER`.
3. Restart the API. In the property editor → **Images**, *Upload* is now enabled (JPEG/PNG/WebP/GIF, ≤ 8 MB, validated by file content, admin-only). The image URL and asset id are stored with the property. Removing/replacing an image or deleting a property deletes the Cloudinary asset only if no other property uses it.
4. Without these values, paste image URLs instead — nothing else changes. A Cloudinary outage only affects uploading, never the public site.

## Switching from local demo data to the real database safely
Switching modes never touches the other side. The local data stays in `server/.data/local-db` until *you* delete it.
1. Configure and migrate Supabase as above (`npm run db:migrate`).
2. Optionally copy your **own** (non-demo) local content across — it only inserts, never overwrites or deletes:
   ```bash
   TARGET_DATABASE_URL='postgresql://…' npm run data:copy-to-postgres -- [--with-enquiries] [--with-admins] [--include-demo]
   ```
3. Set `DATABASE_URL` (or `DATA_MODE=postgres`) and restart. Create an admin with `npm run admin:create` unless you copied admins.
4. Only after verifying, delete the local data: `npm run local:reset -- --yes`.

## Production build (single origin)
```bash
npm run build:all
npm run db:migrate:prod
npm run admin:create:prod          # first deployment only
NODE_ENV=production npm start      # Express serves the API and dist/
```
Production requires `DATABASE_URL` (or `DATA_MODE=postgres`) and a `SESSION_SECRET` of 32+ random characters, refuses `DATA_MODE=local`, and has no default accounts. Production also requires `SITE_URL` and `TRUST_PROXY` (the server refuses to start without them) — see `docs/DEPLOYMENT.md`. Cookies are `HttpOnly; Secure; SameSite=Lax`. Full variable list: `.env.example`.

## Launch documentation
`docs/DEPLOYMENT.md` (variables, Supabase, DNS/HTTPS, admin) · `docs/SECURITY_AUDIT.md` (findings, remaining risks) · `docs/LEGAL_REVIEW_CHECKLIST.md` · `docs/LAUNCH_CHECKLIST.md`. Privacy requests: `npm run privacy -- export|erase|purge`. Browser audit: `npm run test:e2e:launch`.

## API summary (`/api/v1`, envelope `{success, data, meta?}`)
Public: `GET /health` · `/villas` (`q, location, type, guests, bedrooms, minPrice, maxPrice, featured, sort, page, pageSize`) · `/villas/options` · `/villas/facets` · `/villas/:slug` · `/villas/:slug/related` · `/settings/public` · `/testimonials` · `POST /booking-enquiries` · `/villa-owner-enquiries` · `/investment-enquiries` (accept `Idempotency-Key`, rate-limited).
Admin (`/admin`, cookie session + CSRF header on writes): auth · `dashboard` · `meta` (environment status) · booking/owner/investment enquiries · `villas` (list/filter/paginate, create, update, publish, feature, duplicate, delete) · `uploads/image` · `settings` · `testimonials`.

## Tests
```bash
npm run lint                # tsc (frontend + backend)
npm run test:local          # 109 API/DB/startup/launch tests on the embedded engine (no setup)
npm run test:postgres       # the same API/DB tests (82) on real PostgreSQL (needs TEST_DATABASE_URL — tables are TRUNCATED)
npm run test:e2e:scroll     # real-browser scroll/dropdown checks, 8 viewports (360–1440 px)
ADMIN_EMAIL=… ADMIN_PASSWORD=… npm run test:e2e:flow         # enquiries → database → /admin → responsive admin
ADMIN_EMAIL=… ADMIN_PASSWORD=… npm run test:e2e:properties   # admin property management + public search/filters
ADMIN_EMAIL=… ADMIN_PASSWORD=… npm run test:e2e:whatsapp-media # WhatsApp handoff, hero media, floating button, photo viewer
```
Browser tests need the app running (e.g. `npm run build && DATA_MODE=local npm run dev:server`, Express serves `dist/`) and use `puppeteer-core` + `@sparticuz/chromium`. `server/tests/startup.test.ts` spawns the real server to check persistence across restarts and failure messages (bad URL, refused connection, auth failure, missing database, un-migrated schema, production safety); it needs `TEST_PG_URL_BASE` for the PostgreSQL-specific cases.

## Known limitations
* Demo photos are a small set of bundled images reused across the 10 sample properties; demo names, prices and capacities are invented.
* Hero booking search and enquiries do not check real availability — the team confirms availability manually.
* Image upload needs Cloudinary (or add URLs); no other storage provider is implemented, but `server/src/services/imageStorage.ts` is a single interface to swap.
* The privacy policy and terms (`src/pages/`) are drafts for legal review — see `docs/LEGAL_REVIEW_CHECKLIST.md`.
* The browser tests replace `window.open` with a recording stub to inspect the exact WhatsApp URL; they do not open the real WhatsApp app or website. Real-device behaviour (popup blockers, WhatsApp app hand-off on iOS/Android) should be checked manually.
* Hero video upload is untested against a live Cloudinary account (the upload API is tested with a mocked Cloudinary).
* Touch scrolling is verified with emulated touch in headless Chromium, not on physical iOS/Android devices.
* Supabase and Cloudinary were tested against a local PostgreSQL and a mocked Cloudinary API, not live accounts.
