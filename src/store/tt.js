import { writable } from 'svelte/store';
import { pathOr } from '../utils/common';
import i18n from '../translation/i18n.json';

export const LANGUAGE_LIST = ['en', 'be', 'de', 'fil', 'it', 'ru', 'pl', 'pt',];

const initialLang = (LANGUAGE_LIST.indexOf(localStorage.getItem('lang')) !== -1) ? localStorage.getItem('lang') : 'en';

export const translations = writable({
  tt: i18n[initialLang],
  language: initialLang
});

export function tt(ttObj, path, def) {
  return pathOr(ttObj.tt, path, def || path);
};

export function setLanguage(lang = 'en') {
  if (LANGUAGE_LIST.indexOf(lang) !== -1) {
    localStorage.setItem('lang', lang);
    translations.set({ tt: i18n[lang], language: lang });
  }
}
