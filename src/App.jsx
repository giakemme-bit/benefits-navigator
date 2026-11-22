import { useEffect, useMemo, useRef, useState } from 'react';
import { loadAll, loadDict } from './lib/data.js';
import { I18nContext, makeT } from './lib/i18n.jsx';
import { useRoute, navigate } from './lib/router.js';
import { clearState } from './lib/storage.js';
import YearScreen from './screens/YearScreen.jsx';
import GroupScreen from './screens/GroupScreen.jsx';
import BenefitsScreen from './screens/BenefitsScreen.jsx';
import GuideScreen from './screens/GuideScreen.jsx';
import HelpScreen from './screens/HelpScreen.jsx';

const LANG_KEY = 'benefits-navigator:lang';
function storedLang() {
  try { return window.localStorage.getItem(LANG_KEY); } catch { return null; }
}

export default function App() {
  const route = useRoute();
  const [data, setData] = useState(null);
  const [failed, setFailed] = useState(false);
  const [dicts, setDicts] = useState({ ru: null });
  const [lang, setLang] = useState(storedLang() || 'ru');
  // Answers live in memory only: refreshing the page starts over.
  // profile: { segment, options, group, childhood } — no birth year, no names.
  const [profile, setProfile] = useState(null);
  const [received, setReceived] = useState({});

  useEffect(() => {
    loadAll().then(setData).catch(() => setFailed(true));
    loadDict('ru').then((ru) => setDicts((d) => ({ ...d, ru })));
  }, []);

  const languages = data?.config.languages || ['ru'];
  const activeLang = languages.includes(lang) ? lang : data?.config.defaultLanguage || 'ru';

  useEffect(() => {
    if (activeLang !== 'ru' && !dicts[activeLang]) {
      loadDict(activeLang).then((d) => setDicts((all) => ({ ...all, [activeLang]: d })));
    }
    document.documentElement.lang = activeLang;
  }, [activeLang, dicts]);

  // Remove answers saved on this device by earlier versions of the site.
  useEffect(() => { clearState(); }, []);

  const t = useMemo(() => makeT(dicts[activeLang], dicts.ru), [dicts, activeLang]);
  const i18n = useMemo(() => ({ t, lang: activeLang }), [t, activeLang]);

  // Move focus to the new screen's heading so screen readers announce it.
  const mainRef = useRef(null);
  const firstRender = useRef(true);
  useEffect(() => {
    if (!data || !dicts.ru) return;
    const titleKey = { year: 'titles.year', group: 'titles.group', benefits: 'titles.benefits', guide: 'titles.guide', help: 'titles.help' }[route.name];
    document.title = `${titleKey ? t(titleKey) : ''} · ${t('app.name')}`;
    if (firstRender.current) { firstRender.current = false; return; }
    window.scrollTo(0, 0);
    mainRef.current?.querySelector('h1')?.focus();
  }, [route.name, route.param, data, dicts.ru, t]);

  function changeLang(next) {
    setLang(next);
    try { window.localStorage.setItem(LANG_KEY, next); } catch { /* ignore */ }
  }

  function reset() {
    setProfile(null);
    setReceived({});
    navigate('year');
  }

  if (failed) {
    return (
      <main className="page" id="main">
        <p role="alert" className="error-block">{dicts.ru ? t('common.loadError') : 'Не удалось загрузить данные. Обновите страницу.'}</p>
        <button type="button" className="btn btn-primary" onClick={() => window.location.reload()}>
          {dicts.ru ? t('common.reload') : 'Обновить страницу'}
        </button>
      </main>
    );
  }
  if (!data || !dicts.ru) {
    return <main className="page" id="main"><p aria-live="polite">Загрузка…</p></main>;
  }

  const ctx = { data, profile, setProfile, received, setReceived, reset, route };
  let screen;
  switch (route.name) {
    case 'group': screen = <GroupScreen {...ctx} />; break;
    case 'benefits': screen = <BenefitsScreen {...ctx} />; break;
    case 'guide': screen = <GuideScreen {...ctx} />; break;
    case 'help': screen = <HelpScreen {...ctx} />; break;
    default: screen = <YearScreen {...ctx} />;
  }

  return (
    <I18nContext.Provider value={i18n}>
      <a className="skip-link" href="#main" onClick={(e) => { e.preventDefault(); mainRef.current?.querySelector('h1')?.focus(); }}>
        {t('app.skip')}
      </a>
      <header className="topbar">
        <span className="brand">{t('app.name')}</span>
        {languages.length > 1 && (
          <div className="lang" role="group" aria-label={t('common.language')}>
            {languages.map((l) => (
              <button key={l} type="button" className="lang-btn" aria-pressed={l === activeLang} onClick={() => changeLang(l)} lang={l}>
                {l === 'kk' ? 'Қаз' : l === 'ru' ? 'Рус' : l}
              </button>
            ))}
          </div>
        )}
      </header>
      <main className="page" id="main" ref={mainRef}>{screen}</main>
    </I18nContext.Provider>
  );
}
