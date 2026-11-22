import { useT } from '../lib/i18n.jsx';

// Each language is named in itself, so people find their language whatever is on screen now.
const NAMES = { ru: 'Русский', kk: 'Қазақша' };

export default function LangChoice({ languages, active, onChange, compact = false }) {
  const { t } = useT();
  return (
    <div className={compact ? 'lang' : 'lang-choice'} role="group" aria-label={t('common.language')}>
      {languages.map((l) => (
        <button
          key={l}
          type="button"
          lang={l}
          className={compact ? 'lang-btn' : 'lang-big'}
          aria-pressed={l === active}
          onClick={() => onChange(l)}
        >
          {NAMES[l] || l}
        </button>
      ))}
    </div>
  );
}
