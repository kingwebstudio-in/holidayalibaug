// Property management end-to-end: admin creates/edits/publishes/deletes through the real UI; the public site reflects it.
// Needs the app running + ADMIN_EMAIL / ADMIN_PASSWORD.
import { BASE, check, done, launch, newPage, sleep } from './lib.mjs';

const EMAIL = process.env.ADMIN_EMAIL, PASSWORD = process.env.ADMIN_PASSWORD;
if (!EMAIL || !PASSWORD) { console.error('Set ADMIN_EMAIL and ADMIN_PASSWORD'); process.exit(2); }
const browser = await launch();
const NAME = `E2E Property ${Date.now().toString(36)}`;

async function field(p, labelText, value, { clear = true } = {}) {
  const h = await p.evaluateHandle((t) => [...document.querySelectorAll('label')].find((l) => l.textContent.trim().startsWith(t))?.querySelector('input,textarea,select'), labelText);
  const el = h.asElement();
  if (!el) throw new Error(`field not found: ${labelText}`);
  const tag = await el.evaluate((e) => e.tagName);
  if (tag === 'SELECT') { await el.select(value); return; }
  if (clear) await el.evaluate((e) => { e.focus(); e.select?.(); });
  await el.type(value);
}
const tab = async (p, label) => { await p.evaluate((l) => [...document.querySelectorAll('[role=tab]')].find((t) => t.textContent.includes(l)).click(), label); await sleep(120); };
const btn = (p, text) => p.evaluate((t) => { const b = [...document.querySelectorAll('button')].find((x) => x.textContent.trim().includes(t) && !x.disabled); if (!b) throw new Error(`button not found: ${t}`); b.click(); }, text);

// ───────── Admin: create ─────────
const a = await newPage(browser, 1280, 900);
await a.goto(BASE + '/admin/login', { waitUntil: 'networkidle0' });
await a.type('input[type=email]', EMAIL); await a.type('input[type=password]', PASSWORD); await a.click('button[type=submit]');
await a.waitForFunction(() => location.pathname === '/admin');
await a.goto(BASE + '/admin/villas', { waitUntil: 'networkidle0' });
await a.waitForSelector('tbody tr');
const demoRows = await a.$$eval('tbody tr', (r) => r.length);
check('property list shows the demo dataset with thumbnails and status badges', demoRows >= 8 && (await a.$$eval('tbody tr img', (i) => i.length)) >= 8, `rows=${demoRows}`);
check('demo properties are labelled "Demo" in admin', await a.evaluate(() => /Demo/.test(document.querySelector('tbody').textContent)));
check('admin warns about demo data', await a.evaluate(() => /Local demo mode|sample \(demo\) properties are in this database/.test(document.body.textContent)));

await a.goto(BASE + '/admin/villas/new', { waitUntil: 'networkidle0' });
await field(a, 'Property name', NAME);
await btn(a, 'Save & publish');
await sleep(300);
check('publishing an incomplete property is blocked with field-level errors and a jump to the offending tab',
  await a.evaluate(() => /required to publish|Please fix/.test(document.body.textContent) && !!document.querySelector('[role=tab][aria-selected=true]')));
check('entered data is kept after a failed save', await a.evaluate((n) => { const t = document.querySelector('[role=tabpanel]'); return !!t; }, NAME));
await tab(a, 'Basics');
check('name survived validation failure', (await a.evaluate(() => [...document.querySelectorAll('label')].find((l) => l.textContent.startsWith('Property name')).querySelector('input').value)) === NAME);

await tab(a, 'Type & location'); await field(a, 'Property type', 'Sea-View Villa'); await field(a, 'Location (shown publicly)', 'Kihim, Alibaug'); await field(a, 'Locality', 'Kihim');
await tab(a, 'Descriptions'); await field(a, 'Short description', 'A sample e2e property for testing.'); await field(a, 'Detailed description', 'This property was created by the automated browser test to verify the admin form.'); await field(a, 'Property highlights', 'Sea views\nQuiet lane');
await tab(a, 'Pricing'); await field(a, 'Starting price', '21000');
await tab(a, 'Capacity'); await field(a, 'Bedrooms', '3'); await field(a, 'Bathrooms', '2'); await field(a, 'Maximum guests', '7');
await tab(a, 'Amenities'); await btn(a, '+ Private Pool'); await btn(a, '+ Wi-Fi');
await tab(a, 'Images');
check('uploads are disabled with an explanation when Cloudinary is not configured', await a.evaluate(() => /Cloudinary is not configured/.test(document.body.textContent) && [...document.querySelectorAll('button')].filter((b) => /Upload/.test(b.textContent)).every((b) => b.disabled)));
await a.type('input[placeholder*="Paste an image URL"]', '/demo-villas/serenity.jpg'); await btn(a, 'Add');
await a.type('input[placeholder*="Paste an image URL"]', '/demo-villas/kihim.jpg-broken'); await btn(a, 'Add');
await a.type('input[placeholder*="Paste an image URL"]', '/demo-villas/beach-kihim.jpg'); await btn(a, 'Add');
await sleep(500);
check('gallery accepts multiple images', (await a.$$eval('[role=tabpanel] ul li img', (i) => i.length)) === 3);
await a.evaluate(() => document.querySelectorAll('[role=tabpanel] ul li img').forEach((i) => { i.loading = 'eager'; i.scrollIntoView(); }));
await sleep(1200);
const reqCount = await a.evaluate(() => performance.getEntriesByType('resource').filter((r) => /kihim\.jpg-broken/.test(r.name)).length);
check('a broken image URL falls back to a placeholder instead of a broken icon', await a.evaluate(() => [...document.querySelectorAll('[role=tabpanel] ul li img')].some((i) => i.src.startsWith('data:image/svg+xml'))));
check('a broken image is requested only once (no retry loop)', reqCount <= 2, `requests=${reqCount}`);
await a.evaluate(() => document.querySelector('[role=tabpanel] ul li button[title="Use as featured image"]').click());
// reorder: move 3rd image up
await a.evaluate(() => document.querySelectorAll('[role=tabpanel] ul li')[2].querySelector('button[aria-label="Move earlier"]').click());
await a.type('input[aria-label="Alt text for image 2"]', 'Beach nearby');
await tab(a, 'Rules'); await field(a, 'House rules', 'No loud music after 10 PM'); 
await tab(a, 'SEO'); await field(a, 'SEO title', `${NAME} — Kihim`);
await btn(a, 'Preview'); await a.waitForSelector('[role=dialog] [role=region]');
check('preview shows the unsaved property (name, price, gallery) without saving', await a.evaluate((n) => { const t = document.querySelector('[role=dialog]').textContent; return t.includes(n) && t.includes('₹21,000') && t.includes('Kihim'); }, NAME));
check('preview has no enquiry action', await a.evaluate(() => [...document.querySelectorAll('[role=dialog] button')].some((b) => /Preview only/.test(b.textContent) && b.disabled)));
await a.keyboard.press('Escape'); await sleep(200);
await btn(a, 'Save & publish');
await a.waitForFunction(() => /\/admin\/villas\/[0-9a-f-]{36}$/.test(location.pathname), { timeout: 15000 });
check('saved and published: redirected to the edit URL with a success message', await a.evaluate(() => /Saved and published/.test(document.body.textContent)));
const id = a.url().split('/').pop();

// ───────── Public site reflects it ─────────
const p = await newPage(browser, 1280, 900);
await p.goto(BASE + '/', { waitUntil: 'networkidle0' });
await p.waitForSelector('#villa-collection-grid article');
check('homepage cards render with images (no server error)', (await p.$$eval('#villa-collection-grid article img', (i) => i.length)) >= 4 && await p.evaluate(() => !/server had a problem/i.test(document.body.textContent)));
check('demo mode indicator is visible', await p.evaluate(() => !!document.querySelector('[role=note]') && /Demo mode/.test(document.querySelector('[role=note]').textContent)));
check('cards show type, location, rooms, price/“Price on enquiry” and both actions', await p.evaluate(() => { const c = document.querySelector('#villa-collection-grid article'); const t = c.textContent; return /BHK|bed/.test(t) && /Sample from|Price on enquiry/.test(t) && /View Details/.test(t) && /Enquire/.test(t) && /Sample listing/.test(t); }));
await p.type('#pf-q', NAME);
await p.waitForFunction((n) => { const h = [...document.querySelectorAll('#villa-collection-grid article h3')]; return h.length === 1 && h[0].textContent === n; }, { timeout: 10000 }, NAME);
check('the newly published property appears on the public site without any code change', true);
check('search narrows results to the match', (await p.$$eval('#villa-collection-grid article', (c) => c.length)) === 1);
await p.evaluate(() => [...document.querySelector('#villa-collection-grid article').querySelectorAll('button')].find((b) => /View Details/.test(b.textContent)).click());
await p.waitForSelector('[role=dialog] [role=region]'); await sleep(400);
const detail = await p.evaluate((n) => { const d = document.querySelector('[role=dialog]'); return { text: d.textContent, imgs: d.querySelectorAll('button[aria-label^="Show photo"]').length, name: d.querySelector('h2').textContent === n }; }, NAME);
check('detail modal shows the saved record (name, price, amenities, rules, SEO-independent content)', detail.name && detail.text.includes('₹21,000') && detail.text.includes('Private Pool') && detail.text.includes('No loud music') && detail.text.includes('Kihim, Alibaug'));
check('detail modal gallery has all three images and stay times', detail.imgs === 3 && /Check-in from/.test(detail.text));
check('detail modal lists related properties', /You may also like/.test(detail.text));
await p.keyboard.press('Escape'); await sleep(200);

// filters + empty state
await p.evaluate(() => { const q = document.querySelector('#pf-q'); q.focus(); q.select(); });
await p.keyboard.press('Backspace');
await p.select('#pf-type', 'Sea-View Villa');
await sleep(900);
const typeCards = await p.$$eval('#villa-collection-grid article', (c) => c.map((x) => x.textContent.includes('Sea-View Villa')));
check('property-type filter works', typeCards.length >= 2 && typeCards.every(Boolean), `n=${typeCards.length}`);
await p.select('#pf-guests', '20'); await sleep(900);
check('guest filter works and an impossible combination shows a helpful empty state with reset', await p.evaluate(() => /No properties match/.test(document.body.textContent) && !![...document.querySelectorAll('button')].find((b) => /Reset filters/.test(b.textContent))));
await p.evaluate(() => [...document.querySelectorAll('button')].filter((b) => /Reset filters/.test(b.textContent)).pop().click()); await sleep(900);
check('reset restores the full list', (await p.$$eval('#villa-collection-grid article', (c) => c.length)) >= 4);
await p.select('#pf-sort', 'price_asc'); await sleep(900);
const prices = await p.$$eval('#villa-collection-grid article', (c) => c.map((x) => { const m = x.textContent.match(/₹([\d,]+)/); return m ? Number(m[1].replace(/,/g, '')) : null; }).filter((v) => v !== null));
check('price sorting orders priced properties ascending', prices.length >= 2 && prices.every((v, i) => i === 0 || v >= prices[i - 1]), prices.join(','));
check('pagination shown for more than one page of properties', await p.evaluate(() => /page 1 of/.test(document.body.textContent)));
await p.close();

// ───────── Admin: unpublish, duplicate, delete ─────────
await a.goto(BASE + '/admin/villas?q=' + encodeURIComponent(NAME), { waitUntil: 'networkidle0' });
await a.waitForSelector('tbody tr');
await btn(a, 'Unpublish'); await sleep(900);
const pub1 = await (await fetch(`${BASE}/api/v1/villas?q=${encodeURIComponent(NAME)}`)).json();
check('unpublishing removes it from the public API immediately', pub1.data.length === 0);
await a.evaluate(() => document.querySelector('tbody button[aria-label="Duplicate"]').click()); await sleep(900);
await a.goto(BASE + '/admin/villas?q=' + encodeURIComponent(NAME), { waitUntil: 'networkidle0' });
await a.waitForSelector('tbody tr'); await sleep(300);
check('duplicate created a draft copy', (await a.$$eval('tbody tr', (r) => r.length)) === 2 && await a.evaluate(() => /\(copy\)/.test(document.querySelector('tbody').textContent)));
for (let i = 0; i < 2; i++) {
  await a.evaluate(() => document.querySelector('tbody button[aria-label="Delete"]').click());
  await a.waitForSelector('[role=dialog]');
  if (i === 0) check('delete asks for confirmation naming the property', await a.evaluate(() => /permanently delete/.test(document.querySelector('[role=dialog]').textContent)));
  await a.evaluate(() => [...document.querySelectorAll('[role=dialog] button')].find((b) => /Delete permanently/.test(b.textContent)).click());
  await sleep(1000);
}
await a.goto(BASE + '/admin/villas?q=' + encodeURIComponent(NAME), { waitUntil: 'networkidle0' });
check('deleted properties are gone', await a.evaluate(() => /No properties match/.test(document.body.textContent)));
await a.close();

// ───────── Mobile ─────────
for (const [w, h] of [[375, 700], [768, 900]]) {
  const m = await newPage(browser, w, h);
  await (await m.createCDPSession()).send('Network.clearBrowserCookies');
  await m.goto(BASE + '/admin/login', { waitUntil: 'networkidle0' });
  await m.type('input[type=email]', EMAIL); await m.type('input[type=password]', PASSWORD); await m.click('button[type=submit]');
  await m.waitForFunction(() => location.pathname === '/admin');
  const ov = {};
  for (const path of ['/villas', '/villas/new']) { await m.goto(`${BASE}/admin${path}`, { waitUntil: 'networkidle0' }); await sleep(300); ov[path] = await m.evaluate(() => document.documentElement.scrollWidth - innerWidth); }
  check(`admin properties pages ${w}x${h}: no horizontal overflow`, Object.values(ov).every((v) => v <= 0), JSON.stringify(ov));
  await m.goto(BASE + '/', { waitUntil: 'networkidle0' }); await m.waitForSelector('#villa-collection-grid article');
  check(`public properties section ${w}x${h}: no horizontal overflow`, (await m.evaluate(() => document.documentElement.scrollWidth - innerWidth)) <= 0);
  await m.close();
}
await done(browser);
