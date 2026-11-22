// Lighthouse accessibility for every screen, reached by clicking through the real flow
// (answers live in memory only, so screens can't be opened by URL).
// Needs the preview server on :4173.
import puppeteer from 'puppeteer-core';
import { startFlow } from 'lighthouse';

const BASE = 'http://localhost:4173/';
const browser = await puppeteer.launch({
  executablePath: process.env.CHROME_PATH || '/opt/pw-browsers/chromium',
  args: ['--no-sandbox', '--headless=new'],
});
const page = await browser.newPage();
const flow = await startFlow(page, {
  config: {
    extends: 'lighthouse:default',
    settings: {
      onlyCategories: ['accessibility'],
      formFactor: 'mobile',
      screenEmulation: { mobile: true, width: 360, height: 740, deviceScaleFactor: 2, disabled: false },
    },
  },
});

const heading = (text) =>
  page.waitForFunction((t) => document.querySelector('h1')?.textContent.includes(t), {}, text);
const clickText = async (selector, text) => {
  for (const el of await page.$$(selector)) {
    if ((await el.evaluate((n) => n.textContent.trim())) === text) return el.click();
  }
  throw new Error(`not found: ${selector} «${text}»`);
};
const goHash = (hash) => page.evaluate((h) => { window.location.hash = h; }, hash);

await flow.navigate(BASE, { name: 'year' });
await page.type('#birth-year', '1985');
await clickText('button', 'Продолжить');
await heading('группа');
await flow.snapshot({ name: 'group' });

await page.click('input[value="II"]');
await clickText('button', 'Нет');
await heading('Вам положено');
await flow.snapshot({ name: 'benefits' });

await page.click('a[href="#/guide/sanatorno_kurortnoe_lechenie"]');
await heading('санатор');
await page.click('details summary');
await flow.snapshot({ name: 'guide-sanatorium' });

await goHash('#/guide/gsp_po_invalidnosti_vzroslyy_ot_obshego_zaboleva_ii');
await heading('ГСП');
await flow.snapshot({ name: 'guide-gsp' });

await goHash('#/guide/individualnyy_pomoshnik');
await heading('помощник');
await flow.snapshot({ name: 'guide-generic' });

await goHash('#/help?topic=sanatorno_kurortnoe_lechenie');
await heading('Мы поможем');
await flow.snapshot({ name: 'help' });

await goHash('#/');
await heading('Узнайте');
await clickText('button', 'Қазақша');
await heading('Сізге қандай');
await flow.snapshot({ name: 'year-kk' });
await goHash('#/benefits');
await heading('Сізге тиесілі');
await flow.snapshot({ name: 'benefits-kk' });

const result = await flow.createFlowResult();
let min = 100;
for (const step of result.steps) {
  const score = Math.round(step.lhr.categories.accessibility.score * 100);
  min = Math.min(min, score);
  const failed = Object.values(step.lhr.audits)
    .filter((a) => a.score === 0 && a.scoreDisplayMode === 'binary')
    .map((a) => a.id);
  console.log(`${step.name.padEnd(18)} a11y ${score}${failed.length ? '  failed: ' + failed.join(', ') : ''}`);
}
await browser.close();
if (min < 95) process.exit(1);
