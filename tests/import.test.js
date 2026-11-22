import test from 'node:test';
import assert from 'node:assert/strict';
import { parseSegments, parseGroups, parseChildhood, rowsToBenefits, cleanDate } from '../scripts/parse-benefits.mjs';

test('segments: wording used in the table', () => {
  assert.deepEqual(parseSegments('Ребёнок до 7'), ['child']);
  assert.deepEqual(parseSegments('Ребёнок 7-18'), ['child']);
  assert.deepEqual(parseSegments('Родитель или опекун ребёнка'), ['child']);
  assert.deepEqual(parseSegments('Опекун взрослого'), ['adult']);
  assert.deepEqual(parseSegments('Взрослый (работающий)'), ['adult']);
  assert.deepEqual(parseSegments('Пенсионер'), ['pensioner']);
  assert.deepEqual(parseSegments('Любой'), ['child', 'adult', 'pensioner']);
  assert.deepEqual(parseSegments('Взрослый, Пенсионер'), ['adult', 'pensioner']);
});

test('groups: wording used in the table', () => {
  assert.deepEqual(parseGroups('Без группы', 'Ребёнок до 7'), ['under7']);
  assert.deepEqual(parseGroups('I', 'Ребёнок 7-18'), ['I']);
  assert.deepEqual(parseGroups('III'), ['III']);
  assert.deepEqual(parseGroups('I, II, III'), ['I', 'II', 'III']);
  assert.deepEqual(parseGroups('I, II (при III группе услуга может прекращаться)'), ['I', 'II']);
  assert.deepEqual(parseGroups('Любая'), ['I', 'II', 'III', 'under7']);
  assert.deepEqual(parseGroups('Зависит от города'), ['I', 'II', 'III', 'under7']);
  assert.deepEqual(parseGroups('3 группа'), ['III']);
});

test('childhood: column first, then title', () => {
  assert.equal(parseChildhood('Да', ''), true);
  assert.equal(parseChildhood('', 'ГСП по инвалидности: взрослый, инвалидность с детства'), true);
  assert.equal(parseChildhood('', 'ГСП по инвалидности: взрослый (от общего заболевания)'), false);
  assert.equal(parseChildhood('', 'Санаторно-курортное лечение'), null);
});

test('rowsToBenefits: unique ids, guide link by title, clean dates', () => {
  const guides = { sanatorium: { benefitTitle: 'Санаторно-курортное лечение', steps: [] } };
  const rows = [
    { 'Льгота или услуга': 'ГСП: взрослый', 'Сегмент': 'Взрослый', 'Группа': 'I', 'Дата проверки': '2026-11-19 00:00:00' },
    { 'Льгота или услуга': 'ГСП: взрослый', 'Сегмент': 'Взрослый', 'Группа': 'II' },
    { 'Льгота или услуга': 'Санаторно-курортное лечение', 'Сегмент': 'Любой', 'Группа': 'Любая' },
  ];
  const { benefits, problems } = rowsToBenefits(rows, guides);
  assert.deepEqual(problems, []);
  assert.equal(new Set(benefits.map((b) => b.id)).size, 3);
  assert.equal(benefits[2].guideId, 'sanatorium');
  assert.equal(benefits[0].checkedAt, '2026-11-19');
  assert.equal(benefits[0].status, 'Не проверено');
  assert.equal(cleanDate('19.11.2026'), '19.11.2026');
});

test('rowsToBenefits reports rows it cannot understand', () => {
  const { problems } = rowsToBenefits([{ 'Льгота или услуга': 'X', 'Сегмент': 'Инопланетянин', 'Группа': 'I' }]);
  assert.equal(problems.length, 1);
});
