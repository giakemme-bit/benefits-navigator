import { useEffect } from 'react';
import { useT } from '../lib/i18n.jsx';
import { href, navigate } from '../lib/router.js';
import { asksChildhood, filterBenefits, isVerified } from '../lib/logic.js';
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

  // Benefits with a step-by-step guide go first (the pilot scenario), the rest keep table order.
  const list = filterBenefits(data.benefits, profile, data.config.hiddenStatuses)
    .map((b, i) => ({ b, i, guided: b.guideId && data.guides[b.guideId] ? 0 : 1 }))
    .sort((x, y) => x.guided - y.guided || x.i - y.i)
    .map((x) => x.b);
  const done = list.filter((b) => received[b.id]).length;
  const backTo = profile.options?.length ? href('group') : href('year');

  return (
    <>
      <BackLink to={backTo} />
      <h1 tabIndex={-1}>{t('benefits.title')}</h1>
      <p className="chip">{profileLabel(t, profile)}</p>
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
