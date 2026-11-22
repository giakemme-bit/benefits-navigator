// Turns rows of the «База льгот» table into benefits.json records.
// Pure functions, covered by tests/import.test.js.

const ALL_SEGMENTS = ['child', 'adult', 'pensioner'];
const ALL_GROUPS = ['I', 'II', 'III', 'under7'];
const norm = (s) => String(s ?? '').trim().toLowerCase().replace(/ё/g, 'е');

// «Сегмент»: who the benefit is for. Several values may be comma-separated.
export function parseSegments(value) {
  const v = norm(value);
  if (!v || /^(все|любой|любая|любые)$/.test(v)) return [...ALL_SEGMENTS];
  const out = new Set();
  for (const part of v.split(/[,;/]/).map((s) => s.trim()).filter(Boolean)) {
    if (/^(все|любой)/.test(part)) ALL_SEGMENTS.forEach((s) => out.add(s));
    else if (/опекун взросл|уход.*взросл/.test(part)) out.add('adult');
    else if (/реб|дет|родител/.test(part)) out.add('child');
    else if (/пенсион/.test(part)) out.add('pensioner');
    else if (/взросл/.test(part)) out.add('adult');
  }
  return ALL_SEGMENTS.filter((s) => out.has(s));
}

// «Группа»: I, II, III, «Без группы» / «до 7» (= ребёнок до 7 лет), «Любая».
// Text in brackets is a note, not a group: «I, II (при III группе …)» → I, II.
export function parseGroups(value, segmentText = '') {
  const v = norm(value).replace(/\(.*?\)/g, ' ');
  if (!v || /^(все|любая|любой)$/.test(v.trim()) || /зависит/.test(v)) return [...ALL_GROUPS];
  const out = new Set();
  if (/без группы|до 7/.test(v) || (/до 7/.test(norm(segmentText)) && !/\bi/.test(v))) out.add('under7');
  for (const m of v.replace(/\b1\b/g, 'i').replace(/\b2\b/g, 'ii').replace(/\b3\b/g, 'iii').matchAll(/\b(i{1,3})\b/g)) {
    out.add(m[1].toUpperCase());
  }
  if (/любая/.test(v)) ALL_GROUPS.forEach((g) => out.add(g));
  return ALL_GROUPS.filter((g) => out.has(g));
}

// «С детства»: from its own column if the table has one, otherwise from the title.
export function parseChildhood(columnValue, title) {
  const c = norm(columnValue);
  if (c === 'да') return true;
  if (c === 'нет') return false;
  const t = norm(title);
  if (/с детства/.test(t)) return true;
  if (/общего заболевания/.test(t)) return false;
  return null;
}

export function cleanDate(value) {
  return String(value ?? '').trim().replace(/\s+00:00(:00)?$/, '');
}

const TRANSLIT = { а:'a',б:'b',в:'v',г:'g',д:'d',е:'e',ё:'e',ж:'zh',з:'z',и:'i',й:'y',к:'k',л:'l',м:'m',н:'n',о:'o',п:'p',р:'r',с:'s',т:'t',у:'u',ф:'f',х:'h',ц:'c',ч:'ch',ш:'sh',щ:'sh',ы:'y',э:'e',ю:'yu',я:'ya',ь:'',ъ:'' };
export const slug = (s) => String(s ?? '').toLowerCase().split('').map((c) => TRANSLIT[c] ?? c).join('')
  .replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '').slice(0, 48);

// rows: array of objects keyed by the table's column names.
// guides: guides.json content, used to link a benefit to its step-by-step guide.
export function rowsToBenefits(rows, guides = {}) {
  const ids = new Set();
  const problems = [];
  const guideByTitle = {};
  for (const [key, g] of Object.entries(guides)) {
    if (g && typeof g === 'object' && g.benefitTitle) guideByTitle[norm(g.benefitTitle)] = key;
  }
  const benefits = rows.map((r, i) => {
    const line = i + 2;
    const title = String(r['Льгота или услуга'] ?? '').trim();
    const groupText = String(r['Группа'] ?? '');
    let id = String(r['ID'] ?? '').trim() || slug(title) || `row_${line}`;
    if (ids.has(id)) id = `${id}_${slug(groupText) || line}`;
    while (ids.has(id)) id += `_${line}`;
    ids.add(id);
    const b = {
      id,
      title,
      segments: parseSegments(r['Сегмент']),
      groups: parseGroups(groupText, r['Сегмент']),
      childhood: parseChildhood(r['С детства'], title),
      amount: String(r['Размер или суть'] ?? '').trim(),
      howTo: String(r['Как получить'] ?? '').trim(),
      basis: String(r['Основание'] ?? '').trim(),
      source: String(r['Источник'] ?? '').trim(),
      status: String(r['Статус проверки'] ?? '').trim() || 'Не проверено',
      checkedAt: cleanDate(r['Дата проверки']),
      comment: String(r['Комментарий'] ?? '').trim(),
      guideId: String(r['Инструкция'] ?? '').trim() || guideByTitle[norm(title)] || '',
    };
    if (!b.title) problems.push(`строка ${line}: нет названия`);
    if (!b.segments.length) problems.push(`строка ${line}: непонятный сегмент «${r['Сегмент']}»`);
    if (!b.groups.length) problems.push(`строка ${line}: непонятная группа «${groupText}»`);
    if (b.guideId && !guides[b.guideId]) problems.push(`строка ${line}: нет инструкции «${b.guideId}» в guides.json`);
    return b;
  });
  return { benefits, problems };
}
