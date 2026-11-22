import { useEffect, useRef, useState } from 'react';
import { useT } from '../lib/i18n.jsx';
import { href, navigate } from '../lib/router.js';
import { asksChildhood } from '../lib/logic.js';
import BackLink from './BackLink.jsx';

export default function GroupScreen({ profile, setProfile }) {
  const { t } = useT();
  const [error, setError] = useState('');
  const firstRadio = useRef(null);

  useEffect(() => { if (!profile?.options?.length) navigate('year'); }, [profile]);
  if (!profile?.options?.length) return null;

  const askChildhood = asksChildhood(profile.segment);

  function pick(group) {
    setProfile({ ...profile, group });
    setError('');
  }

  function finish(childhood) {
    if (!profile.group) {
      setError(t('group.errorGroup'));
      firstRadio.current?.focus();
      return;
    }
    setProfile({ ...profile, childhood: askChildhood ? childhood : true });
    navigate('benefits');
  }

  return (
    <>
      <BackLink to={href('year')} />
      <p className="step">{t('group.step')}</p>
      <h1 tabIndex={-1}>{t('group.title')}</h1>
      <form className="stack" onSubmit={(e) => { e.preventDefault(); finish(true); }} noValidate>
        <fieldset className="choices" aria-describedby={error ? 'group-error' : undefined}>
          <legend className="visually-hidden">{t('group.title')}</legend>
          {profile.options.map((g, i) => (
            <label key={g} className="choice">
              <input
                ref={i === 0 ? firstRadio : undefined}
                type="radio"
                name="group"
                value={g}
                checked={profile.group === g}
                onChange={() => pick(g)}
              />
              <span className="choice-text">
                <span className="choice-title">{t(`group.${g}`)}</span>
                {g === 'under7' && <span className="choice-sub">{t('group.under7Hint')}</span>}
              </span>
            </label>
          ))}
        </fieldset>
        {error && <p id="group-error" className="error" role="alert">{error}</p>}

        {askChildhood ? (
          <fieldset className="yesno">
            <legend>{t('group.childhoodQuestion')}</legend>
            <div className="yesno-row">
              <button type="button" className="btn btn-choice" onClick={() => finish(true)}>{t('group.yes')}</button>
              <button type="button" className="btn btn-choice" onClick={() => finish(false)}>{t('group.no')}</button>
            </div>
          </fieldset>
        ) : (
          <button type="submit" className="btn btn-primary">{t('group.submit')}</button>
        )}
      </form>
    </>
  );
}
