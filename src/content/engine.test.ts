import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { fakeBrowser } from 'wxt/testing/fake-browser';
import { emptyData } from '../core/data';
import { load, save, update } from '../core/store';
import { twitch } from '../platforms/twitch/adapter';
import { startEngine } from './engine';

const CARD = `
<div data-test-selector="shelf-card-selector" id="shelf"><div><article>
  <a data-a-target="preview-card-image-link" href="/kanal_alfa"><img></a>
  <div data-a-target="preview-card-channel-link"><div><p title="Kanal_Alfa">Kanal_Alfa</p></div></div>
  <a data-a-target="preview-card-game-link" href="/directory/category/just-chatting">Just Chatting</a>
</article></div></div>`;

let invalidate = () => {};
const tick = (ms = 300) => new Promise((r) => setTimeout(r, ms));

function fakeCtx() {
  return {
    addEventListener: (t: EventTarget, type: string, fn: EventListener, o?: AddEventListenerOptions) =>
      t.addEventListener(type, fn, o),
    onInvalidated: (fn: () => void) => {
      invalidate = fn;
    },
    isValid: true,
    setTimeout: (fn: () => void, ms: number) => setTimeout(fn, ms) as unknown as number,
  } as never;
}

describe('engine', () => {
  beforeEach(() => {
    fakeBrowser.reset();
    document.body.innerHTML = CARD;
  });
  // Each test starts its own engine; stop it so engines don't fight over the shared document.
  afterEach(() => invalidate());

  it('X on a tile opens the menu and hiding a channel stores it', async () => {
    await save(emptyData());
    startEngine(twitch, fakeCtx());
    await tick();
    const x = document.querySelector<HTMLButtonElement>('.hc-x');
    expect(x).not.toBeNull();
    x?.click();
    const items = document.querySelectorAll<HTMLButtonElement>('.hc-menu button');
    expect(items.length).toBe(2);
    items[0]?.click();
    await tick();
    expect(Object.keys((await load()).channels)).toContain('kanal_alfa');
  });

  it('switching the platform off removes every control and mark', async () => {
    await save(emptyData());
    startEngine(twitch, fakeCtx());
    await tick();
    expect(document.querySelector('.hc-x')).not.toBeNull();
    await update((d) => {
      d.settings.enabled.twitch = false;
    });
    await tick();
    expect(document.querySelector('.hc-x, [data-hc-item]')).toBeNull();
  });

  it('cleanup finishes even when browser.storage is already gone', async () => {
    await save(emptyData());
    startEngine(twitch, fakeCtx());
    await tick();
    const off = fakeBrowser.storage.onChanged.removeListener;
    fakeBrowser.storage.onChanged.removeListener = () => {
      throw new Error('Extension context invalidated');
    };
    try {
      invalidate();
    } finally {
      fakeBrowser.storage.onChanged.removeListener = off;
    }
    expect(document.querySelector('.hc-x, [data-hc-item], #hc-style')).toBeNull();
  });

  it('chat messages do not trigger rescans of the page', async () => {
    await save(emptyData());
    let scans = 0;
    const counting = {
      ...twitch,
      items: (doc: Document) => {
        scans++;
        return twitch.items(doc);
      },
    };
    document.body.insertAdjacentHTML('beforeend', '<div role="log" id="chat"></div>');
    startEngine(counting, fakeCtx());
    await tick();
    const before = scans;
    const chat = document.getElementById('chat') as HTMLElement;
    for (let i = 0; i < 20; i++) chat.append(document.createElement('div'));
    await tick();
    expect(scans).toBe(before);
    document.body.insertAdjacentHTML('beforeend', CARD.replace(/kanal_alfa/g, 'nowy'));
    await tick();
    expect(scans).toBeGreaterThan(before);
  });

  it('removes its controls when the extension context is invalidated', async () => {
    await save(emptyData());
    startEngine(twitch, fakeCtx());
    await tick();
    expect(document.querySelector('.hc-x')).not.toBeNull();
    invalidate();
    expect(document.querySelector('.hc-x, [data-hc-item]')).toBeNull();
  });

  it('placeholder mode keeps the tile with a neutral label', async () => {
    const d = emptyData();
    d.channels.kanal_alfa = { login: 'kanal_alfa', on: { twitch: true, kick: true }, addedAt: 1 } as never;
    d.settings.hiddenTiles = 'placeholder';
    d.settings.lang = 'pl';
    await save(d);
    startEngine(twitch, fakeCtx());
    await tick();
    const tile = document.querySelector('[data-hc-ph]');
    expect(tile).not.toBeNull();
    expect(tile?.hasAttribute('data-hc-hidden')).toBe(false);
    expect(tile?.querySelector('.hc-ph span')?.textContent).toBe('Kanał ukryty');
    // "Change this" is offered until it is used once, then disappears everywhere
    const btn = tile?.querySelector<HTMLButtonElement>('.hc-ph button');
    expect(btn?.textContent).toBe('Możesz to zmienić →');
    btn?.click();
    await tick();
    expect((await load()).settings.phHintDone).toBe(true);
    expect(document.querySelector('.hc-ph button')).toBeNull();
    expect(document.querySelector('[data-hc-ph]')).not.toBeNull();
  });

  const many = (n: number) => {
    const d = emptyData();
    d.settings.lang = 'pl';
    let html = '';
    for (let i = 0; i < n; i++) {
      d.channels[`k${i}`] = { login: `k${i}`, on: { twitch: true, kick: true }, addedAt: 1 } as never;
      html += CARD.replace(/kanal_alfa/gi, `k${i}`).replace('id="shelf"', '');
    }
    document.body.innerHTML = html;
    return d;
  };

  it('remove mode: after many removals the rest become explained placeholders', async () => {
    const d = many(30);
    d.settings.hiddenTiles = 'remove';
    await save(d);
    startEngine(twitch, fakeCtx());
    await tick();
    expect(document.querySelectorAll('[data-hc-hidden]').length).toBe(24);
    const ph = document.querySelectorAll('[data-hc-ph]');
    expect(ph.length).toBe(6);
    expect(ph[0]?.querySelector('.hc-ph button')?.textContent).toBe('Dlaczego to widzę?');
  });

  it('removeAlways mode never shows placeholders', async () => {
    const d = many(30);
    d.settings.hiddenTiles = 'removeAlways';
    await save(d);
    startEngine(twitch, fakeCtx());
    await tick();
    expect(document.querySelectorAll('[data-hc-hidden]').length).toBe(30);
    expect(document.querySelector('[data-hc-ph]')).toBeNull();
  });
});
