import { useState } from 'react';
import { useT } from '../lib/i18n.jsx';
import { href, navigate } from '../lib/router.js';
import { ageFromYear, groupOptions, segmentForAge, validateYear } from '../lib/logic.js';

export default function YearScreen({ data, setProfile }) {
  const { t } = useT();
  const [value, setValue] = useState('');
  const [error, setError] = useState('');

  function submit(e) {
    e.preventDefault();
    const res = validateYear(value, data.config);
    if (res.error) {
      setError(
        res.error === 'empty' ? t('year.errorEmpty')
          : res.error === 'format' ? t('year.errorFormat')
            : t('year.errorRange', { min: res.min, max: res.max }),
      );
      e.currentTarget.querySelector('input')?.focus();
      return;
    }
    const age = ageFromYear(res.year);
    const segment = segmentForAge(age, data.config);
    const options = groupOptions(age, data.config);
    if (options.length === 0) {
      // Definitely under 7: no group is assigned, skip question 2.
      setProfile({ segment, options, group: 'under7', childhood: true });
      navigate('benefits');
    } else {
      setProfile((p) => ({ segment, options, group: p?.options?.join() === options.join() ? p.group : '', childhood: null }));
      navigate('group');
    }
  }

  return (
    <>
      <h1 tabIndex={-1}>{t('year.title')}</h1>
      <p className="lead">{t('year.lead')}</p>
      <form className="stack" onSubmit={submit} noValidate>
        <div className="field">
          <label htmlFor="birth-year">{t('year.label')}</label>
          <input
            id="birth-year"
            name="birth-year"
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={4}
            autoComplete="off"
            enterKeyHint="next"
            placeholder={t('year.placeholder')}
            value={value}
            onChange={(e) => { setValue(e.target.value.replace(/\D/g, '')); setError(''); }}
            aria-invalid={error ? 'true' : undefined}
            aria-describedby={error ? 'birth-year-error birth-year-note' : 'birth-year-note'}
          />
          {error && <p id="birth-year-error" className="error" role="alert">{error}</p>}
          <p id="birth-year-note" className="note">{t('year.privacy')}</p>
        </div>
        <button type="submit" className="btn btn-primary">{t('year.submit')}</button>
      </form>
      <div className="spacer" />
      <a className="btn btn-secondary" href={href('help')}>{t('year.helpLink')}</a>
    </>
  );
}
