#!/usr/bin/env node
// Converts the «База льгот» table (Google Sheets: Файл → Скачать → CSV)
// into public/data/benefits.json.
//
//   npm run import:csv -- path/to/baza.csv
//
// Required columns: Льгота или услуга, Сегмент, Группа, Размер или суть,
//   Как получить, Основание, Источник, Статус проверки, Дата проверки, Комментарий
// Optional columns: ID, С детства (Да/Нет), Инструкция (key in guides.json)
import fs from 'node:fs';
import path from 'node:path';
import { rowsToBenefits } from './parse-benefits.mjs';

export function parseCsv(text) {
  const first = text.split('\n')[0];
  const sep = first.split(';').length > first.split(',').length ? ';' : ',';
  const rows = [];
  let row = [], cell = '', quoted = false;
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

const file = process.argv[2];
if (!file) {
  console.error('Использование: npm run import:csv -- путь/к/файлу.csv');
  process.exit(1);
}
const [header, ...rows] = parseCsv(fs.readFileSync(file, 'utf8').replace(/^﻿/, ''));
const names = header.map((h) => h.trim());
const need = ['Льгота или услуга', 'Сегмент', 'Группа', 'Размер или суть', 'Как получить', 'Основание', 'Источник', 'Статус проверки', 'Дата проверки', 'Комментарий'];
const missing = need.filter((n) => !names.includes(n));
if (missing.length) {
  console.error(`Нет колонок: ${missing.join(', ')}`);
  process.exit(1);
}
const objects = rows.map((r) => Object.fromEntries(names.map((n, i) => [n, r[i] ?? ''])));
const dataDir = path.resolve(import.meta.dirname, '../public/data');
const guides = JSON.parse(fs.readFileSync(path.join(dataDir, 'guides.json'), 'utf8'));
const { benefits, problems } = rowsToBenefits(objects, guides);
if (problems.length) {
  console.error(problems.join('\n'));
  process.exit(1);
}
const out = path.join(dataDir, 'benefits.json');
const prev = JSON.parse(fs.readFileSync(out, 'utf8'));
fs.writeFileSync(out, JSON.stringify({ _comment: prev._comment, updated: new Date().toISOString().slice(0, 10), benefits }, null, 2) + '\n');
console.log(`Записано льгот: ${benefits.length} → ${out}`);
