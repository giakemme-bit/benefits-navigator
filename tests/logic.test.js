import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  ageFromYear, validateYear, segmentForAge, groupOptions, asksChildhood,
  filterBenefits, whatsappUrl, telegramUrl, interpolate,
} from '../src/lib/logic.js';

const config = JSON.parse(fs.readFileSync(new URL('../public/data/config.json', import.meta.url)));
const { benefits } = JSON.parse(fs.readFileSync(new URL('../public/data/benefits.json', import.meta.url)));
const now = new Date('2026-11-22');

test('validateYear', () => {
  assert.deepEqual(validateYear('', config, now), { error: 'empty' });
  assert.deepEqual(validateYear('19a0', config, now), { error: 'format' });
  assert.equal(validateYear('1900', config, now).error, 'range');
  assert.equal(validateYear('2027', config, now).error, 'range');
  assert.deepEqual(validateYear(' 1990 ', config, now), { year: 1990 });
});

test('segments', () => {
  assert.equal(segmentForAge(ageFromYear(2010, now), config), 'child');
  assert.equal(segmentForAge(ageFromYear(2008, now), config), 'adult');
  assert.equal(segmentForAge(ageFromYear(1990, now), config), 'adult');
  assert.equal(segmentForAge(ageFromYear(1963, now), config), 'pensioner');
});

test('group options: under 7 skips the group question', () => {
  assert.deepEqual(groupOptions(ageFromYear(2021, now), config), []);
  assert.deepEqual(groupOptions(ageFromYear(2019, now), config), ['I', 'II', 'III', 'under7']);
  assert.deepEqual(groupOptions(ageFromYear(2015, now), config), ['I', 'II', 'III']);
  assert.equal(asksChildhood('child'), false);
  assert.equal(asksChildhood('adult'), true);
});

test('filterBenefits respects segment, group, childhood and hidden statuses', () => {
  const titles = (p) => filterBenefits(benefits, p, config.hiddenStatuses).map((b) => b.title);
  const has = (list, part) => list.some((t) => t.includes(part));
  const adultNo = titles({ segment: 'adult', group: 'II', childhood: false });
  assert.ok(has(adultNo, 'Санаторно-курортное лечение'));
  assert.ok(has(adultNo, 'от общего заболевания'));
  assert.ok(!has(adultNo, 'с детства'));
  assert.ok(!has(adultNo, 'ребёнок'));
  const adultYes = titles({ segment: 'adult', group: 'II', childhood: true });
  assert.ok(has(adultYes, 'с детства'));
  assert.ok(!has(adultYes, 'от общего заболевания'));
  const baby = titles({ segment: 'child', group: 'under7', childhood: null });
  assert.ok(has(baby, 'ребёнок до 7 лет'));
  assert.ok(has(baby, 'Санаторно-курортное лечение'));
  assert.ok(!has(baby, 'ребёнок 7-18'));
  // one ГСП row per group, never two
  for (const g of ['I', 'II', 'III']) {
    assert.equal(titles({ segment: 'adult', group: g, childhood: false }).filter((t) => t.startsWith('ГСП')).length, 1);
  }
  // «Нужно собрать» is never shown
  const statuses = new Set(['child', 'adult', 'pensioner'].flatMap((segment) =>
    filterBenefits(benefits, { segment, group: 'I', childhood: false }, config.hiddenStatuses).map((b) => b.status)));
  assert.ok(!statuses.has('Нужно собрать'));
});

test('every benefit has the required fields and valid tags', () => {
  const segs = new Set(['child', 'adult', 'pensioner']);
  const groups = new Set(['I', 'II', 'III', 'under7']);
  const seen = new Set();
  for (const b of benefits) {
    assert.ok(b.id && !seen.has(b.id), `unique id ${b.id}`);
    seen.add(b.id);
    assert.ok(b.title, `title for ${b.id}`);
    assert.ok(b.segments.length && b.segments.every((s) => segs.has(s)), `segments ${b.id}`);
    assert.ok(b.groups.length && b.groups.every((g) => groups.has(g)), `groups ${b.id}`);
    assert.ok([true, false, null].includes(b.childhood), `childhood ${b.id}`);
  }
});

test('i18n: kk has the same keys as ru', () => {
  const ru = JSON.parse(fs.readFileSync(new URL('../public/i18n/ru.json', import.meta.url)));
  const kk = JSON.parse(fs.readFileSync(new URL('../public/i18n/kk.json', import.meta.url)));
  const strip = (o) => Object.keys(o).filter((k) => !k.startsWith('_')).sort();
  assert.deepEqual(strip(kk), strip(ru));
  const empty = strip(kk).filter((k) => !String(kk[k]).trim());
  assert.deepEqual(empty, [], 'kk.json: empty strings');
});

test('contact links', () => {
  assert.equal(whatsappUrl('', 'x'), '');
  assert.equal(whatsappUrl('+7 700 123 45 67', 'Привет'), 'https://wa.me/77001234567?text=%D0%9F%D1%80%D0%B8%D0%B2%D0%B5%D1%82');
  assert.equal(telegramUrl('@lgoty_help'), 'https://t.me/lgoty_help');
  assert.equal(telegramUrl('bad name'), '');
  assert.equal(interpolate('от {min} до {max}', { min: 1, max: 2 }), 'от 1 до 2');
});

test('guides are found by id or by benefit title, and every GSP row has one', async () => {
  const { guideKeyFor } = await import('../src/lib/logic.js');
  const guides = JSON.parse(fs.readFileSync(new URL('../public/data/guides.json', import.meta.url)));
  for (const b of benefits.filter((x) => x.title.startsWith('ГСП'))) {
    assert.ok(guideKeyFor(b, guides), `guide for ${b.title}`);
  }
  assert.equal(guideKeyFor(benefits.find((b) => b.title === 'Санаторно-курортное лечение'), guides), 'sanatorium');
  // every benefitTitle in guides.json points to a real row of the table
  const titles = new Set(benefits.map((b) => b.title));
  for (const [key, g] of Object.entries(guides)) {
    if (typeof g !== 'object') continue;
    for (const t of [].concat(g.benefitTitle || [])) assert.ok(titles.has(t), `${key}: «${t}» нет в таблице`);
  }
});

test('glossary: whole words only', async () => {
  const { termsIn } = await import('../src/lib/logic.js');
  const g = { 'ГСП': 'государственное социальное пособие', 'ИПН': 'налог', 'ЦОН': 'центр' };
  assert.deepEqual(termsIn('ГСП по инвалидности', g).map(([k]) => k), ['ГСП']);
  assert.deepEqual(termsIn(['Подать в ЦОН.', 'ИПНА'], g).map(([k]) => k), ['ЦОН']);
});

test('kk content: every visible benefit and every guide is translated, structure matches', async () => {
  const { localizeContent } = await import('../src/lib/logic.js');
  const read = (n) => JSON.parse(fs.readFileSync(new URL(`../public/data/${n}`, import.meta.url)));
  const ruGuides = read('guides.json');
  const kkB = read('benefits.kk.json').benefits;
  const kkG = read('guides.kk.json');
  const hidden = new Set(config.hiddenStatuses);
  const kkIds = new Set(kkB.map((b) => b.id));
  const ruIds = new Set(benefits.map((b) => b.id));
  for (const b of benefits) if (!hidden.has(b.status)) assert.ok(kkIds.has(b.id), `нет перевода: ${b.id}`);
  for (const id of kkIds) assert.ok(ruIds.has(id), `лишний перевод (нет в таблице): ${id}`);
  for (const [k, g] of Object.entries(ruGuides)) {
    if (typeof g !== 'object') continue;
    assert.ok(kkG[k], `нет перевода инструкции ${k}`);
    assert.equal(kkG[k].steps.length, g.steps.length, `${k}: число шагов`);
    g.steps.forEach((s, i) => assert.equal(!!kkG[k].steps[i].details, !!s.details, `${k} шаг ${i + 1}: details`));
  }
  // guides stay linked after titles are translated
  const shown = localizeContent({ benefits, guides: ruGuides, glossary: {} }, { benefits: kkB, guides: kkG, glossary: {} });
  const san = shown.benefits.find((b) => b.id === 'sanatorno_kurortnoe_lechenie');
  assert.equal(san.title, 'Санаторий-курорттық емдеу');
  assert.equal(san.guideId, 'sanatorium');
  assert.ok(shown.benefits.filter((b) => b.title.startsWith('МӘЖ')).every((b) => b.guideId));
});
