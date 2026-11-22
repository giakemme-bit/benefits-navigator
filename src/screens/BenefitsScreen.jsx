import { useEffect } from 'react';
import { useT } from '../lib/i18n.jsx';
import { href, navigate } from '../lib/router.js';
import { asksChildhood, filterBenefits, guideKeyFor, isVerified } from '../lib/logic.js';
import Terms from './Terms.jsx';
import BackLink from './BackLink.jsx';

export function profileLabel(t, profile) {
  const parts = [t(`group.${profile.group}`), t(`segment.${profile.segment}`)];
  if (asksChildhood(profile.segment) && profile.childhood) parts.push(t('segment.childhood'));
  return parts.join(' · ');
}

export default function BenefitsScreen({ data, profile, received, setReceived, reset }) {
  const { t } = useT();
  const ready = profile?.group && profile?.segment;
  useEffect(() => { if (!ready) navigate('year'); }, [ready]);
  if (!ready) return null;

  // Benefits with a step-by-step guide go first, in the order guides are listed in guides.json
  // (the sanatorium pilot is first there); the rest keep table order.
  const guideOrder = Object.keys(data.guides).filter((k) => typeof data.guides[k] === 'object');
  const rank = (b) => {
    const i = guideOrder.indexOf(guideKeyFor(b, data.guides));
    return i === -1 ? guideOrder.length : i;
  };
  const list = filterBenefits(data.benefits, profile, data.config.hiddenStatuses)
    .map((b, i) => ({ b, i, r: rank(b) }))
    .sort((x, y) => x.r - y.r || x.i - y.i)
    .map((x) => x.b);
  const done = list.filter((b) => received[b.id]).length;
  const backTo = profile.options?.length ? href('group') : href('year');

  return (
    <>
      <BackLink to={backTo} />
      <h1 tabIndex={-1}>{t('benefits.title')}</h1>
      <p className="chip">{profileLabel(t, profile)}</p>
      {data.russianOnly && <p className="lang-notice" role="note">{t('common.dataLanguageNotice')}</p>}
      <p className="notice" role="note">{t('common.draftNotice')}</p>

      {list.length === 0 ? (
        <p className="lead">{t('benefits.empty')}</p>
      ) : (
        <>
          <p className="lead">{t('benefits.lead')}</p>
          <p className="note" aria-live="polite">{t('benefits.counter', { done, total: list.length })}</p>
          <ul className="cards">
            {list.map((b) => {
              const isDone = !!received[b.id];
              const checkId = `got-${b.id}`;
              return (
                <li key={b.id} className={`card${isDone ? ' card-done' : ''}`}>
                  <h2 className="card-title" id={`title-${b.id}`}>{b.title}</h2>
                  <Terms texts={b.title} glossary={data.glossary} />
                  {b.amount && <p className="card-text">{b.amount}</p>}
                  {!isVerified(b) && <p className="badge">{t('benefits.unverified')}</p>}
                  <div className="card-actions">
                    <label className="check" htmlFor={checkId}>
                      <input
                        id={checkId}
                        type="checkbox"
                        checked={isDone}
                        aria-describedby={`title-${b.id}`}
                        onChange={() => setReceived({ ...received, [b.id]: !isDone })}
                      />
                      <span>{t('benefits.received')}</span>
                    </label>
                    {!isDone && (
                      <a className="btn btn-link" href={href('guide', b.id)} aria-label={`${t('benefits.howTo')}: ${b.title}`}>
                        {t('benefits.howTo')}
                        <span aria-hidden="true"> →</span>
                      </a>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </>
      )}

      <a className="btn btn-secondary" href={href('help')}>{t('common.help')}</a>
      <button type="button" className="btn btn-text" onClick={reset}>{t('benefits.reset')}</button>
    </>
  );
}
