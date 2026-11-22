import { useState } from 'react';
import { useT } from '../lib/i18n.jsx';
import { href } from '../lib/router.js';
import { telegramUrl, whatsappUrl } from '../lib/logic.js';
import { profileLabel } from './BenefitsScreen.jsx';
import BackLink from './BackLink.jsx';

export default function HelpScreen({ data, profile, route }) {
  const { t } = useT();
  const [text, setText] = useState('');
  const [copied, setCopied] = useState(false);
  const topicId = route.query.get('topic');
  const topic = data.benefits.find((b) => b.id === topicId);

  const lines = [t('help.messageIntro')];
  if (topic) lines.push(t('help.messageTopic', { topic: topic.title }));
  if (profile?.group) lines.push(profileLabel(t, profile));
  if (text.trim()) lines.push(text.trim());
  const message = lines.join('\n');

  const wa = whatsappUrl(data.config.operator?.whatsappNumber, message);
  const tg = telegramUrl(data.config.operator?.telegramUsername);

  async function copyForTelegram() {
    try {
      await navigator.clipboard.writeText(message);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  const backTo = topic ? href('guide', topic.id) : profile?.group ? href('benefits') : href('year');

  return (
    <>
      <BackLink to={backTo} />
      <h1 tabIndex={-1}>{t('help.title')}</h1>
      <p className="lead">{t('help.lead')}</p>
      <div className="field">
        <label htmlFor="help-text">{t('help.label')}</label>
        <textarea
          id="help-text"
          rows={4}
          placeholder={t('help.placeholder')}
          value={text}
          onChange={(e) => setText(e.target.value)}
          aria-describedby="help-privacy"
        />
        <p id="help-privacy" className="note">{t('help.privacy')}</p>
      </div>

      {wa || tg ? (
        <div className="stack">
          {wa && (
            <a className="btn btn-primary" href={wa} target="_blank" rel="noopener noreferrer">
              {t('help.whatsapp')}<span className="visually-hidden"> {t('guide.externalHint')}</span>
            </a>
          )}
          {tg && (
            <>
              <a className="btn btn-secondary" href={tg} target="_blank" rel="noopener noreferrer" onClick={copyForTelegram} aria-describedby="tg-hint">
                {t('help.telegram')}<span className="visually-hidden"> {t('guide.externalHint')}</span>
              </a>
              <p id="tg-hint" className="note" aria-live="polite">{copied ? t('help.copied') : t('help.telegramHint')}</p>
            </>
          )}
        </div>
      ) : (
        <p className="notice" role="status">{t('help.notConfigured')}</p>
      )}
    </>
  );
}
