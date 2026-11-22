import { useEffect, useState } from 'react';

// Hash routes work on any static host (GitHub Pages included) with no rewrites.
function parse() {
  const path = window.location.hash.replace(/^#/, '') || '/';
  const [pathname, query = ''] = path.split('?');
  const parts = pathname.split('/').filter(Boolean);
  return { name: parts[0] || 'year', param: parts[1] ? decodeURIComponent(parts[1]) : '', query: new URLSearchParams(query) };
}

export function useRoute() {
  const [route, setRoute] = useState(parse);
  useEffect(() => {
    const onChange = () => setRoute(parse());
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  }, []);
  return route;
}

export function href(name, param, query) {
  let h = `#/${name === 'year' ? '' : name}`;
  if (param) h += `/${encodeURIComponent(param)}`;
  if (query) h += `?${new URLSearchParams(query)}`;
  return h;
}

export function navigate(name, param, query) {
  window.location.hash = href(name, param, query);
}
