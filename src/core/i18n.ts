import en from '../locales/content/en';
import { type Compiled, compile } from '../locales/format';
import { bcp47, type LangSetting, resolveLang } from '../locales/langs';

const catalogs = import.meta.glob<unknown>('../locales/content/*.json', { eager: true, import: 'default' });

export type Dict = Compiled<typeof en>;

const cache = new Map<string, Dict>();

/** Texts injected into Twitch/Kick pages, in the user's language (English when unsupported). */
export function dict(setting: LangSetting = 'auto'): Dict {
  const lang = resolveLang(setting);
  let d = cache.get(lang);
  if (!d) {
    d = compile(en, catalogs[`../locales/content/${lang}.json`], bcp47(lang));
    cache.set(lang, d);
  }
  return d;
}
