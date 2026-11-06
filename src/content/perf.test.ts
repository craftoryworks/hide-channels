import { afterEach, describe, expect, it } from 'vitest';
import { fakeBrowser } from 'wxt/testing/fake-browser';
import { addCategory, addChannel, emptyData, migrate } from '../core/data';
import { Matcher } from '../core/matcher';
import { save } from '../core/store';
import { twitch } from '../platforms/twitch/adapter';
import { startEngine } from './engine';

// Stress test: a user with a huge block list on a long, infinitely scrolled page.
const CHANNELS = 20_000;
const CATEGORIES = 3_000;
const TILES = 1_000;

function bigData() {
  const d = emptyData();
  for (let i = 0; i < CHANNELS; i++) addChannel(d, `kanal_${i}`, `Kanal_${i}`);
  for (let i = 0; i < CATEGORIES; i++) addCategory(d, { slug: `kat-${i}`, name: `Kategoria ${i}` }, 'twitch');
  return d;
}

function page() {
  let html = '';
  for (let i = 0; i < TILES; i++) {
    // every second tile belongs to a hidden channel, every fifth to a hidden category
    const login = i % 2 ? `kanal_${i * 7}` : `wolny_${i}`;
    const cat = i % 5 ? 'just-chatting' : `kat-${i}`;
    html += `<div data-test-selector="shelf-card-selector"><div><article>
      <a data-a-target="preview-card-image-link" href="/${login}"><img></a>
      <div data-a-target="preview-card-channel-link"><div><p title="${login}">${login}</p></div></div>
      <a data-a-target="preview-card-game-link" href="/directory/category/${cat}">${cat}</a>
    </article></div></div>`;
  }
  return html;
}

let invalidate = () => {};
const ctx = {
  addEventListener: (t: EventTarget, type: string, fn: EventListener, o?: AddEventListenerOptions) =>
    t.addEventListener(type, fn, o),
  onInvalidated: (fn: () => void) => {
    invalidate = fn;
  },
  isValid: true,
  setTimeout: (fn: () => void, ms: number) => setTimeout(fn, ms) as unknown as number,
} as never;

const time = (fn: () => void) => {
  const t0 = performance.now();
  fn();
  return performance.now() - t0;
};

describe('performance with a huge list', () => {
  afterEach(() => invalidate());

  it('data, storage size and matcher stay cheap', () => {
    const d = bigData();
    const json = JSON.stringify(d);
    // chrome.storage.local allows 10 MB without the unlimitedStorage permission
    expect(json.length).toBeLessThan(5_000_000);
    expect(time(() => migrate(JSON.parse(json)))).toBeLessThan(500);
    let m!: Matcher;
    expect(time(() => (m = new Matcher(d, 'twitch')))).toBeLessThan(200);
    const lookups = time(() => {
      for (let i = 0; i < 100_000; i++) m.channel(`kanal_${i}`);
    });
    expect(lookups).toBeLessThan(200);
  });

  it('scanning 1000 tiles is fast, and a rescan with no changes is cheaper', async () => {
    fakeBrowser.reset();
    await save(bigData());
    document.body.innerHTML = page();
    const engine = startEngine(twitch, ctx);
    await new Promise((r) => setTimeout(r, 400));
    const first = time(() => engine.scan());
    const again = time(() => engine.scan());
    const hidden = document.querySelectorAll('[data-hc-hidden], [data-hc-ph]').length;
    console.log(
      `scan ${TILES} tiles: ${first.toFixed(0)} ms, rescan ${again.toFixed(0)} ms, hidden ${hidden}`,
    );
    expect(hidden).toBeGreaterThan(TILES / 2);
    // happy-dom is several times slower than Chrome; these are generous ceilings
    expect(again).toBeLessThan(1500);
  });
});
