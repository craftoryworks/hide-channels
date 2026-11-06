import { describe, expect, it } from 'vitest';
import { fakeBrowser } from 'wxt/testing/fake-browser';
import { loginFromInput } from '../ui/input';
import {
  addCategory,
  addChannel,
  emptyData,
  findCategory,
  MAX_NAME,
  mergeData,
  migrate,
  removeCategory,
} from './data';
import { Matcher } from './matcher';
import { load, save, update } from './store';

describe('names that collide with Object.prototype', () => {
  it('"constructor" and "__proto__" are ordinary channels and categories', () => {
    const d = emptyData();
    expect(addChannel(d, 'constructor')?.login).toBe('constructor');
    expect(addChannel(d, '__proto__')?.login).toBe('__proto__');
    expect(addCategory(d, { name: 'Constructor' }, 'twitch')?.name).toBe('Constructor');
    expect(({} as Record<string, unknown>).on).toBeUndefined(); // nothing leaked into Object.prototype
    const m = new Matcher(migrate(JSON.parse(JSON.stringify(d))), 'twitch');
    expect(m.channel('constructor')).toBe(true);
    expect(m.channel('__proto__')).toBe(true);
    expect(m.category({ name: 'Constructor' })).toBe(true);
    expect(m.channel('toString')).toBe(false);
  });
});

describe('findCategory agrees with the matcher', () => {
  it('a Kick tile "Grand Theft Auto V (GTA)" without a link finds the stored entry', () => {
    const d = emptyData();
    addCategory(d, { name: 'Grand Theft Auto V', slug: 'grand-theft-auto-v' }, 'twitch');
    const tile = { name: 'Grand Theft Auto V (GTA)' };
    expect(new Matcher(d, 'kick').category(tile)).toBe(true);
    expect(findCategory(d, tile)?.name).toBe('Grand Theft Auto V');
    addCategory(d, tile, 'kick'); // hiding it again must not create a duplicate
    expect(Object.keys(d.categories)).toHaveLength(1);
    removeCategory(d, tile); // "Undo" on that tile works
    expect(Object.keys(d.categories)).toHaveLength(0);
  });

  it('a name made only of brackets matches nothing', () => {
    const d = emptyData();
    addCategory(d, { name: '(beta)' }, 'twitch');
    expect(new Matcher(d, 'twitch').category({ name: '(other)' })).toBe(false);
  });
});

describe('limits', () => {
  it('long names from pages or files are clipped, absurd logins dropped', () => {
    const d = emptyData();
    expect(addChannel(d, 'x'.repeat(500))).toBeUndefined();
    expect(addChannel(d, 'ok', 'N'.repeat(500))?.displayName).toHaveLength(MAX_NAME);
    expect(addCategory(d, { name: 'C'.repeat(500) })?.name).toHaveLength(MAX_NAME);
  });
});

describe('store', () => {
  it('concurrent updates from one page do not overwrite each other', async () => {
    fakeBrowser.reset();
    await save(emptyData());
    await Promise.all(Array.from({ length: 20 }, (_, i) => update((d) => addChannel(d, `k${i}`))));
    expect(Object.keys((await load()).channels)).toHaveLength(20);
  });
});

describe('import', () => {
  it('importing the same file twice adds nothing the second time', () => {
    const mine = emptyData();
    addChannel(mine, 'own');
    const file = emptyData();
    addChannel(file, 'xqc', 'xQc');
    addCategory(file, { name: 'Just Chatting', slug: 'just-chatting' }, 'twitch');
    const json = JSON.parse(JSON.stringify(file));
    const once = mergeData(mine, migrate(json));
    const twice = mergeData(once, migrate(json));
    expect(Object.keys(twice.channels).sort()).toEqual(['own', 'xqc']);
    expect(Object.keys(twice.categories)).toEqual(['just chatting']);
  });
});

describe('popup input', () => {
  it('accepts names and links, rejects anything else', () => {
    expect(loginFromInput('xQc')).toBe('xqc');
    expect(loginFromInput('@xqc')).toBe('xqc');
    expect(loginFromInput('kick.com/foo_bar')).toBe('foo_bar');
    expect(loginFromInput('https://www.twitch.tv/xqc/videos?x=1')).toBe('xqc');
    expect(loginFromInput('kick.com')).toBeUndefined();
    expect(loginFromInput('two words')).toBeUndefined();
    expect(loginFromInput('m.twitch.tv/xqc')).toBe('xqc');
    expect(loginFromInput('twitch.tv/directory')).toBeUndefined();
    expect(loginFromInput('example.com/xqc')).toBeUndefined();
  });
});

describe('category slugs', () => {
  it('a slug guessed from a name never overwrites a real one', () => {
    const d = emptyData();
    addCategory(d, { name: 'Pokémon Legends', slug: 'pokemon-legends' }, 'twitch');
    addCategory(d, { name: 'Pokémon Legends' }, 'twitch');
    expect(Object.values(d.categories)[0]?.slugs.twitch).toBe('pokemon-legends');
  });
});
