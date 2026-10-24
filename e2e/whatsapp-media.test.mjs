// WhatsApp handoff, admin media settings and property photo viewer — real browser, real API, real database (local or postgres mode).
// window.open is replaced by a recording stub so the exact WhatsApp URL can be inspected (no external network is used).
// Needs the app running + ADMIN_EMAIL / ADMIN_PASSWORD.
import { BASE, check, done, launch, newPage, sleep } from './lib.mjs';

const EMAIL = process.env.ADMIN_EMAIL, PASSWORD = process.env.ADMIN_PASSWORD;
if (!EMAIL || !PASSWORD) { console.error('Set ADMIN_EMAIL and ADMIN_PASSWORD'); process.exit(2); }
const browser = await launch();
const NUMBER_INPUT = '+91 91234 56789', NUMBER = '919123456789', DEFAULT_MSG = 'Hello from the e2e test! Tell me about your villas.';
const tag = Date.now().toString(36);

const stub = () => {
  window.__wa = [];
  window.__blockPopup = false;
  window.open = (u) => {
    window.__wa.push({ event: 'open', url: u });
    if (window.__blockPopup) return null;
    const w = { closed: false, opener: null, document: { title: '', body: { textContent: '' } }, close() { this.closed = true; window.__wa.push({ event: 'closed' }); } };
    Object.defineProperty(w, 'location', { value: { set href(v) { window.__wa.push({ event: 'navigate', url: v }); }, get href() { return ''; } } });
    return w;
  };
};
const wa = (p) => p.evaluate(() => window.__wa);
const decode = (url) => ({ base: url.split('?')[0], text: decodeURIComponent(url.split('?text=')[1] ?? '') });
const btn = (p, text) => p.evaluate((t) => { const b = [...document.querySelectorAll('button')].find((x) => x.textContent.trim().includes(t) && !x.disabled); if (!b) throw new Error(`button not found: ${t}`); b.click(); }, text);

// ───────── 0. Public site with NO number configured ─────────
const admin = await newPage(browser, 1280, 900);
await admin.goto(BASE + '/admin/login', { waitUntil: 'networkidle0' });
await admin.type('input[type=email]', EMAIL); await admin.type('input[type=password]', PASSWORD); await admin.click('button[type=submit]');
await admin.waitForFunction(() => location.pathname === '/admin');
const api = (method, path, body) => admin.evaluate(async (m, p, b) => { const r = await fetch(`/api/v1${p}`, { method: m, headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'HolidayAlibagAdmin' }, body: b ? JSON.stringify(b) : undefined }); return { status: r.status, body: await r.json() }; }, method, path, body);
await api('PUT', '/admin/settings', { whatsappNumber: null, whatsappDefaultMessage: null, heroImage: null, heroVideo: null }); // clean start

let pub = await newPage(browser, 1280, 900);
await pub.evaluateOnNewDocument(stub);
await pub.goto(BASE + '/', { waitUntil: 'networkidle0' });
check('no floating WhatsApp button while no number is configured (nothing invented)', await pub.evaluate(() => !document.querySelector('[data-testid=floating-whatsapp]') && !document.querySelector('a[href*="wa.me"]')));
check('default hero image is shown when no custom media is set', await pub.evaluate(() => { const i = document.querySelector('[data-testid=hero-image]'); return !!i && i.naturalWidth > 0 && !document.querySelector('[data-testid=hero-video]'); }));
await admin.goto(BASE + '/admin', { waitUntil: 'networkidle0' });
await admin.waitForFunction(() => /Environment/.test(document.body.textContent));
check('admin overview warns that no WhatsApp number is set', await admin.evaluate(() => /No WhatsApp number is set/.test(document.body.textContent)));

// ───────── 1. Admin: Website Content / Media ─────────
await admin.goto(BASE + '/admin/media', { waitUntil: 'networkidle0' });
check('Website Content / Media is in the admin navigation', await admin.evaluate(() => [...document.querySelectorAll('nav[aria-label=Admin] a')].some((a) => /Website Content \/ Media/.test(a.textContent))));
check('uploads show a clear disabled state without Cloudinary', await admin.evaluate(() => /Cloudinary is not configured/.test(document.body.textContent) && [...document.querySelectorAll('button')].filter((b) => /Upload/.test(b.textContent)).every((b) => b.disabled)));
const fillByLabel = async (text, value) => { const h = await admin.evaluateHandle((t) => [...document.querySelectorAll('label')].find((l) => l.textContent.trim().startsWith(t))?.querySelector('input,textarea'), text); const el = h.asElement(); if (!el) throw new Error(`no field ${text}`); await el.evaluate((e) => { e.focus(); e.select?.(); }); await el.type(value); };
await fillByLabel('WhatsApp number', 'abc');
await btn(admin, 'Save & publish'); await sleep(300);
check('an invalid WhatsApp number is rejected with guidance (nothing saved)', await admin.evaluate(() => /international format/.test(document.body.textContent)));
await fillByLabel('WhatsApp number', NUMBER_INPUT);
await fillByLabel('Default enquiry message', DEFAULT_MSG);
await fillByLabel('Image URL', '/demo-villas/serenity.jpg');
await fillByLabel('Alt text', 'Serenity villa at dusk');
await fillByLabel('Video URL', 'https://unreachable.invalid/hero.mp4');
await fillByLabel('Poster image URL', '/demo-villas/palm.jpg');
await sleep(300);
check('preview shows the unsaved hero image before publishing', await admin.evaluate(() => document.querySelector('[data-testid=media-preview] [data-testid=hero-image]').src.endsWith('/demo-villas/serenity.jpg')));
check('the public site is NOT changed until Save is pressed', (await (await fetch(`${BASE}/api/v1/settings/public`)).json()).data.heroImage === null);
check('the “Test this WhatsApp link” link uses the normalised number and message', await admin.evaluate((n, m) => { const a = [...document.querySelectorAll('a')].find((x) => /Test this WhatsApp link/.test(x.textContent)); return !!a && a.href.startsWith(`https://wa.me/${n}?text=`) && decodeURIComponent(a.href.split('?text=')[1]) === m; }, NUMBER, DEFAULT_MSG));
await btn(admin, 'Save & publish');
await admin.waitForFunction(() => /live on the public website/.test(document.body.textContent), { timeout: 10000 });
check('saving publishes immediately (success message)', true);
const settings = (await (await fetch(`${BASE}/api/v1/settings/public`)).json()).data;
check('number stored in international digits; message, hero image and video saved', settings.whatsappNumber === NUMBER && settings.whatsappDefaultMessage === DEFAULT_MSG && settings.heroImage.url === '/demo-villas/serenity.jpg' && settings.heroVideo.posterUrl === '/demo-villas/palm.jpg');

// ───────── 2. Public site reflects it ─────────
for (const [w, h] of [[1280, 900], [360, 640]]) {
  const p = await newPage(browser, w, h);
  await p.evaluateOnNewDocument(stub);
  await p.goto(BASE + '/', { waitUntil: 'domcontentloaded' });
  await p.waitForSelector('[data-testid=floating-whatsapp]');
  const fb = await p.evaluate(() => { const a = document.querySelector('[data-testid=floating-whatsapp]'); const r = a.getBoundingClientRect(); return { href: a.href, right: innerWidth - r.right, bottom: innerHeight - r.bottom, w: r.width, h: r.height, pos: getComputedStyle(a.parentElement).position, target: a.target, rel: a.rel }; });
  const d = decode(fb.href);
  check(`${w}px: floating WhatsApp button is fixed at the bottom-right`, fb.pos === 'fixed' && fb.right >= 0 && fb.right <= 32 && fb.bottom >= 0 && fb.bottom <= 32 && fb.w >= 44 && fb.h >= 44, JSON.stringify({ r: Math.round(fb.right), b: Math.round(fb.bottom), w: Math.round(fb.w) }));
  check(`${w}px: it opens the admin's number with the admin's default message`, d.base === `https://wa.me/${NUMBER}` && d.text === DEFAULT_MSG && fb.target === '_blank' && /noopener/.test(fb.rel));
  await sleep(1500);
  check(`${w}px: hero shows the configured image; a failing video falls back without errors`, await p.evaluate(() => document.querySelector('[data-testid=hero-image]').src.endsWith('/demo-villas/serenity.jpg') && !document.querySelector('[data-testid=hero-video]') && document.querySelector('[data-testid=hero-image]').naturalWidth > 0));
  check(`${w}px: no horizontal overflow`, (await p.evaluate(() => document.documentElement.scrollWidth - innerWidth)) <= 0);
  await p.close();
}
await pub.reload({ waitUntil: 'domcontentloaded' });
await pub.waitForSelector('[data-testid=floating-whatsapp]');

// ───────── 3. Booking → saved → WhatsApp ─────────
await pub.evaluate(() => [...document.querySelectorAll('button[type=submit]')].find((b) => /Request Availability/.test(b.textContent)).click());
await pub.waitForSelector('#bk-name');
await pub.evaluate(() => [...document.querySelectorAll('[role=dialog] button[type=submit]')][0].click());
await sleep(200);
check('invalid form: no WhatsApp window is opened and nothing is saved', (await wa(pub)).length === 0);
await pub.type('#bk-name', `Priya Sharma ${tag}`); await pub.type('#bk-phone', '98200 12345'); await pub.type('#bk-email', 'priya@example.test'); await pub.type('#bk-msg', 'Anniversary trip & early check-in (if possible)');
await pub.evaluate(() => { const b = [...document.querySelectorAll('[role=dialog] button[type=submit]')][0]; b.click(); b.click(); b.click(); });
await pub.waitForSelector('[data-testid=enquiry-reference]', { timeout: 15000 });
const ref = await pub.$eval('[data-testid=enquiry-reference]', (e) => e.textContent.trim());
let ev = await wa(pub);
const nav = ev.filter((e) => e.event === 'navigate');
check('exactly one WhatsApp window is opened despite triple-click (no duplicates)', ev.filter((e) => e.event === 'open').length === 1 && nav.length === 1, JSON.stringify(ev.map((e) => e.event)));
const m = decode(nav[0].url);
check('WhatsApp URL targets the configured number', m.base === `https://wa.me/${NUMBER}`);
check('message has the reference, property, dates, guests, contact details and notes', [ref, 'Any villa', 'Check-in:', 'Check-out:', '4 adults', `Priya Sharma ${tag}`, '98200 12345', 'priya@example.test', 'Anniversary trip & early check-in (if possible)'].every((x) => m.text.includes(x)), m.text.replace(/\n/g, ' | ').slice(0, 160));
check('message is URL-encoded safely (newlines, &, parentheses survive a round trip)', nav[0].url.includes('%0A') && !nav[0].url.includes('&early') && m.text.includes('&'));
check('message states it is only an enquiry (never "confirmed")', /enquiry only/i.test(m.text) && !/confirmed booking|booking confirmed/i.test(m.text));
const row = await pub.evaluate(() => ({ send: document.querySelector('[data-testid=send-on-whatsapp]')?.href, text: document.querySelector('[role=dialog]').textContent }));
check('success screen: reference, “not confirmed” wording and a Send on WhatsApp retry link with the same message', row.send === nav[0].url && /Availability is not confirmed/.test(row.text) && /WhatsApp should have opened/.test(row.text));
const saved = await api('GET', `/admin/booking-enquiries?q=${ref}`);
check('the enquiry was saved first and is Pending in admin', saved.body.data.length === 1 && saved.body.data[0].status === 'Pending' && saved.body.data[0].customerName === `Priya Sharma ${tag}`);
await pub.keyboard.press('Escape'); await sleep(200);

// popup blocked → saved + retry button
await pub.evaluate(() => { window.__blockPopup = true; window.__wa = []; });
await pub.evaluate(() => [...document.querySelectorAll('button[type=submit]')].find((b) => /Request Availability/.test(b.textContent)).click());
await pub.waitForSelector('#bk-name');
await pub.type('#bk-name', `Blocked Popup ${tag}`); await pub.type('#bk-phone', '9820012345'); await pub.type('#bk-email', 'b@example.test');
await pub.evaluate(() => [...document.querySelectorAll('[role=dialog] button[type=submit]')][0].click());
await pub.waitForSelector('[data-testid=enquiry-reference]', { timeout: 15000 });
check('popup blocked: enquiry still saved, a clear notice and a Send on WhatsApp button are shown', await pub.evaluate(() => /blocked the WhatsApp window/.test(document.querySelector('[role=dialog]').textContent) && !!document.querySelector('[data-testid=send-on-whatsapp]')));
await pub.keyboard.press('Escape'); await sleep(200);

// failed save → no success, no WhatsApp, form kept
await pub.evaluate(() => { window.__blockPopup = false; window.__wa = []; });
await pub.setRequestInterception(true);
const onReq = (r) => (r.method() === 'POST' && /booking-enquiries/.test(r.url()) ? r.respond({ status: 500, contentType: 'application/json', body: JSON.stringify({ success: false, error: { code: 'internal_error', message: 'Something went wrong on our side. Please try again.' } }) }) : r.continue());
pub.on('request', onReq);
await pub.evaluate(() => [...document.querySelectorAll('button[type=submit]')].find((b) => /Request Availability/.test(b.textContent)).click());
await pub.waitForSelector('#bk-name');
await pub.type('#bk-name', 'Will Fail'); await pub.type('#bk-phone', '9820012345'); await pub.type('#bk-email', 'f@example.test');
await pub.evaluate(() => [...document.querySelectorAll('[role=dialog] button[type=submit]')][0].click());
await sleep(1500);
ev = await wa(pub);
check('failed save: no success screen, error shown, details kept', await pub.evaluate(() => !document.querySelector('[data-testid=enquiry-reference]') && /Something went wrong/.test(document.querySelector('[role=dialog]').textContent) && document.querySelector('#bk-name').value === 'Will Fail'));
check('failed save: the placeholder WhatsApp tab is closed and nothing is sent to WhatsApp', ev.some((e) => e.event === 'closed') && !ev.some((e) => e.event === 'navigate'));
pub.off('request', onReq); await pub.setRequestInterception(false);
await pub.keyboard.press('Escape'); await sleep(200);

// ───────── 4. Owner + investment forms ─────────
await pub.evaluate(() => { window.__wa = []; document.querySelector('#owner-form-container').scrollIntoView(); }); await sleep(900);
await pub.type('#owner-form-container input[name=name]', `Owner ${tag}`); await pub.type('#owner-form-container input[name=phone]', '9890011223'); await pub.type('#owner-form-container input[name=villaName]', 'Cliff House');
await pub.click('#owner-form-container button[type=submit]');
await pub.waitForFunction(() => /OWN-\d{8}-/.test(document.querySelector('#owner-form-container').textContent), { timeout: 15000 });
let o = (await wa(pub)).filter((e) => e.event === 'navigate');
check('villa-owner enquiry: saved, then WhatsApp opens with name, phone, villa and OWN- reference', o.length === 1 && /OWN-\d{8}-[A-Z2-9]{6}/.test(decode(o[0].url).text) && decode(o[0].url).text.includes('Cliff House') && decode(o[0].url).text.includes('9890011223') && decode(o[0].url).text.includes(`Owner ${tag}`));
check('villa-owner success has the retry button', await pub.evaluate(() => !!document.querySelector('#owner-form-container [data-testid=send-on-whatsapp]')));
await pub.evaluate(() => { window.__wa = []; document.querySelector('#property-investment').scrollIntoView(); }); await sleep(900);
await pub.type('#property-investment input[name=fullName]', `Investor ${tag}`); await pub.type('#property-investment input[name=phone]', '9765432109'); await pub.type('#property-investment input[name=email]', 'inv@example.test');
await pub.click('#property-investment button[type=submit]');
await pub.waitForFunction(() => /INV-\d{8}-/.test(document.querySelector('#property-investment').textContent), { timeout: 15000 });
o = (await wa(pub)).filter((e) => e.event === 'navigate');
check('investment enquiry: saved, then WhatsApp opens with details and INV- reference', o.length === 1 && /INV-\d{8}-[A-Z2-9]{6}/.test(decode(o[0].url).text) && decode(o[0].url).text.includes('inv@example.test') && decode(o[0].url).text.includes(`Investor ${tag}`));
check('admin sees both enquiries', (await api('GET', `/admin/villa-owner-enquiries?q=${tag}`)).body.data.length === 1 && (await api('GET', `/admin/investment-enquiries?q=${tag}`)).body.data.length === 1);

// ───────── 5. Property gallery + lightbox ─────────
const NAME = `Gallery ${tag}`;
const imgs = ['ocean', 'palm', 'garden', 'serenity', 'hero', 'patio', 'beach-kihim', 'fort'].map((n, i) => ({ url: `/demo-villas/${n}.jpg`, alt: `Caption ${i + 1}: ${n}`, publicId: null }));
const created = await api('POST', '/admin/villas', { name: NAME, propertyType: 'Sea-View Villa', location: 'Kihim, Alibaug', shortDescription: 'Gallery test', fullDescription: 'A property created by the browser test to verify photo galleries.', bedrooms: 3, maxGuests: 6, featuredImage: '/demo-villas/beach-alibaug.jpg', gallery: imgs, isPublished: true });
check('property with 8 gallery photos + cover is created and published', created.status === 201 && created.body.data.galleryImages.length === 8);
const g = await newPage(browser, 1280, 900);
await g.goto(BASE + '/', { waitUntil: 'domcontentloaded' });
await g.waitForSelector('#pf-q'); await g.type('#pf-q', NAME);
await g.waitForFunction((n) => { const h = [...document.querySelectorAll('#villa-collection-grid article h3')]; return h.length === 1 && h[0].textContent === n; }, { timeout: 10000 }, NAME);
await g.evaluate(() => [...document.querySelector('#villa-collection-grid article').querySelectorAll('button')].find((b) => /View Details/.test(b.textContent)).click());
await g.waitForSelector('[data-testid=open-lightbox]'); await sleep(400);
check('detail modal shows a thumbnail for every photo (cover + 8)', (await g.$$eval('[role=dialog] button[aria-label^="Show photo"]', (b) => b.length)) === 9);
await g.click('[data-testid=open-lightbox]'); await g.waitForSelector('[data-testid=lightbox-counter]');
check('lightbox opens at photo 1 of 9 with its caption/alt', (await g.$eval('[data-testid=lightbox-counter]', (e) => e.textContent.trim())) === '1 / 9');
await g.keyboard.press('ArrowRight'); await g.keyboard.press('ArrowRight'); await sleep(200);
check('arrow keys move through photos and show the matching caption', (await g.$eval('[data-testid=lightbox-counter]', (e) => e.textContent.trim())) === '3 / 9' && /Caption 2: palm/.test(await g.$eval('[data-testid=lightbox-caption]', (e) => e.textContent)));
await g.keyboard.press('ArrowLeft'); await g.keyboard.press('ArrowLeft'); await g.keyboard.press('ArrowLeft'); await sleep(150);
check('navigation wraps around from the first to the last photo', (await g.$eval('[data-testid=lightbox-counter]', (e) => e.textContent.trim())) === '9 / 9');
await g.keyboard.press('Escape'); await sleep(250);
check('Escape closes only the lightbox; the property details stay open', await g.evaluate(() => !document.querySelector('[data-testid=lightbox-counter]') && !!document.querySelector('h2#villa-modal-title')));
await g.keyboard.press('Escape'); await sleep(250);
check('a second Escape closes the details', await g.evaluate(() => !document.querySelector('h2#villa-modal-title')));
await g.close();
const del = await api('DELETE', `/admin/villas/${created.body.data.id}`);
check('test property cleaned up', del.status === 200);

// ───────── 6. Admin media page responsive + cleanup ─────────
const m375 = await newPage(browser, 375, 700);
await (await m375.createCDPSession()).send('Network.clearBrowserCookies');
await m375.goto(BASE + '/admin/login', { waitUntil: 'networkidle0' });
await m375.type('input[type=email]', EMAIL); await m375.type('input[type=password]', PASSWORD); await m375.click('button[type=submit]');
await m375.waitForFunction(() => location.pathname === '/admin');
await m375.goto(BASE + '/admin/media', { waitUntil: 'networkidle0' }); await sleep(300);
check('admin media page: no horizontal overflow at 375px', (await m375.evaluate(() => document.documentElement.scrollWidth - innerWidth)) <= 0);
await m375.close();
await api('PUT', '/admin/settings', { whatsappNumber: null, whatsappDefaultMessage: null, heroImage: null, heroVideo: null });
await pub.reload({ waitUntil: 'domcontentloaded' });
await pub.waitForSelector('[data-testid=hero-image]'); await sleep(800);
check('clearing the number removes the floating button again; hero returns to default', await pub.evaluate(() => !document.querySelector('[data-testid=floating-whatsapp]') && !document.querySelector('[data-testid=hero-image]').src.includes('serenity')));
await done(browser);
