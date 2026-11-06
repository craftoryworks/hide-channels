import { describe, expect, it } from 'vitest';
import contentEn from './content/en';
import { compile, isPlural } from './format';
import { bcp47, LANGS, type Lang, resolveLang } from './langs';
import uiEn from './ui/en';

const catalogs = {
  content: import.meta.glob<unknown>('./content/*.json', { eager: true, import: 'default' }),
  ui: import.meta.glob<unknown>('./ui/*.json', { eager: true, import: 'default' }),
};
const sources = { content: contentEn, ui: uiEn };
const placeholders = (s: string) => [...new Set(s.match(/\{\d\}/g) ?? [])].sort();

/** Every difference between a catalog and the English source, as readable messages. */
function problems(src: unknown, own: unknown, lang: Lang, path = ''): string[] {
  if (typeof src === 'string') {
    if (typeof own !== 'string' || !own.trim()) return [`${path}: missing`];
    const a = placeholders(src).join();
    const b = placeholders(own).join();
    return a === b ? [] : [`${path}: placeholders ${b || 'none'} ≠ ${a}`];
  }
  if (Array.isArray(src)) {
    if (!Array.isArray(own) || own.length !== src.length) return [`${path}: needs ${src.length} parts`];
    return src.flatMap((s, i) => problems(s, own[i], lang, `${path}[${i}]`));
  }
  if (isPlural(src)) {
    if (!isPlural(own)) return [`${path}: plural object missing`];
    const need = new Intl.PluralRules(bcp47(lang)).resolvedOptions().pluralCategories;
    return [
      ...need.filter((c) => !own[c]?.includes('{0}')).map((c) => `${path}.${c}: missing or without {0}`),
      ...Object.keys(own)
        .filter((c) => !(need as string[]).includes(c))
        .map((c) => `${path}.${c}: not a plural form of ${lang}`),
    ];
  }
  const s = src as Record<string, unknown>;
  const o = (own ?? {}) as Record<string, unknown>;
  return [
    ...Object.keys(s).flatMap((k) => problems(s[k], o[k], lang, path ? `${path}.${k}` : k)),
    ...Object.keys(o)
      .filter((k) => !(k in s))
      .map((k) => `${path ? `${path}.` : ''}${k}: unused key`),
  ];
}

describe('translations', () => {
  for (const ns of ['content', 'ui'] as const)
    for (const lang of LANGS.filter((l) => l !== 'en'))
      it(`${ns}/${lang} is complete and matches the English source`, () => {
        const raw = catalogs[ns][`./${ns}/${lang}.json`];
        expect(raw, `${ns}/${lang}.json does not exist`).toBeDefined();
        expect(problems(sources[ns], raw, lang)).toEqual([]);
      });

  it('no catalog without a declared language', () => {
    for (const ns of ['content', 'ui'] as const)
      for (const file of Object.keys(catalogs[ns])) {
        const code = file.split('/').pop()?.replace('.json', '');
        expect(LANGS as readonly string[]).toContain(code);
      }
  });

  it('plurals and placeholders format correctly', () => {
    const pl = compile(uiEn, catalogs.ui['./ui/pl.json'], 'pl');
    expect(pl.importOk(pl.importChannels(1), pl.importCategories(5))).toBe(
      'Zaimportowano: 1 kanał, 5 kategorii.',
    );
    expect(pl.importChannels(3)).toBe('3 kanały');
    const en = compile(uiEn, undefined, 'en');
    expect(en.importChannels(1)).toBe('1 channel');
    expect(en.addHint('xqc')).toBe('Enter: add "xqc"');
  });

  it('auto language: supported → itself, anything else (incl. Russian) → English', () => {
    expect(resolveLang('auto', 'pl-PL')).toBe('pl');
    expect(resolveLang('auto', 'pt-PT')).toBe('pt_BR');
    expect(resolveLang('auto', 'es-AR')).toBe('es');
    expect(resolveLang('auto', 'uk-UA')).toBe('uk');
    expect(resolveLang('auto', 'ru-RU')).toBe('en');
    expect(resolveLang('auto', 'ja')).toBe('en');
    expect(resolveLang('de', 'ru-RU')).toBe('de');
  });
});
