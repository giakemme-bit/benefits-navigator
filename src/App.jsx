import { useEffect, useMemo, useRef, useState } from 'react';
import { loadAll, loadDict, loadLocalized } from './lib/data.js';
import { I18nContext, makeT } from './lib/i18n.jsx';
import { useRoute, navigate } from './lib/router.js';
import { clearState } from './lib/storage.js';
import { localizeContent } from './lib/logic.js';
import YearScreen from './screens/YearScreen.jsx';
import GroupScreen from './screens/GroupScreen.jsx';
import BenefitsScreen from './screens/BenefitsScreen.jsx';
import GuideScreen from './screens/GuideScreen.jsx';
import HelpScreen from './screens/HelpScreen.jsx';
import LangChoice from './screens/LangChoice.jsx';

// Language is not saved either: it starts from the browser's language, Russian otherwise.
function browserLang() {
  try {
    return (navigator.languages || [navigator.language]).some((l) => /^kk\b/i.test(l)) ? 'kk' : 'ru';
  } catch {
    return 'ru';
  }
}

export default function App() {
  const route = useRoute();
  const [data, setData] = useState(null);
  const [failed, setFailed] = useState(false);
  const [dicts, setDicts] = useState({ ru: null });
  const [lang, setLang] = useState(browserLang);
  const [localized, setLocalized] = useState({});
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

  // Benefits, guides and glossary in the chosen language, if the author has added them.
  useEffect(() => {
    const hasContent = (data?.config.contentLanguages || ['ru']).includes(activeLang);
    if (activeLang === 'ru' || !hasContent || localized[activeLang]) return;
    loadLocalized(activeLang).then((d) => setLocalized((all) => ({ ...all, [activeLang]: d })));
  }, [activeLang, localized, data]);

  // Remove answers saved on this device by earlier versions of the site.
  useEffect(() => { clearState(); }, []);

  const t = useMemo(() => makeT(dicts[activeLang], dicts.ru), [dicts, activeLang]);
  const i18n = useMemo(() => ({ t, lang: activeLang }), [t, activeLang]);

  // Move focus to the new screen's heading so screen readers announce it.
  const mainRef = useRef(null);
  const firstRender = useRef(true);
  const ready = !!(data && dicts.ru);
  useEffect(() => {
    if (!ready) return;
    const titleKey = { year: 'titles.year', group: 'titles.group', benefits: 'titles.benefits', guide: 'titles.guide', help: 'titles.help' }[route.name];
    document.title = `${titleKey ? t(titleKey) : ''} · ${t('app.name')}`;
  }, [ready, route.name, t]);
  useEffect(() => {
    if (!ready) return;
    if (firstRender.current) { firstRender.current = false; return; }
    window.scrollTo(0, 0);
    mainRef.current?.querySelector('h1')?.focus();
  }, [ready, route.name, route.param]);

  function changeLang(next) {
    setLang(next);
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

  const localizedData = activeLang === 'ru' ? data : localizeContent(data, localized[activeLang]);
  // russianOnly: the chosen language has no translated benefits yet, so a note is shown.
  const shown = { ...localizedData, russianOnly: activeLang !== 'ru' && !localizedData.translated };
  const langChoice = languages.length > 1
    ? <LangChoice languages={languages} active={activeLang} onChange={changeLang} />
    : null;
  const ctx = { data: shown, profile, setProfile, received, setReceived, reset, route, langChoice };
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
        {languages.length > 1 && route.name !== 'year' && (
          <LangChoice languages={languages} active={activeLang} onChange={changeLang} compact />
        )}
      </header>
      <main className="page" id="main" ref={mainRef}>{screen}</main>
    </I18nContext.Provider>
  );
}
