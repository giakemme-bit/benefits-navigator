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

test('filterBenefits respects segment, group and childhood', () => {
  const ids = (p) => filterBenefits(benefits, p).map((b) => b.id);
  const adultNo = ids({ segment: 'adult', group: 'II', childhood: false });
  assert.ok(adultNo.includes('sanatorium'));
  assert.ok(adultNo.includes('gsp_disability'));
  assert.ok(!adultNo.includes('gsp_childhood'));
  assert.ok(!adultNo.includes('gsp_child'));
  const adultYes = ids({ segment: 'adult', group: 'II', childhood: true });
  assert.ok(adultYes.includes('gsp_childhood'));
  assert.ok(!adultYes.includes('gsp_disability'));
  const baby = ids({ segment: 'child', group: 'under7', childhood: null });
  assert.ok(baby.includes('gsp_child'));
  assert.ok(baby.includes('sanatorium'));
  assert.ok(!baby.includes('carer_group1'));
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
