import { createContext, useContext } from 'react';
import { interpolate } from './logic.js';

export const I18nContext = createContext({ t: (k) => k, lang: 'ru' });

export function makeT(dict, fallback) {
  return (key, vars) => {
    const value = (dict && dict[key]) || (fallback && fallback[key]) || key;
    return interpolate(value, vars);
  };
}

export function useT() {
  return useContext(I18nContext);
}
