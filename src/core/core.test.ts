import { describe, expect, it } from 'vitest';
import { addCategory, addChannel, emptyData, mergeData, migrate, removeCategory } from './data';
import { Matcher } from './matcher';
import { normName, slugify } from './normalize';

describe('normalize', () => {
  it('names', () => {
    expect(normName('  Slots &amp;  Casino ')).toBe('slots & casino');
    expect(slugify('Just Chatting')).toBe('just-chatting');
  });
});

describe('data', () => {
  it('channel login is case-insensitive and shared by both platforms', () => {
    const d = emptyData();
    addChannel(d, 'XQC', 'xQc');
    expect(Object.keys(d.channels)).toEqual(['xqc']);
    expect(d.channels.xqc?.on).toEqual({ twitch: true, kick: true });
    const m = new Matcher(d, 'kick');
    expect(m.channel('xQc')).toBe(true);
  });

  it('per-platform switch', () => {
    const d = emptyData();
    addChannel(d, 'sigma');
    if (d.channels.sigma) d.channels.sigma.on.kick = false;
    expect(new Matcher(d, 'twitch').channel('sigma')).toBe(true);
    expect(new Matcher(d, 'kick').channel('sigma')).toBe(false);
  });

  it('platform disabled globally hides nothing', () => {
    const d = emptyData();
    addChannel(d, 'a');
    d.settings.enabled.twitch = false;
    expect(new Matcher(d, 'twitch').channel('a')).toBe(false);
  });

  it('category matches by slug or by name (sidebar has only the name)', () => {
    const d = emptyData();
    addCategory(d, { slug: 'just-chatting', name: 'Just Chatting' }, 'twitch');
    const m = new Matcher(d, 'twitch');
    expect(m.category({ slug: 'JUST-CHATTING' })).toBe(true);
    expect(m.category({ name: 'just  chatting' })).toBe(true);
    expect(m.category({ name: 'IRL' })).toBe(false);
    // Kick has no own slug yet -> falls back to the Twitch one
    expect(new Matcher(d, 'kick').category({ slug: 'just-chatting' })).toBe(true);
  });

  it('loose name match for Kick tiles: "(GTA)" suffix, slug from name', () => {
    const d = emptyData();
    addCategory(d, { slug: 'grand-theft-auto-v', name: 'Grand Theft Auto V' }, 'kick');
    const m = new Matcher(d, 'kick');
    expect(m.category({ name: 'Grand Theft Auto V (GTA)' })).toBe(true);
    const d2 = emptyData();
    addCategory(d2, { slug: 'just-chatting', name: 'Rozmowy' }, 'kick');
    expect(new Matcher(d2, 'kick').category({ name: 'Just Chatting' })).toBe(true);
  });

  it('adding by slug merges into an existing category', () => {
    const d = emptyData();
    addCategory(d, { name: 'IRL' });
    addCategory(d, { slug: 'irl', name: 'IRL' }, 'kick');
    expect(Object.keys(d.categories)).toEqual(['irl']);
    removeCategory(d, { slug: 'irl' });
    expect(Object.keys(d.categories)).toEqual([]);
  });

  it('migrate keeps a valid hiddenTiles mode and defaults to placeholder', () => {
    expect(migrate({ settings: { hiddenTiles: 'placeholder' } }).settings.hiddenTiles).toBe('placeholder');
    expect(migrate({ settings: { hiddenTiles: 'bogus' } }).settings.hiddenTiles).toBe('placeholder');
    expect(migrate(undefined).settings.hiddenTiles).toBe('placeholder');
  });

  it('migrate survives garbage and keeps valid entries', () => {
    expect(migrate(null).channels).toEqual({});
    const d = migrate({
      channels: { a: { login: 'Abc', on: { kick: false } }, bad: 5 },
      categories: { x: { name: 'Music', slugs: { twitch: 'Music' } } },
      settings: { lang: 'xx', hideSidebarRecommended: true },
    });
    expect(d.channels.abc?.on).toEqual({ twitch: true, kick: false });
    expect(d.categories.music?.slugs.twitch).toBe('music');
    expect(d.settings.lang).toBe('auto');
    expect(d.settings.sections).toEqual({
      carousel: false,
      sidebarChannels: true,
      sidebarCategories: true,
      sidebarSimilar: true,
    });
  });

  it('merge is a union', () => {
    const a = emptyData();
    addChannel(a, 'one');
    const b = emptyData();
    addChannel(b, 'two');
    expect(Object.keys(mergeData(a, b).channels).sort()).toEqual(['one', 'two']);
  });

  it('matcher is fast for 10k channels', () => {
    const d = emptyData();
    for (let i = 0; i < 10_000; i++) addChannel(d, `user_${i}`);
    const t0 = performance.now();
    const m = new Matcher(d, 'twitch');
    let hits = 0;
    for (let i = 0; i < 10_000; i++) if (m.channel(`USER_${i}`)) hits++;
    expect(hits).toBe(10_000);
    expect(performance.now() - t0).toBeLessThan(200);
  });
});
