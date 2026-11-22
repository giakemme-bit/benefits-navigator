// Browser check of the main path. Run: npm run build && npx vite preview --port 4173 & node tests/e2e.mjs
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
import assert from 'node:assert/strict';

const URL = process.env.URL || 'http://localhost:4173/';
const shots = process.env.SHOTS;
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 360, height: 740 }, hasTouch: true, isMobile: true, deviceScaleFactor: shots ? 2 : 1 });
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
let taps = 0;
const tap = async (loc) => { taps++; await loc.tap(); };
const noHScroll = async (name) => {
  const w = await page.evaluate(() => document.documentElement.scrollWidth);
  assert.ok(w <= 360, `${name}: horizontal scroll (${w}px)`);
  if (shots) await page.screenshot({ path: `${shots}/${name}.png`, fullPage: true });
};

// Path 1: adult, II group, not from childhood → sanatorium guide in 5 taps.
await page.goto(URL);
await page.getByRole('heading', { level: 1 }).waitFor();
await noHScroll('1-year');
await tap(page.getByLabel('Год рождения человека с инвалидностью'));
await page.keyboard.type('1985');
await tap(page.getByRole('button', { name: 'Продолжить' }));
await page.getByRole('heading', { name: 'Какая группа инвалидности?' }).waitFor();
await noHScroll('2-group');
await tap(page.getByRole('radio', { name: 'II группа', exact: true }));
await tap(page.getByRole('button', { name: 'Нет', exact: true }));
await page.getByRole('heading', { name: 'Вам положено' }).waitFor();
await noHScroll('3-benefits');
const titles = await page.locator('.card-title').allTextContents();
assert.ok(titles.some((t) => t.includes('от общего заболевания')));
assert.ok(!titles.some((t) => t.includes('с детства')));
assert.ok(await page.getByText('Суммы и порядок сверяются с официальными источниками').isVisible());
await tap(page.getByRole('link', { name: /Как получить: Санаторно-курортное лечение/ }));
await page.getByRole('heading', { name: 'Как получить санаторно-курортное лечение' }).waitFor();
assert.equal(await page.locator('.step-card').count(), 4);
// Focus moved to the new screen's heading.
assert.equal(await page.evaluate(() => document.activeElement.tagName), 'H1');
const more = page.getByText('Подробно: как подать на eGov.kz');
assert.ok(!(await page.getByText('Откройте сайт eGov.kz.').isVisible()));
await more.tap();
assert.ok(await page.getByText('Откройте сайт eGov.kz.').isVisible());
await noHScroll('4-guide');
await more.tap();
console.log(`screen 1 → 4 in ${taps} taps`);
assert.ok(taps <= 5);

// Help screen
await page.getByRole('link', { name: 'Не получается? Нужна помощь' }).tap();
await page.getByRole('heading', { name: 'Мы поможем' }).waitFor();
assert.ok(await page.getByLabel('Что не получается?').isVisible());
assert.ok(await page.getByText('Контакты оператора скоро появятся.').isVisible());
await noHScroll('5-help');

// Mark as received → "Как получить" disappears; refresh starts over; nothing is stored.
await page.goto(URL + '#/benefits');
await page.getByRole('heading', { name: 'Вам положено' }).waitFor();
await page.locator('li', { hasText: 'Санаторно-курортное лечение' }).getByRole('checkbox').check();
assert.equal(await page.getByRole('link', { name: /Как получить: Санаторно/ }).count(), 0);
assert.equal(await page.evaluate(() => Object.keys(localStorage).filter((k) => k.startsWith('benefits-navigator:v')).length), 0, 'nothing stored');
await page.reload();
await page.getByRole('heading', { name: 'Узнайте, какая помощь вам положена' }).waitFor();

// Old saved answers from earlier versions are removed on load.
await page.evaluate(() => localStorage.setItem('benefits-navigator:v1', '{"received":{"x":true}}'));
await page.reload();
await page.getByRole('heading', { level: 1 }).waitFor();
assert.equal(await page.evaluate(() => localStorage.getItem('benefits-navigator:v1')), null);

// Path 2: child under 7 → no group question at all.
const y = new Date().getFullYear() - 3;
await page.getByLabel('Год рождения человека с инвалидностью').fill(String(y));
await page.getByRole('button', { name: 'Продолжить' }).tap();
await page.getByRole('heading', { name: 'Вам положено' }).waitFor();
assert.ok(await page.getByText('Ребёнок до 7 лет · ребёнок').isVisible());
assert.equal(await page.getByText('Инвалидность с детства?').count(), 0);

// Path 3: child aged 10 → groups, no childhood question, no "under 7" option.
await page.goto(URL);
await page.getByLabel('Год рождения человека с инвалидностью').fill(String(new Date().getFullYear() - 10));
await page.getByRole('button', { name: 'Продолжить' }).tap();
await page.getByRole('heading', { name: 'Какая группа инвалидности?' }).waitFor();
assert.equal(await page.getByText('Инвалидность с детства?').count(), 0);
assert.equal(await page.getByRole('radio', { name: /до 7 лет/ }).count(), 0);
await page.getByRole('button', { name: 'Показать мои льготы' }).tap();
assert.ok(await page.getByRole('alert').getByText('Выберите группу инвалидности.').isVisible());

// Validation
await page.goto(URL);
await page.getByRole('button', { name: 'Продолжить' }).tap();
assert.ok(await page.getByRole('alert').isVisible());
assert.equal(await page.getByLabel('Год рождения человека с инвалидностью').getAttribute('aria-invalid'), 'true');

// localStorage blocked → app still works.
const ctx2 = await browser.newContext({ viewport: { width: 360, height: 740 } });
await ctx2.addInitScript(() => { Object.defineProperty(window, 'localStorage', { get() { throw new Error('blocked'); } }); });
const p2 = await ctx2.newPage();
p2.on('pageerror', (e) => errors.push('no-storage: ' + e.message));
await p2.goto(URL);
await p2.getByLabel('Год рождения человека с инвалидностью').fill('1970');
await p2.getByRole('button', { name: 'Продолжить' }).click();
await p2.getByRole('radio', { name: 'I группа', exact: true }).check();
await p2.getByRole('button', { name: 'Да', exact: true }).click();
await p2.getByRole('heading', { name: 'Вам положено' }).waitFor();

assert.deepEqual(errors, []);
console.log('e2e: all checks passed');
await browser.close();
