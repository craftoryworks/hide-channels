/** UI languages. A language we don't support (including Russian) falls back to English. */
export const LANGS = ['en', 'pl', 'es', 'pt_BR', 'de', 'fr', 'it', 'tr', 'uk'] as const;
export type Lang = (typeof LANGS)[number];
export type LangSetting = 'auto' | Lang;

/** Shown in the language picker, each in its own language. */
export const LANG_NAMES: Record<Lang, string> = {
  en: 'English',
  pl: 'Polski',
  es: 'Español',
  pt_BR: 'Português (Brasil)',
  de: 'Deutsch',
  fr: 'Français',
  it: 'Italiano',
  tr: 'Türkçe',
  uk: 'Українська',
};

export const isLangSetting = (v: unknown): v is LangSetting =>
  v === 'auto' || (LANGS as readonly unknown[]).includes(v);

/** Maps a BCP 47 tag (navigator.language) to a supported language, or undefined. */
export function matchLang(tag: string): Lang | undefined {
  const base = tag.toLowerCase().split(/[-_]/)[0];
  if (base === 'pt') return 'pt_BR'; // one Portuguese catalog, written for Brazil
  return LANGS.find((l) => l === base);
}

/**
 * "auto" looks only at the browser's main language: supported → that language, otherwise English.
 * We deliberately don't walk the secondary languages (a Russian browser must not end up in Ukrainian).
 */
export function resolveLang(setting: LangSetting | undefined, browserLang?: string): Lang {
  if (setting && setting !== 'auto') return setting;
  return matchLang(browserLang ?? globalThis.navigator?.language ?? 'en') ?? 'en';
}

/** BCP 47 form of a catalog code, for Intl APIs and the `lang` attribute. */
export const bcp47 = (l: Lang) => l.replace('_', '-');
