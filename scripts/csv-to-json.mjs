#!/usr/bin/env node
// Converts the «База льгот» table (exported as CSV from Google Sheets/Excel)
// into public/data/benefits.json.
//
//   npm run import:csv -- path/to/baza.csv
//
// Required columns (names as in the table):
//   Льгота или услуга, Сегмент, Группа, Размер или суть, Как получить,
//   Основание, Источник, Статус проверки, Дата проверки, Комментарий
// Optional columns:
//   ID          — stable id; generated from the title if empty
//   С детства   — «Да» / «Нет» / empty (doesn't matter)
//   Инструкция  — key from guides.json, e.g. sanatorium
//
// Сегмент: «Ребёнок», «Взрослый», «Пенсионер», «Все» (several, comma-separated)
// Группа:  «I», «II», «III», «до 7» / «ребёнок до 7 лет», «Все» (several, comma-separated)
import fs from 'node:fs';
import path from 'node:path';

const file = process.argv[2];
if (!file) {
  console.error('Usage: npm run import:csv -- path/to/file.csv');
  process.exit(1);
}

export function parseCsv(text) {
  const rows = [];
  let row = [], cell = '', quoted = false;
  const sep = text.split('\n')[0].split(';').length > text.split('\n')[0].split(',').length ? ';' : ',';
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') { cell += '"'; i++; }
      else if (c === '"') quoted = false;
      else cell += c;
    } else if (c === '"') quoted = true;
    else if (c === sep) { row.push(cell); cell = ''; }
    else if (c === '\n') { row.push(cell); rows.push(row); row = []; cell = ''; }
    else if (c !== '\r') cell += c;
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  return rows.filter((r) => r.some((v) => v.trim()));
}

const SEGMENTS = { 'ребёнок': 'child', 'ребенок': 'child', 'дети': 'child', 'взрослый': 'adult', 'взрослые': 'adult', 'пенсионер': 'pensioner', 'пенсионеры': 'pensioner' };
const norm = (s) => String(s || '').trim().toLowerCase();

function parseSegments(v) {
  if (!norm(v) || norm(v) === 'все') return ['child', 'adult', 'pensioner'];
  return [...new Set(v.split(/[,;/]/).map((s) => SEGMENTS[norm(s)]).filter(Boolean))];
}
function parseGroups(v) {
  if (!norm(v) || norm(v) === 'все') return ['I', 'II', 'III', 'under7'];
  const out = [];
  for (const part of v.split(/[,;/]/)) {
    const p = norm(part).replace(/\s*группа\s*/, '').replace(/1/g, 'i').replace(/2/g, 'ii').replace(/3/g, 'iii');
    if (p.includes('7')) out.push('under7');
    else if (['i', 'ii', 'iii'].includes(p)) out.push(p.toUpperCase());
  }
  return [...new Set(out)];
}
function parseChildhood(v) {
  const n = norm(v);
  if (n === 'да') return true;
  if (n === 'нет') return false;
  return null;
}
const TRANSLIT = { а:'a',б:'b',в:'v',г:'g',д:'d',е:'e',ё:'e',ж:'zh',з:'z',и:'i',й:'y',к:'k',л:'l',м:'m',н:'n',о:'o',п:'p',р:'r',с:'s',т:'t',у:'u',ф:'f',х:'h',ц:'c',ч:'ch',ш:'sh',щ:'sh',ы:'y',э:'e',ю:'yu',я:'ya' };
const slug = (s) => norm(s).split('').map((c) => TRANSLIT[c] ?? c).join('').replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '').slice(0, 40);

const [header, ...rows] = parseCsv(fs.readFileSync(file, 'utf8').replace(/^﻿/, ''));
const col = (name) => header.findIndex((h) => norm(h) === norm(name));
const need = ['Льгота или услуга', 'Сегмент', 'Группа', 'Размер или суть', 'Как получить', 'Основание', 'Источник', 'Статус проверки', 'Дата проверки', 'Комментарий'];
const missing = need.filter((n) => col(n) === -1);
if (missing.length) {
  console.error(`Missing columns: ${missing.join(', ')}`);
  process.exit(1);
}
const get = (r, name) => { const i = col(name); return i === -1 ? '' : String(r[i] ?? '').trim(); };

const ids = new Set();
const problems = [];
const benefits = rows.map((r, n) => {
  const title = get(r, 'Льгота или услуга');
  let id = get(r, 'ID') || slug(title) || `row_${n + 2}`;
  while (ids.has(id)) id += '_2';
  ids.add(id);
  const b = {
    id, title,
    segments: parseSegments(get(r, 'Сегмент')),
    groups: parseGroups(get(r, 'Группа')),
    childhood: parseChildhood(get(r, 'С детства')),
    amount: get(r, 'Размер или суть'),
    howTo: get(r, 'Как получить'),
    basis: get(r, 'Основание'),
    source: get(r, 'Источник'),
    status: get(r, 'Статус проверки') || 'Не проверено',
    checkedAt: get(r, 'Дата проверки'),
    comment: get(r, 'Комментарий'),
    guideId: get(r, 'Инструкция'),
  };
  if (!b.title) problems.push(`row ${n + 2}: empty title`);
  if (!b.segments.length) problems.push(`row ${n + 2}: unknown segment "${get(r, 'Сегмент')}"`);
  if (!b.groups.length) problems.push(`row ${n + 2}: unknown group "${get(r, 'Группа')}"`);
  return b;
});

if (problems.length) {
  console.error(problems.join('\n'));
  process.exit(1);
}

const out = path.resolve(import.meta.dirname, '../public/data/benefits.json');
const prev = JSON.parse(fs.readFileSync(out, 'utf8'));
fs.writeFileSync(out, JSON.stringify({ _comment: prev._comment, updated: new Date().toISOString().slice(0, 10), benefits }, null, 2) + '\n');
console.log(`Wrote ${benefits.length} benefits to ${out}`);
