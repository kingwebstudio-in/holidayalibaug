# Deployment guide

The hosting platform was not identified in the project. It is one Node process (API + built site) plus PostgreSQL, so any Node or Docker host works. `Dockerfile` and `render.yaml` are provided templates (**not built/tested here**).

## 1. Production environment variables
Set these in the host's dashboard — never in Git, never with a `VITE_` prefix.

| Variable | Required | Value |
|---|---|---|
| `NODE_ENV` | yes | `production` |
| `SITE_URL` | yes | `https://holidayalibag.com` (no trailing slash) |
| `TRUST_PROXY` | yes | `1` on most platforms (`false` only if no proxy) |
| `DATABASE_URL` | yes | Supabase **Session pooler** string (port 5432) |
| `SESSION_SECRET` | yes | `node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"` |
| `DATABASE_SSL_CA` | recommended | path to Supabase CA certificate |
| `FORCE_HTTPS` | default on | leave unset |
| `ENABLE_HSTS` | after HTTPS verified | `true`; start `HSTS_MAX_AGE=300`, raise later |
| `ANALYTICS_MEASUREMENT_ID` | optional | `G-XXXXXXXXXX` from Google Analytics |
| `CLOUDINARY_*` | optional | uploads |
| `SMTP_*`, `NOTIFY_EMAIL_*` | optional | e-mail alerts |
| `ALLOW_INDEXING` | staging only | `false` |

The server **refuses to start** with a clear message if `SITE_URL`, `TRUST_PROXY`, a strong `SESSION_SECRET` or a database is missing, and never falls back to demo data in production.

## 2. Database (Supabase)
1. Create the project; copy the Session-pooler connection string.
2. From your computer: `DATABASE_URL=… NODE_ENV=production npm run build:server && npm run db:migrate:prod` (applies migrations 001–003, including row-level security).
3. In Supabase → Authentication/API settings leave everything default; the app never uses the anon key.
4. Enable Supabase backups (Pro plan = daily; free plan has none — export manually before launch).
5. Rotate any credential that was ever pasted into chat, e-mail or Git.

## 3. Deploy
- **Docker host / Render:** connect the repo, use the `Dockerfile` (or `render.yaml`), set variables, health check path `/api/v1/health`. Build once with `docker build .` to confirm.
- **Plain Node host:** `npm ci && npm run build:all && npm prune --omit=dev`, start with `node server/dist/index.js`.

## 4. Create the production admin
Run in the host shell (or locally against production `DATABASE_URL`): `npm run admin:create:prod`. Name/e-mail via prompts or `ADMIN_INITIAL_*`; type the password at the hidden prompt (12+ characters, letters and numbers). Never commit it. Then remove sample properties: `npm run db:remove-demo -- --yes`.

## 5. Domain, DNS, HTTPS
1. Add the domain in the host; create the DNS records it shows (usually `A`/`ALIAS` for apex, `CNAME` for `www`).
2. Redirect `www` ↔ apex at the host (one canonical host = `SITE_URL`).
3. Wait for the managed certificate; open `https://yourdomain` and `http://yourdomain` (must redirect once to HTTPS, no loop).
4. Only then set `ENABLE_HSTS=true` (small max-age first). Do not use `includeSubDomains` unless every subdomain has HTTPS.
5. Do not treat HTTPS as active until you have seen it in a browser.

## 6. Data requests and retention
`npm run privacy:prod -- export|erase|purge …` (dry-run unless `--yes`). Decide the retention period (see legal checklist) and run `purge` on a schedule you choose; nothing is deleted automatically.
