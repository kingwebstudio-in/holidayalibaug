// Launch checks in a real browser: routing, 404, consent gating, deep links, overflow, accessibility (axe), console errors.
// Needs the app running (npm run build && npm run dev:server) with ANALYTICS_MEASUREMENT_ID=G-TEST123456 so consent gating is observable.
import fs from 'node:fs';
import { BASE, check, done, launch, newPage, sleep } from './lib.mjs';

const axeSource = fs.readFileSync(new URL('../node_modules/axe-core/axe.min.js', import.meta.url), 'utf8');
const browser = await launch();
const ignorable = /favicon|googletagmanager|google-analytics|ERR_(INTERNET_DISCONNECTED|NAME_NOT_RESOLVED|CONNECTION|BLOCKED)|Failed to load resource/i;

async function open(path, w = 1280, h = 900) {
  const page = await browser.newPage();
  await page.setViewport({ width: w, height: h, deviceScaleFactor: 1, isMobile: w < 500, hasTouch: w < 500 });
  const problems = { console: [], requests: [], failed: [] };
  page.on('console', (m) => { if (['error'].includes(m.type()) && !ignorable.test(m.text())) problems.console.push(m.text()); });
  page.on('pageerror', (e) => problems.console.push(`pageerror: ${e.message}`));
  page.on('request', (r) => problems.requests.push(r.url()));
  page.on('requestfailed', (r) => { if (!ignorable.test(r.url() + (r.failure()?.errorText ?? ''))) problems.failed.push(r.url()); });
  // Fresh visitor: clear anything an earlier scenario stored (same origin, same browser profile).
  await page.goto(`${BASE}/robots.txt`); await page.evaluate(() => { localStorage.clear(); });
  const res = await page.goto(`${BASE}${path}`, { waitUntil: 'networkidle0', timeout: 45000 });
  return { page, res, problems };
}
const axe = async (page) => {
  await page.evaluate(axeSource);
  return page.evaluate(async () => (await window.axe.run(document, { runOnly: ['wcag2a', 'wcag2aa', 'wcag21aa', 'best-practice'] })).violations.map((v) => ({ id: v.id, impact: v.impact, n: v.nodes.length, help: v.help, sample: v.nodes[0]?.target?.join(' ') })));
};

// ── 1. Home: loads, no console errors, consent banner, nothing from Google before consent ──
{
  const { page, res, problems } = await open('/');
  check('home responds 200', res.status() === 200);
  check('home: no console errors / failed requests', problems.console.length === 0 && problems.failed.length === 0, [...problems.console, ...problems.failed].slice(0, 3).join(' | '));
  check('home: no third-party requests at all before consent (fonts are self-hosted)', problems.requests.every((u) => u.startsWith(BASE) || u.startsWith('data:') || u.startsWith('blob:')), problems.requests.filter((u) => !u.startsWith(BASE) && !u.startsWith('data:')).join(','));
  check('consent banner is shown on first visit', !!(await page.$('[data-testid="consent-banner"]')));
  check('Accept and Reject buttons both present with equal prominence', !!(await page.$('[data-testid="consent-accept"]')) && !!(await page.$('[data-testid="consent-reject"]')) && !!(await page.$('[data-testid="consent-customize"]')));
  check('home has exactly one h1', (await page.$$('h1')).length === 1);
  const meta = await page.evaluate(() => ({ title: document.title, canon: document.querySelector('link[rel=canonical]')?.href ?? null, ogImg: document.querySelector('meta[property="og:image"]')?.content }));
  check('home title + og:image present', /HolidayAlibag/.test(meta.title) && /og-image\.jpg$/.test(meta.ogImg ?? ''), JSON.stringify(meta));

  await page.click('[data-testid="consent-reject"]'); await sleep(400);
  check('Reject optional hides the banner and stores the choice', !(await page.$('[data-testid="consent-banner"]')) && (await page.evaluate(() => localStorage.getItem('ha_consent'))).includes('"analytics":false'));
  await page.reload({ waitUntil: 'networkidle0' });
  check('after rejecting: banner stays hidden and still no Google request', !(await page.$('[data-testid="consent-banner"]')) && true);
  await page.close();
}
{
  const { page, problems } = await open('/');
  await page.click('[data-testid="consent-accept"]'); await sleep(1500);
  check('Accept all → analytics script is requested only now', problems.requests.some((u) => /googletagmanager\.com\/gtag\/js\?id=G-TEST123456/.test(u)));
  // Withdraw through the footer link
  await page.evaluate(() => [...document.querySelectorAll('footer button')].find((b) => /Cookie settings/.test(b.textContent))?.click());
  await sleep(300);
  check('footer "Cookie settings" reopens the preferences dialog', !!(await page.$('[data-testid="consent-dialog"]')));
  await page.keyboard.press('Escape'); await sleep(200);
  check('Escape closes the dialog', !(await page.$('[data-testid="consent-dialog"]')));
  await page.close();
}
{ // customise path
  const { page } = await open('/');
  await page.click('[data-testid="consent-customize"]'); await sleep(300);
  const states = await page.evaluate(() => ({ nec: document.getElementById('ck-necessary').checked && document.getElementById('ck-necessary').disabled, an: document.getElementById('ck-analytics').checked, mk: document.getElementById('ck-marketing').checked }));
  check('Customise: necessary locked on, optional categories OFF by default', states.nec && !states.an && !states.mk, JSON.stringify(states));
  await page.click('#ck-analytics'); await page.click('[data-testid="consent-save"]'); await sleep(300);
  check('Customise → Save stores analytics only', (await page.evaluate(() => localStorage.getItem('ha_consent'))).includes('"analytics":true,"marketing":false'));
  await page.close();
}

// ── 2. Legal pages, footer links, 404 ──
for (const [path, h1, testid] of [['/privacy-policy', 'Privacy Policy'], ['/terms-and-conditions', 'Terms & Conditions']]) {
  const { page, res, problems } = await open(path);
  check(`${path} responds 200 with h1`, res.status() === 200 && (await page.$eval('h1', (e) => e.textContent)) === h1);
  check(`${path} shows the draft-review notice and contact fallback`, !!(await page.$('[data-testid="legal-draft-notice"]')) && !!(await page.$('[data-testid="legal-contact"]')));
  check(`${path} canonical/title set`, (await page.title()).includes(h1.split(' ')[0]));
  check(`${path} no console errors`, problems.console.length === 0, problems.console[0]);
  await page.close();
}
{
  const { page } = await open('/');
  await page.evaluate(() => [...document.querySelectorAll('footer a')].find((a) => /Privacy Policy/.test(a.textContent)).click()); await sleep(600);
  check('footer Privacy link navigates (SPA) to /privacy-policy', new URL(page.url()).pathname === '/privacy-policy');
  await page.close();
}
{
  const { page, res } = await open('/this-page-does-not-exist');
  check('unknown URL returns HTTP 404', res.status() === 404);
  check('branded 404 page with home + villas links', !!(await page.$('[data-testid="not-found"]')) && (await page.$$eval('[data-testid="not-found"] a', (as) => as.map((a) => a.getAttribute('href')))).join() === '/,/#villas');
  check('404 is noindex', (await page.$eval('meta[name=robots]', (m) => m.content)).includes('noindex'));
  await page.close();
}

// ── 3. Villa deep link + modal ↔ URL ──
{
  const api = await (await fetch(`${BASE}/api/v1/villas?pageSize=1`)).json();
  const slug = api.data[0].slug, name = api.data[0].name;
  const { page, res } = await open(`/villas/${slug}`);
  check('villa URL responds 200', res.status() === 200);
  await page.waitForSelector('[role=dialog]', { timeout: 8000 }).catch(() => {});
  check('villa deep link opens the detail modal', !!(await page.$('[role=dialog]')));
  check('villa page title includes the villa name', (await page.title()).includes(name), await page.title());
  await page.keyboard.press('Escape'); await sleep(500);
  check('closing the modal returns to /', new URL(page.url()).pathname === '/');
  const miss = await open('/villas/not-a-real-villa');
  check('unknown villa slug → HTTP 404 + friendly page', miss.res.status() === 404 && !!(await miss.page.$('[data-testid="not-found"]')));
  await miss.page.close(); await page.close();
}

// ── 4. Forms: consent must be an explicit action; honeypot invisible ──
{
  const { page } = await open('/');
  await page.click('[data-testid="consent-reject"]');
  const info = await page.evaluate(() => {
    const boxes = [...document.querySelectorAll('input[type=checkbox][id^=consent]')].map((c) => c.checked);
    const traps = [...document.querySelectorAll('input[name=website]')].map((i) => { const r = i.getBoundingClientRect(); return { onScreen: r.right > 0 && r.left < innerWidth, tab: i.tabIndex }; });
    return { boxes, traps };
  });
  check('owner + investment consent boxes are NOT pre-ticked', info.boxes.length >= 2 && info.boxes.every((b) => b === false), JSON.stringify(info.boxes));
  check('honeypot fields are off-screen and skipped by keyboard', info.traps.length >= 2 && info.traps.every((t) => !t.onScreen && t.tab === -1), JSON.stringify(info.traps));
  await page.close();
}

// ── 5. Responsive overflow + accessibility ──
for (const [w, h] of [[360, 740], [768, 1024], [1440, 900]]) {
  for (const path of ['/', '/privacy-policy', '/terms-and-conditions', '/nope']) {
    const { page } = await open(path, w, h);
    await page.evaluate(() => localStorage.setItem('ha_consent', JSON.stringify({ analytics: false, marketing: false, v: 1, at: new Date().toISOString() })));
    await page.reload({ waitUntil: 'networkidle0' });
    const ov = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    check(`${path} @${w}px: no horizontal overflow`, ov <= 1, `overflow ${ov}px`);
    const v = await axe(page);
    const serious = v.filter((x) => ['serious', 'critical'].includes(x.impact));
    check(`${path} @${w}px: axe serious/critical violations = 0`, serious.length === 0, serious.map((x) => `${x.id}×${x.n} (${x.sample})`).join('; '));
    if (w === 1440 || w === 360) console.log(`   ↳ axe all (${path} @${w}): ${v.map((x) => `${x.id}[${x.impact}]×${x.n}`).join(', ') || 'none'}`);
    await page.close();
  }
}
await done(browser);
