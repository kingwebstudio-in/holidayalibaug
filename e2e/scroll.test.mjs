// Verifies the two scrolling fixes in a real (headless) browser. Needs the app running (see README).
import { BASE, check, done, launch, newPage, sleep } from './lib.mjs';

const browser = await launch();
// Real touch swipe (touchstart/move/end) — moves the finger upward by `dist` px, scrolling content down.
async function swipe(p, x, y, dist) {
  await p.touchscreen.touchStart(x, y + dist / 2);
  for (let d = 0; d <= dist; d += 12) { await p.touchscreen.touchMove(x, y + dist / 2 - d); await sleep(8); }
  await p.touchscreen.touchEnd();
  await sleep(120);
}
const ALL = [[1440, 900], [1440, 700], [1024, 600], [768, 600], [430, 800], [393, 640], [375, 600], [360, 560]];
// Optional: VIEWPORTS=1440x700,375x600 to run a subset
const VIEWPORTS = process.env.VIEWPORTS ? process.env.VIEWPORTS.split(',').map((v) => v.split('x').map(Number)) : ALL;

for (const [w, h] of VIEWPORTS) {
  const tag = `${w}x${h}`;
  const p = await newPage(browser, w, h);
  await p.goto(BASE + '/', { waitUntil: 'networkidle0' });
  await p.waitForSelector('[role=combobox]');

  // ───────── Hero "Select Villa" list ─────────
  await p.click('[role=combobox]');
  await p.waitForSelector('[role=listbox] [role=option]');
  await sleep(250);
  const m = await p.evaluate(() => {
    const l = document.querySelector('[role=listbox]'); const r = l.getBoundingClientRect(); const vh = innerHeight;
    return { top: r.top, bottom: r.bottom, vh, scrolls: l.scrollHeight > l.clientHeight + 1, ov: getComputedStyle(l).overflowY, oc: getComputedStyle(l).overscrollBehaviorY,
      n: l.querySelectorAll('[role=option]').length, inBody: l.parentElement === document.body };
  });
  check(`${tag} hero list stays inside viewport`, m.top >= 0 && m.bottom <= m.vh, `top=${Math.round(m.top)} bottom=${Math.round(m.bottom)} vh=${m.vh}`);
  check(`${tag} hero list is portalled (not clipped by hero overflow/stacking)`, m.inBody);
  check(`${tag} hero list has overflow-y:auto + overscroll contain`, m.ov === 'auto' && m.oc === 'contain', `${m.ov}/${m.oc}`);

  // scroll to the last option with the wheel (or touch swipe on mobile) and make sure the PAGE did not move
  const y0 = await p.evaluate(() => scrollY);
  const box = await p.evaluate(() => { const r = document.querySelector('[role=listbox]').getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; });
  if (w < 500) {
    for (let i = 0; i < 8; i++) await swipe(p, box.x, box.y, 160);
  } else {
    await p.mouse.move(box.x, box.y);
    for (let i = 0; i < 10; i++) { await p.mouse.wheel({ deltaY: 200 }); await sleep(20); }
  }
  await sleep(250);
  const after = await p.evaluate(() => {
    const l = document.querySelector('[role=listbox]'); const opts = [...l.querySelectorAll('[role=option]')]; const last = opts[opts.length - 1];
    const lr = last.getBoundingClientRect(); const pr = l.getBoundingClientRect();
    const hit = document.elementFromPoint(lr.left + lr.width / 2, lr.top + lr.height / 2);
    return { pageY: scrollY, atEnd: Math.abs(l.scrollTop + l.clientHeight - l.scrollHeight) < 2 || l.scrollHeight <= l.clientHeight, lastVisible: lr.top >= pr.top - 1 && lr.bottom <= pr.bottom + 1, reachable: last.contains(hit), lastText: last.textContent };
  });
  check(`${tag} hero list: last option reachable by scrolling`, after.lastVisible && after.reachable, after.lastText.slice(0, 24));
  check(`${tag} hero list scroll did not scroll the page behind`, after.pageY === y0, `scrollY ${y0}→${after.pageY}`);

  // select the last option and confirm it reaches the booking form
  const lastName = await p.evaluate(() => { const o = [...document.querySelectorAll('[role=listbox] [role=option]')].pop(); const n = o.firstElementChild.firstElementChild.textContent; o.click(); return n; });
  await sleep(150);
  check(`${tag} hero list closes after selection`, await p.evaluate(() => !document.querySelector('[role=listbox]')));
  check(`${tag} selected villa is shown in trigger`, (await p.$eval('[role=combobox]', (e) => e.textContent)).includes(lastName), lastName);
  await p.evaluate(() => [...document.querySelectorAll('button[type=submit]')].find((b) => /Request Availability/.test(b.textContent)).click());
  await p.waitForSelector('[role=dialog] #bk-villa');
  const sel = await p.$eval('#bk-villa', (s) => s.options[s.selectedIndex].textContent);
  check(`${tag} booking form pre-selects that villa`, sel.startsWith(lastName), sel);
  await p.keyboard.press('Escape'); await sleep(150);
  check(`${tag} Escape closes booking dialog and unlocks page scroll`, await p.evaluate(() => !document.querySelector('[role=dialog]') && getComputedStyle(document.body).overflow !== 'hidden'));

  // keyboard navigation: End + Enter selects last item
  await p.focus('[role=combobox]'); await p.keyboard.press('Enter'); await sleep(150);
  await p.keyboard.press('Home'); await p.keyboard.press('End'); await p.keyboard.press('Enter'); await sleep(150);
  check(`${tag} keyboard (Enter/Home/End) selects options`, (await p.$eval('[role=combobox]', (e) => e.textContent)).includes(lastName));

  // click outside closes
  await p.click('[role=combobox]'); await sleep(150);
  await p.mouse.click(5, h - 5); await sleep(150);
  check(`${tag} click outside closes list`, await p.evaluate(() => !document.querySelector('[role=listbox]')));

  // ───────── Villa information panel ─────────
  await p.evaluate(() => window.scrollTo(0, 0));
  await p.evaluate(() => { const b = [...document.querySelectorAll('button')].find((x) => /View Details/.test(x.textContent)); b.scrollIntoView({ block: 'center' }); });
  await sleep(900); // the site uses smooth scrolling; let it settle before clicking
  await p.waitForSelector('#villa-collection-grid article button');
  await p.evaluate(() => [...document.querySelectorAll('button')].find((x) => /View Details/.test(x.textContent)).click());
  await p.waitForSelector('[role=dialog] [role=region]');
  await sleep(250);
  const py0 = await p.evaluate(() => scrollY);
  const dbox = await p.evaluate(() => { const r = document.querySelector('[role=dialog] [role=region]').getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; });
  const pre = await p.evaluate(() => { const d = document.querySelector('[role=dialog]'); const r = d.getBoundingClientRect(); const sc = d.querySelector('[role=region]'); return { top: r.top, bottom: r.bottom, vh: innerHeight, canScroll: sc.scrollHeight > sc.clientHeight, bodyLocked: getComputedStyle(document.body).overflow === 'hidden', overlayScrolls: getComputedStyle(d.parentElement).overflowY }; });
  check(`${tag} info panel fits viewport`, pre.top >= 0 && pre.bottom <= pre.vh, `top=${Math.round(pre.top)} bottom=${Math.round(pre.bottom)} vh=${pre.vh}`);
  check(`${tag} info panel has a scroll region and locks the page`, pre.canScroll && pre.bodyLocked);
  if (w < 500) {
    for (let i = 0; i < 25; i++) await swipe(p, dbox.x, dbox.y, 220);
  } else {
    await p.mouse.move(dbox.x, dbox.y);
    for (let i = 0; i < 40; i++) { await p.mouse.wheel({ deltaY: 250 }); await sleep(10); }
  }
  await sleep(300);
  const end = await p.evaluate(() => {
    const d = document.querySelector('[role=dialog]'); const sc = d.querySelector('[role=region]');
    const cta = [...d.querySelectorAll('button')].find((b) => /Enquire to Book/.test(b.textContent)).getBoundingClientRect();
    let el = sc; while (el.lastElementChild) el = el.lastElementChild; // deepest last element = true end of content
    const lastBlock = el.getBoundingClientRect(); const sr = sc.getBoundingClientRect();
    return { pageY: scrollY, atEnd: Math.abs(sc.scrollTop + sc.clientHeight - sc.scrollHeight) < 2, ctaVisible: cta.top >= 0 && cta.bottom <= innerHeight, lastVisible: lastBlock.bottom <= sr.bottom + 1 && lastBlock.top >= sr.top - 1 };
  });
  check(`${tag} info panel scrolls to the very end`, end.atEnd && end.lastVisible);
  check(`${tag} info panel footer button stays visible`, end.ctaVisible);
  check(`${tag} info panel scroll did not move the page behind`, end.pageY === py0, `scrollY ${py0}→${end.pageY}`);
  await p.keyboard.press('Escape'); await sleep(200);
  check(`${tag} Escape closes panel, page scroll restored`, await p.evaluate(() => !document.querySelector('[role=dialog]') && getComputedStyle(document.body).overflow !== 'hidden'));

  const overflowX = await p.evaluate(() => document.documentElement.scrollWidth - innerWidth);
  check(`${tag} no horizontal overflow on the page`, overflowX <= 0, `scrollWidth-innerWidth=${overflowX}`);
  await p.close();
}
await done(browser);
