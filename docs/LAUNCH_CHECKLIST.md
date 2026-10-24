# Launch verification checklist

Tick each item on the **live domain**; none of these were possible in the authoring environment.

**Forms & WhatsApp**
- [ ] Booking enquiry: submit with a real villa → success screen with reference; row appears in Admin → Booking enquiries; consent box starts unticked and blocks submit.
- [ ] Owner and investment forms: same. Submit the same details twice → same reference, one row.
- [ ] WhatsApp: set the verified number in Admin; after saving, WhatsApp opens with the message. Close it without sending → enquiry still saved.
- [ ] If SMTP configured: notification e-mail arrives (admin shows notification status).

**Cookie consent & analytics**
- [ ] First visit shows the banner; Network tab: no `googletagmanager` request until Accept.
- [ ] Reject optional → still none. Footer "Cookie settings" reopens; withdrawing removes `_ga` cookies.
- [ ] With `ANALYTICS_MEASUREMENT_ID` set and Accept: GA Realtime shows page views and `villa_view`, `booking_enquiry_submit` events (no personal data in parameters).

**Legal pages, SEO, social**
- [ ] `/privacy-policy`, `/terms-and-conditions` load; footer links work; contact block shows your details.
- [ ] `/robots.txt` allows `/`, disallows `/admin` and `/api/`, lists the sitemap; `/sitemap.xml` has only real URLs on your domain (no demo villas).
- [ ] View-source of `/` and a villa URL: unique title, description, canonical (your domain), `og:image` = `/og-image.jpg`.
- [ ] Paste the URL into WhatsApp/LinkedIn debuggers (e.g. Facebook Sharing Debugger) → 1200×630 preview.
- [ ] Favicon shows in the tab; `/this-does-not-exist` shows the 404 page.
- [ ] Google Search Console: add property, submit the sitemap.

**Security & infrastructure**
- [ ] HTTP → HTTPS redirect works once; `securityheaders.com` check; then enable HSTS.
- [ ] `/admin` login works, logout invalidates the session, wrong password is rate-limited.
- [ ] Supabase: Table editor → RLS enabled on all tables; API with the anon key returns nothing.
- [ ] Backups enabled; credentials rotated; PageSpeed Insights run on the live URL.
