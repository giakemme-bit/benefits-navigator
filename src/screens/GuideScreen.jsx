import { useT } from '../lib/i18n.jsx';
import { href } from '../lib/router.js';
import BackLink from './BackLink.jsx';
import Terms from './Terms.jsx';
import { guideKeyFor, termsIn } from '../lib/logic.js';

function ExternalLink({ url, label }) {
  const { t } = useT();
  return (
    <a href={url} target="_blank" rel="noopener noreferrer">
      {label}<span className="visually-hidden"> {t('guide.externalHint')}</span>
    </a>
  );
}

export default function GuideScreen({ data, route }) {
  const { t } = useT();
  const benefit = data.benefits.find((b) => b.id === route.param);
  const guide = benefit ? data.guides[guideKeyFor(benefit, data.guides)] || null : null;

  if (!benefit) {
    return (
      <>
        <BackLink to={href('benefits')} />
        <h1 tabIndex={-1}>{t('guide.notFound')}</h1>
      </>
    );
  }

  const pageTexts = [
    benefit.title, guide?.title,
    ...(guide ? guide.steps.flatMap((s) => [s.title, s.text, ...(s.details?.steps || [])]) : [benefit.howTo, benefit.basis]),
  ];
  const pageTerms = termsIn(pageTexts, data.glossary);

  return (
    <>
      <BackLink to={href('benefits')} />
      <h1 tabIndex={-1}>{guide?.title || t('guide.genericTitle', { title: benefit.title })}</h1>
      {data.russianOnly && <p className="lang-notice" role="note">{t('common.dataLanguageNotice')}</p>}
      {guide?.tags?.length > 0 && (
        <ul className="tags">{guide.tags.map((tag) => <li key={tag} className="chip">{tag}</li>)}</ul>
      )}

      {guide ? (
        <ol className="steps" aria-label={t('guide.stepsLabel')}>
          {guide.steps.map((s, i) => (
            <li key={i} className="step-card">
              <span className="step-num" aria-hidden="true">{i + 1}</span>
              <div>
                <h2 className="card-title">{s.title}</h2>
                <p className="card-text">{s.text}</p>
                {s.details?.steps?.length > 0 && (
                  <details className="more">
                    <summary>{s.details.title || t('guide.more')}</summary>
                    <ol className="substeps">
                      {s.details.steps.map((line, j) => <li key={j}>{line}</li>)}
                    </ol>
                  </details>
                )}
              </div>
            </li>
          ))}
        </ol>
      ) : (
        <div className="card">
          <h2 className="card-title">{t('guide.where')}</h2>
          <p className="card-text">{benefit.howTo}</p>
          {benefit.basis && (
            <>
              <h2 className="card-title">{t('guide.basis')}</h2>
              <p className="card-text">{benefit.basis}</p>
            </>
          )}
        </div>
      )}

      {guide?.links?.length > 0 && (
        <section aria-labelledby="links-h">
          <h2 id="links-h" className="section-title">{t('guide.links')}</h2>
          <ul className="links">
            {guide.links.map((l) => <li key={l.url}><ExternalLink url={l.url} label={l.label} /></li>)}
          </ul>
        </section>
      )}

      <section aria-labelledby="terms-h" className="terms-section" hidden={!pageTerms.length}>
        <h2 id="terms-h" className="section-title">{t('guide.terms')}</h2>
        <Terms texts={pageTexts} glossary={data.glossary} />
      </section>

      <p className="notice" role="note">{t('common.draftNotice')}</p>
      <a className="btn btn-primary" href={href('help', '', { topic: benefit.id })}>{t('guide.helpButton')}</a>
    </>
  );
}
