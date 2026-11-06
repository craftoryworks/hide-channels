/**
 * Message catalogs: English (`en.ts`, `as const`) is the source of truth; every other language is a
 * JSON file with the same shape. Strings use positional placeholders `{0}`, `{1}`. A plural is an
 * object keyed by Intl.PluralRules categories (`one`, `few`, `many`, `other`, …) whose texts use
 * `{0}` for the count. `compile()` turns a catalog into a ready-to-use dictionary: plain strings stay
 * strings, strings with placeholders and plurals become functions.
 */

export type Plural = { readonly other: string } & { readonly [cat: string]: string };
export type Raw = string | readonly string[] | { readonly [k: string]: Raw };

type Fn = (...args: (string | number)[]) => string;
export type Compiled<S> = S extends string
  ? S extends `${string}{0}${string}`
    ? Fn
    : string
  : S extends readonly string[]
    ? readonly string[]
    : S extends { readonly other: string }
      ? (n: number) => string
      : { readonly [K in keyof S]: Compiled<S[K]> };

export const isPlural = (v: unknown): v is Plural =>
  typeof v === 'object' && v !== null && !Array.isArray(v) && typeof (v as Plural).other === 'string';

export function fill(s: string, args: readonly (string | number)[]): string {
  return s.replace(/\{(\d)\}/g, (m, i: string) => {
    const v = args[Number(i)];
    return v === undefined ? m : String(v);
  });
}

/** Builds the dictionary for `lang` from its catalog, falling back to English key by key. */
export function compile<S extends Raw>(source: S, raw: unknown, lang: string): Compiled<S> {
  const rules = new Intl.PluralRules(lang);
  const nf = new Intl.NumberFormat(lang);
  const walk = (src: unknown, own: unknown): unknown => {
    if (typeof src === 'string') {
      const s = typeof own === 'string' && own ? own : src;
      return s.includes('{0}') ? (...a: (string | number)[]) => fill(s, a) : s;
    }
    if (Array.isArray(src))
      return Array.isArray(own) && own.length === src.length && own.every((x) => typeof x === 'string' && x)
        ? own
        : src;
    if (isPlural(src)) {
      const p = isPlural(own) ? own : src;
      const fb = isPlural(own) ? src : undefined;
      return (n: number) => {
        const cat = (isPlural(own) ? rules : new Intl.PluralRules('en')).select(n);
        const s = p[cat] ?? p.other ?? fb?.other ?? '';
        return fill(s, [nf.format(n)]);
      };
    }
    const out: Record<string, unknown> = {};
    const o = (typeof own === 'object' && own !== null ? own : {}) as Record<string, unknown>;
    for (const [k, v] of Object.entries(src as Record<string, unknown>)) out[k] = walk(v, o[k]);
    return out;
  };
  return walk(source, raw) as Compiled<S>;
}
