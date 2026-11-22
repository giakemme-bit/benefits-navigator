import { useT } from '../lib/i18n.jsx';

export default function BackLink({ to }) {
  const { t } = useT();
  return (
    <a className="back-link" href={to}>
      <span aria-hidden="true">←</span> {t('common.back')}
    </a>
  );
}
