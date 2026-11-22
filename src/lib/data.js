// All content lives in public/ as JSON and is fetched at runtime,
// so editing a JSON file changes the site without rebuilding the code.
const base = import.meta.env.BASE_URL;

async function getJson(path) {
  const res = await fetch(`${base}${path}`, { cache: 'no-cache' });
  if (!res.ok) throw new Error(`${path}: ${res.status}`);
  return res.json();
}

export async function loadAll() {
  const [config, benefits, guides, glossary] = await Promise.all([
    getJson('data/config.json'),
    getJson('data/benefits.json'),
    getJson('data/guides.json'),
    getJson('data/glossary.json').catch(() => ({})),
  ]);
  return { config, benefits: benefits.benefits || [], guides, glossary: glossary.terms || {} };
}

export async function loadDict(lang) {
  try {
    return await getJson(`i18n/${lang}.json`);
  } catch {
    return {};
  }
}

// Optional translations of the content: data/benefits.kk.json etc. Missing files fall back to Russian.
export async function loadLocalized(lang) {
  const get = (name) => getJson(`data/${name}.${lang}.json`).catch(() => null);
  const [benefits, guides, glossary] = await Promise.all([get('benefits'), get('guides'), get('glossary')]);
  return {
    benefits: benefits?.benefits || null,
    guides: guides || null,
    glossary: glossary?.terms || null,
  };
}
