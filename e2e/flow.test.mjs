// End-to-end: public enquiries through the real UI -> PostgreSQL -> separate /admin app.
// Needs: app running, and an admin account (ADMIN_EMAIL / ADMIN_PASSWORD env vars).
import { BASE, check, done, launch, newPage, sleep } from './lib.mjs';

const EMAIL = process.env.ADMIN_EMAIL, PASSWORD = process.env.ADMIN_PASSWORD;
if (!EMAIL || !PASSWORD) { console.error('Set ADMIN_EMAIL and ADMIN_PASSWORD'); process.exit(2); }
const browser = await launch();
const stamp = Date.now().toString(36);

// ───────── Public site ─────────
const p = await newPage(browser, 1280, 900);
await p.goto(BASE + '/', { waitUntil: 'networkidle0' });
check('homepage shows villas from the API', (await p.$$eval('#villas article, #villas [class*=rounded]', (n) => n.length)) > 0);
check('no WhatsApp action is shown while no number is configured', await p.evaluate(() => !document.querySelector('a[href*="wa.me"]')));

// 1) booking enquiry with a deliberate double-click on submit
await p.evaluate(() => [...document.querySelectorAll('button[type=submit]')].find((b) => /Request Availability/.test(b.textContent)).click());
await p.waitForSelector('#bk-name');
await p.click('#bk-name'); // empty submit first -> client validation
await p.evaluate(() => [...document.querySelectorAll('[role=dialog] button[type=submit]')][0].click());
await sleep(200);
check('empty booking form shows validation errors and sends nothing', await p.evaluate(() => document.querySelectorAll('[role=dialog] [role=alert]').length >= 3));
await p.type('#bk-name', `E2E Guest ${stamp}`);
await p.type('#bk-phone', '98200 12345');
await p.type('#bk-email', 'guest@example.test');
await p.type('#bk-msg', 'Automated end-to-end test');
await p.evaluate(() => { const b = [...document.querySelectorAll('[role=dialog] button[type=submit]')][0]; b.click(); b.click(); b.click(); });
await p.waitForSelector('[data-testid=enquiry-reference]', { timeout: 15000 });
const ref = await p.$eval('[data-testid=enquiry-reference]', (e) => e.textContent.trim());
check('booking enquiry returns a reference after the server saved it', /^HA-\d{8}-[A-Z2-9]{6}$/.test(ref), ref);
check('success text says availability is NOT confirmed', await p.evaluate(() => /not confirmed/i.test(document.querySelector('[role=dialog]').textContent)));
check('no WhatsApp "sent" claim and no WhatsApp link without configured number', await p.evaluate(() => !document.querySelector('[role=dialog] a[href*="wa.me"]')));
await p.keyboard.press('Escape'); await sleep(200);

// 2) owner enquiry
await p.evaluate(() => document.querySelector('#owner-form-container').scrollIntoView());
await sleep(900);
await p.type('#owner-form-container input[name=name]', `E2E Owner ${stamp}`);
await p.type('#owner-form-container input[name=phone]', '9890011223');
await p.type('#owner-form-container input[name=villaName]', 'E2E Cliff House');
await p.click('#owner-form-container button[type=submit]');
await p.waitForFunction(() => /Reference [A-Z]+-\d{8}-/.test(document.querySelector('#owner-form-container').textContent), { timeout: 15000 }).catch(() => {});
check('owner enquiry shows a real reference', await p.evaluate(() => /OWN-\d{8}-[A-Z2-9]{6}/.test(document.querySelector('#owner-form-container').textContent)));

// 3) investment enquiry
await p.evaluate(() => document.querySelector('#property-investment').scrollIntoView());
await sleep(900);
await p.type('#property-investment input[name=fullName]', `E2E Investor ${stamp}`);
await p.type('#property-investment input[name=phone]', '9765432109');
await p.type('#property-investment input[name=email]', 'investor@example.test');
await p.click('#property-investment button[type=submit]');
await p.waitForFunction(() => /INV-\d{8}-/.test(document.querySelector('#property-investment').textContent), { timeout: 15000 }).catch(() => {});
check('investment enquiry shows a real reference', await p.evaluate(() => /INV-\d{8}-[A-Z2-9]{6}/.test(document.querySelector('#property-investment').textContent)));
await p.close();

// ───────── Admin app ─────────
const a = await newPage(browser, 1280, 800);
await a.goto(BASE + '/admin', { waitUntil: 'networkidle0' });
check('/admin redirects unauthenticated visitors to /admin/login', a.url().endsWith('/admin/login'));
check('admin login page has no public hero/header', await a.evaluate(() => !document.querySelector('header') && !document.querySelector('#villas')));
await a.type('input[type=email]', EMAIL); await a.type('input[type=password]', 'wrong-password-123');
await a.click('button[type=submit]'); await a.waitForSelector('[role=alert]');
check('wrong password shows a generic error', await a.$eval('[role=alert]', (e) => /invalid email or password/i.test(e.textContent)));
await a.type('input[type=password]', PASSWORD); await a.click('button[type=submit]');
await a.waitForFunction(() => location.pathname === '/admin', { timeout: 15000 });
await a.waitForFunction(() => /Overview/.test(document.body.textContent) && !/Loading/.test(document.querySelector('main').textContent), { timeout: 15000 });
const layout = await a.evaluate(() => { const aside = document.querySelector('aside'); const main = document.querySelector('main'); return { asideH: aside.getBoundingClientRect().height, vh: innerHeight, mainW: main.getBoundingClientRect().width, vw: innerWidth, fixedDialogs: document.querySelectorAll('[role=dialog]').length }; });
check('admin is a full-viewport page (sidebar full height, content fills width, no popup)', layout.asideH >= layout.vh - 1 && layout.mainW > layout.vw * 0.7 && layout.fixedDialogs === 0, JSON.stringify(layout));
check('overview shows live DB counts', await a.evaluate(() => /Pending enquiries/.test(document.body.textContent)));

await a.goto(BASE + '/admin/bookings?q=' + encodeURIComponent(ref), { waitUntil: 'networkidle0' });
await a.waitForFunction((r) => document.body.textContent.includes(r), {}, ref);
const rows = await a.$$eval('tbody tr', (r) => r.length);
check('triple-clicked submit created exactly ONE booking enquiry', rows === 1, `rows=${rows}`);
await a.evaluate(() => document.querySelector('tbody a').click());
await a.waitForFunction((r) => document.querySelector('main h1')?.textContent === r, {}, ref);
// confirm flow requires attestation
await a.waitForSelector('[data-testid=villa-select] option:not([value=""])');
const firstVilla = await a.$eval('[data-testid=villa-select] option:not([value=""])', (o) => o.value);
await a.select('[data-testid=villa-select]', firstVilla);
await a.select('select:not([data-testid])', 'Confirmed');
await a.evaluate(() => [...document.querySelectorAll('button')].find((b) => /Save changes/.test(b.textContent)).click());
await a.waitForSelector('[role=dialog]');
check('Confirmed asks the admin to attest real availability was checked', await a.evaluate(() => { const b = [...document.querySelectorAll('[role=dialog] button')].find((x) => /Confirm booking/.test(x.textContent)); return b.disabled; }));
await a.evaluate(() => document.querySelector('[role=dialog] input[type=checkbox]').click());
await a.evaluate(() => [...document.querySelectorAll('[role=dialog] button')].find((x) => /Confirm booking/.test(x.textContent)).click());
await sleep(800);
// Re-running the suite re-uses the same dates, so the overlap guard may ask for an explicit override.
if (await a.evaluate(() => [...document.querySelectorAll('[role=dialog] button')].some((x) => /Confirm anyway/.test(x.textContent)))) {
  check('overlapping confirmed booking is flagged before confirming', true);
  await a.evaluate(() => [...document.querySelectorAll('[role=dialog] button')].find((x) => /Confirm anyway/.test(x.textContent)).click());
}
await a.waitForFunction(() => /Saved\./.test(document.body.textContent), { timeout: 10000 }).catch(() => {});
await a.reload({ waitUntil: 'networkidle0' });
check('status change persisted after reload (Confirmed)', await a.evaluate(() => document.querySelector('select:not([data-testid])').value === 'Confirmed'));
for (const path of ['owner-enquiries', 'investment-enquiries', 'villas', 'testimonials', 'settings', 'account']) {
  await a.goto(`${BASE}/admin/${path}`, { waitUntil: 'networkidle0' });
  check(`/admin/${path} renders without errors`, await a.evaluate(() => !!document.querySelector('main h1') && !/Something went wrong/.test(document.querySelector('main').textContent)));
}
await a.goto(BASE + '/admin/owner-enquiries', { waitUntil: 'networkidle0' });
check('owner enquiry from the public form is listed', await a.evaluate(() => /E2E Owner/.test(document.querySelector('main').textContent)));
await a.goto(BASE + '/admin/investment-enquiries', { waitUntil: 'networkidle0' });
check('investment enquiry from the public form is listed', await a.evaluate(() => /E2E Investor/.test(document.querySelector('main').textContent)));
await a.close();

// ───────── Admin responsive ─────────
for (const [w, h] of [[360, 640], [375, 667], [393, 852], [412, 915], [430, 932], [768, 1024], [1024, 768], [1440, 900]]) {
  const m = await newPage(browser, w, h);
  await (await m.createCDPSession()).send('Network.clearBrowserCookies'); // fresh, logged-out state per viewport
  await m.goto(BASE + '/admin/login', { waitUntil: 'networkidle0' });
  await m.type('input[type=email]', EMAIL); await m.type('input[type=password]', PASSWORD); await m.click('button[type=submit]');
  await m.waitForFunction(() => location.pathname === '/admin');
  const res = {};
  for (const path of ['', '/bookings', '/villas', '/settings']) {
    await m.goto(`${BASE}/admin${path}`, { waitUntil: 'networkidle0' });
    await sleep(150);
    res[path || '/'] = await m.evaluate(() => document.documentElement.scrollWidth - innerWidth);
  }
  check(`admin ${w}x${h}: no horizontal page overflow on overview/bookings/villas/settings`, Object.values(res).every((v) => v <= 0), JSON.stringify(res));
  if (w < 1024) {
    await m.goto(BASE + '/admin', { waitUntil: 'networkidle0' });
    check(`admin ${w}x${h}: sidebar collapsed behind menu button`, await m.evaluate(() => getComputedStyle(document.querySelector('aside')).display === 'none' && !!document.querySelector('button[aria-label="Open menu"]')));
    await m.click('button[aria-label="Open menu"]'); await sleep(200);
    check(`admin ${w}x${h}: drawer opens with navigation`, await m.evaluate(() => !!document.querySelector('nav[aria-label=Admin]') && /Booking Enquiries/.test(document.body.textContent)));
  }
  await m.close();
}
await done(browser);
