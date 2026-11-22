// Pure functions: no React, no DOM. Covered by tests/logic.test.js.

// Only the birth year is known, so age is the age the person reaches this year.
export function ageFromYear(birthYear, now = new Date()) {
  return now.getFullYear() - birthYear;
}

export function validateYear(raw, config, now = new Date()) {
  const value = String(raw ?? '').trim();
  const max = now.getFullYear() - config.minAge;
  const min = now.getFullYear() - config.maxAge;
  if (!value) return { error: 'empty' };
  if (!/^\d{4}$/.test(value)) return { error: 'format' };
  const year = Number(value);
  if (year < min || year > max) return { error: 'range', min, max };
  return { year };
}

export function segmentForAge(age, config) {
  if (age <= config.childMaxAge) return 'child';
  if (age >= config.pensionAge) return 'pensioner';
  return 'adult';
}

// Which group options to offer on screen 2.
// - definitely under 7: none (screen 2 is skipped, group = under7)
// - child who may be 7 (birthday unknown) or younger: I, II, III, under7
// - everyone else: I, II, III
export function groupOptions(age, config) {
  if (age <= config.under7MaxAge) return [];
  if (age <= config.under7MaxAge + 1) return ['I', 'II', 'III', 'under7'];
  return ['I', 'II', 'III'];
}

// Disability in a child is always "from childhood", so we only ask adults.
export function asksChildhood(segment) {
  return segment !== 'child';
}

export function filterBenefits(benefits, { segment, group, childhood }) {
  const fromChildhood = segment === 'child' ? true : childhood;
  return benefits.filter((b) => {
    if (!b.segments?.includes(segment)) return false;
    if (!b.groups?.includes(group)) return false;
    if (b.childhood === true && fromChildhood !== true) return false;
    if (b.childhood === false && fromChildhood !== false) return false;
    return true;
  });
}

export function isVerified(benefit) {
  return String(benefit.status || '').trim().toLowerCase() === 'проверено';
}

export function interpolate(str, vars = {}) {
  return String(str).replace(/\{(\w+)\}/g, (m, k) => (k in vars ? String(vars[k]) : m));
}

export function whatsappUrl(number, text) {
  const digits = String(number || '').replace(/\D/g, '');
  if (!digits) return '';
  return `https://wa.me/${digits}${text ? `?text=${encodeURIComponent(text)}` : ''}`;
}

export function telegramUrl(username) {
  const name = String(username || '').trim().replace(/^@/, '');
  if (!/^[A-Za-z0-9_]{4,32}$/.test(name)) return '';
  return `https://t.me/${name}`;
}
