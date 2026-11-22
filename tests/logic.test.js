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
});

test('contact links', () => {
  assert.equal(whatsappUrl('', 'x'), '');
  assert.equal(whatsappUrl('+7 700 123 45 67', 'Привет'), 'https://wa.me/77001234567?text=%D0%9F%D1%80%D0%B8%D0%B2%D0%B5%D1%82');
  assert.equal(telegramUrl('@lgoty_help'), 'https://t.me/lgoty_help');
  assert.equal(telegramUrl('bad name'), '');
  assert.equal(interpolate('от {min} до {max}', { min: 1, max: 2 }), 'от 1 до 2');
});
