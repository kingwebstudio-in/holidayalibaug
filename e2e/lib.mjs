import chromium from '@sparticuz/chromium';
import puppeteer from 'puppeteer-core';

export const BASE = process.env.BASE_URL || 'http://127.0.0.1:4000';
export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
export async function launch() {
  return puppeteer.launch({ args: chromium.args, executablePath: await chromium.executablePath(), headless: 'shell' });
}
export async function newPage(browser, w, h) {
  const p = await browser.newPage();
  const mobile = w < 500;
  await p.setViewport({ width: w, height: h, deviceScaleFactor: 1, isMobile: mobile, hasTouch: mobile });
  // These suites test forms and layout, not the cookie banner (e2e/launch.test.mjs does): start as a visitor who already chose,
  // and tick the (never pre-ticked) consent box right before a submit, as a real visitor must.
  await p.evaluateOnNewDocument(() => {
    try { localStorage.setItem('ha_consent', JSON.stringify({ analytics: false, marketing: false, v: 1, at: new Date().toISOString() })); } catch {}
    document.addEventListener('click', (e) => {
      const b = e.target?.closest?.('button[type=submit]');
      const c = b?.closest('form')?.querySelector('input[type=checkbox][id^=consent]');
      if (c && !c.checked) c.click();
    }, true);
  });
  return p;
}
let failures = 0;
export function check(name, ok, detail = '') {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  — ' + detail : ''}`);
  if (!ok) failures++;
}
export const done = (browser) => browser.close().then(() => { console.log(failures ? `\n${failures} check(s) FAILED` : '\nAll checks passed'); process.exit(failures ? 1 : 0); });
