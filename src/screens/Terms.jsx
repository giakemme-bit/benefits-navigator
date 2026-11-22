import { termsIn } from '../lib/logic.js';

// Shows what abbreviations mean, e.g. «ГСП — государственное социальное пособие».
export default function Terms({ texts, glossary, className = 'terms' }) {
  const found = termsIn(texts, glossary);
  if (!found.length) return null;
  return (
    <dl className={className}>
      {found.map(([term, meaning]) => (
        <div key={term}>
          <dt>{term}</dt>
          <dd>{meaning}</dd>
        </div>
      ))}
    </dl>
  );
}
