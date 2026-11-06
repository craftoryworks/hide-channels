import { type Compiled, compile } from '../locales/format';
import { bcp47, type Lang, type LangSetting, resolveLang } from '../locales/langs';
import en from '../locales/ui/en';

const catalogs = import.meta.glob<unknown>('../locales/ui/*.json', { eager: true, import: 'default' });

export type UiDict = Compiled<typeof en>;

const cache = new Map<Lang, UiDict>();

/** Popup and settings texts in the user's language (English when unsupported). */
export function ui(setting: LangSetting = 'auto'): UiDict {
  const lang = resolveLang(setting);
  let d = cache.get(lang);
  if (!d) {
    d = compile(en, catalogs[`../locales/ui/${lang}.json`], bcp47(lang));
    cache.set(lang, d);
  }
  if (typeof document !== 'undefined') document.documentElement.lang = bcp47(lang);
  return d;
}
