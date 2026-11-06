import { isLangSetting } from '../locales/langs';
import { baseName, normLogin, normName, normSlug, slugify } from './normalize';
import {
  type CategoryEntry,
  type ChannelEntry,
  type Data,
  type Platform,
  type PlatformFlags,
  SECTIONS,
  type SectionId,
  type Settings,
} from './types';

export const allOn = (): PlatformFlags => ({ twitch: true, kick: true });

export function defaultSettings(): Settings {
  return {
    enabled: allOn(),
    sections: noSections(),
    fillFollowed: true,
    hiddenTiles: 'placeholder',
    phHintDone: false,
    lang: 'auto',
  };
}

export function noSections(): Record<SectionId, boolean> {
  return { carousel: false, sidebarChannels: false, sidebarCategories: false, sidebarSimilar: false };
}

/** Empty map without a prototype: keys like "constructor" or "__proto__" are plain keys here. */
export const emptyMap = <T>(): Record<string, T> => Object.create(null) as Record<string, T>;

export function emptyData(): Data {
  return { v: 1, channels: emptyMap(), categories: emptyMap(), settings: defaultSettings() };
}

/** Upper bound for names taken from pages or imported files. */
export const MAX_NAME = 100;
/** Twitch logins: letters, digits, "_"; Kick slugs also allow "-". */
export const isLogin = (s: string) => /^[a-z0-9_-]{1,50}$/.test(s);
const clip = (s: string) => s.trim().slice(0, MAX_NAME);

const isObj = (x: unknown): x is Record<string, unknown> =>
  typeof x === 'object' && x !== null && !Array.isArray(x);

function flags(x: unknown): PlatformFlags {
  const f = allOn();
  if (isObj(x)) {
    if (typeof x.twitch === 'boolean') f.twitch = x.twitch;
    if (typeof x.kick === 'boolean') f.kick = x.kick;
  }
  return f;
}

/** Turns anything (stored value, imported file) into valid Data. Never throws. */
export function migrate(raw: unknown): Data {
  const d = emptyData();
  if (!isObj(raw)) return d;
  if (isObj(raw.channels)) {
    for (const v of Object.values(raw.channels)) {
      if (!isObj(v) || typeof v.login !== 'string') continue;
      const login = normLogin(v.login);
      if (!isLogin(login)) continue;
      d.channels[login] = {
        login,
        displayName: typeof v.displayName === 'string' ? clip(v.displayName) || undefined : undefined,
        on: flags(v.on),
        addedAt: typeof v.addedAt === 'number' ? v.addedAt : Date.now(),
      };
    }
  }
  if (isObj(raw.categories)) {
    for (const v of Object.values(raw.categories)) {
      if (!isObj(v) || typeof v.name !== 'string') continue;
      const name = clip(v.name);
      const key = normName(name);
      if (!key) continue;
      const slugs: CategoryEntry['slugs'] = {};
      if (isObj(v.slugs)) {
        for (const p of ['twitch', 'kick'] as const) {
          const s = v.slugs[p];
          if (typeof s === 'string' && s) slugs[p] = normSlug(s).slice(0, MAX_NAME);
        }
      }
      d.categories[key] = {
        key,
        name,
        slugs,
        on: flags(v.on),
        addedAt: typeof v.addedAt === 'number' ? v.addedAt : Date.now(),
      };
    }
  }
  if (isObj(raw.settings)) {
    const s = raw.settings;
    d.settings.enabled = flags(s.enabled);
    if (isObj(s.sections))
      for (const id of SECTIONS)
        if (typeof s.sections[id] === 'boolean') d.settings.sections[id] = s.sections[id];
    // v0.1 had one switch for all sidebar recommendations
    if (s.hideSidebarRecommended === true && !isObj(s.sections)) {
      d.settings.sections.sidebarChannels = true;
      d.settings.sections.sidebarCategories = true;
      d.settings.sections.sidebarSimilar = true;
    }
    if (typeof s.fillFollowed === 'boolean') d.settings.fillFollowed = s.fillFollowed;
    if (s.hiddenTiles === 'remove' || s.hiddenTiles === 'placeholder' || s.hiddenTiles === 'removeAlways')
      d.settings.hiddenTiles = s.hiddenTiles;
    if (typeof s.phHintDone === 'boolean') d.settings.phHintDone = s.phHintDone;
    if (isLangSetting(s.lang)) d.settings.lang = s.lang;
  }
  return d;
}

/** Adds every entry of `from` to `into` (union). Entries from `from` win on conflicts. */
export function mergeInto(into: Data, from: Data): void {
  for (const c of Object.values(from.channels)) into.channels[c.login] = c;
  for (const c of Object.values(from.categories)) into.categories[c.key] = c;
}

/** Union of two lists as a new value. */
export function mergeData(a: Data, b: Data): Data {
  const out = migrate(a);
  mergeInto(out, b);
  return out;
}

export function addChannel(d: Data, login: string, displayName?: string): ChannelEntry | undefined {
  const key = normLogin(login);
  if (!isLogin(key)) return;
  const name = displayName ? clip(displayName) || undefined : undefined;
  const existing = d.channels[key];
  if (existing) {
    existing.on = allOn();
    existing.addedAt = Date.now();
    if (name) existing.displayName = name;
    return existing;
  }
  const e: ChannelEntry = { login: key, displayName: name, on: allOn(), addedAt: Date.now() };
  d.channels[key] = e;
  return e;
}

export function removeChannel(d: Data, login: string): void {
  delete d.channels[normLogin(login)];
}

export interface CategoryRef {
  name?: string;
  slug?: string;
}

/** Same rules as Matcher.category: exact name, slug, then loose name variants. */
export function findCategory(d: Data, ref: CategoryRef): CategoryEntry | undefined {
  if (ref.name) {
    const hit = d.categories[normName(ref.name)];
    if (hit) return hit;
  }
  const all = Object.values(d.categories);
  if (ref.slug) {
    const s = normSlug(ref.slug);
    const hit = all.find((c) => c.slugs.twitch === s || c.slugs.kick === s);
    if (hit) return hit;
  }
  if (!ref.name) return undefined;
  const base = baseName(ref.name);
  const slug = slugify(base);
  if (!base) return undefined;
  // Cheap comparisons first; baseName() only for stored names that actually have a "(...)" part.
  return all.find(
    (c) =>
      c.key === base ||
      c.slugs.twitch === slug ||
      c.slugs.kick === slug ||
      (c.name.includes('(') && baseName(c.name) === base),
  );
}

export function addCategory(d: Data, ref: CategoryRef, platform?: Platform): CategoryEntry | undefined {
  const name = clip(ref.name || ref.slug?.replace(/-/g, ' ') || '');
  const key = normName(name);
  if (!key) return;
  let e = findCategory(d, ref);
  if (!e) {
    e = { key, name, slugs: {}, on: allOn(), addedAt: Date.now() };
    d.categories[key] = e;
  } else {
    e.on = allOn();
    e.addedAt = Date.now();
  }
  const slug = (ref.slug ? normSlug(ref.slug) : slugify(name)).slice(0, MAX_NAME);
  if (platform) {
    if (ref.slug) e.slugs[platform] = slug;
    else e.slugs[platform] ??= slug;
  } else {
    e.slugs.twitch ??= slug;
    e.slugs.kick ??= slug;
  }
  return e;
}

export function removeCategory(d: Data, ref: CategoryRef): void {
  const e = findCategory(d, ref);
  if (e) delete d.categories[e.key];
}
