// Lighthouse accessibility for every screen. Needs the preview server on :4173.
import { createRequire } from 'node:module';
import lighthouse from 'lighthouse';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');

const BASE = 'http://localhost:4173/';
const browser = await chromium.launch({ args: ['--remote-debugging-port=9333'] });
const page = await (await browser.newContext()).newPage();
await page.goto(BASE);
await page.evaluate(() => localStorage.setItem('benefits-navigator:v1', JSON.stringify({
  profile: { segment: 'adult', options: ['I', 'II', 'III'], group: 'II', childhood: false }, received: { tsr: true },
})));

const routes = ['', '#/group', '#/benefits', '#/guide/sanatorno_kurortnoe_lechenie', '#/guide/individualnyy_pomoshnik', '#/help?topic=sanatorno_kurortnoe_lechenie'];
let min = 100;
for (const r of routes) {
  const res = await lighthouse(BASE + r, {
    port: 9333, onlyCategories: ['accessibility', 'best-practices'], disableStorageReset: true,
    formFactor: 'mobile', screenEmulation: { mobile: true, width: 360, height: 740, deviceScaleFactor: 2, disabled: false },
    logLevel: 'error',
  });
  const a = Math.round(res.lhr.categories.accessibility.score * 100);
  const bp = Math.round(res.lhr.categories['best-practices'].score * 100);
  min = Math.min(min, a);
  const failed = Object.values(res.lhr.audits).filter((x) => x.score === 0 && x.scoreDisplayMode === 'binary').map((x) => x.id);
  console.log(`${(r || '#/').padEnd(26)} a11y ${a}  best-practices ${bp}  ${failed.length ? 'failed: ' + failed.join(', ') : ''}`);
}
await browser.close();
if (min < 95) process.exit(1);
