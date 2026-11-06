import { beforeEach, describe, expect, it } from 'vitest';
import { twitch } from './adapter';
import { categoryFromHref, loginFromHref } from './urls';

describe('twitch urls', () => {
  it('login', () => {
    expect(loginFromHref('/XQC')).toBe('xqc');
    expect(loginFromHref('/xqc/videos')).toBe('xqc');
    expect(loginFromHref('/videos/123')).toBeUndefined();
    expect(loginFromHref('/directory/all')).toBeUndefined();
    expect(loginFromHref('https://example.com/xqc')).toBeUndefined();
  });
  it('category', () => {
    expect(categoryFromHref('/directory/category/just-chatting')).toBe('just-chatting');
    expect(categoryFromHref('/directory/category/just-chatting/videos/all')).toBe('just-chatting');
    expect(categoryFromHref('/directory/all')).toBeUndefined();
  });
});

// Fixtures trimmed from live DOM (2026-11-05).
const SHELF = `
<div data-test-selector="shelf-card-selector" id="shelf"><div><article>
  <a data-a-target="preview-card-image-link" href="/kanal_alfa"><img></a>
  <button data-a-target="preview-card-title-link"><h4 title="Tytuł">Tytuł</h4></button>
  <div data-a-target="preview-card-channel-link"><div><p title="Kanal_Alfa">Kanal_Alfa</p><div>Zweryfikowane</div></div></div>
  <a data-a-target="preview-card-game-link" href="/directory/category/just-chatting">Just Chatting</a>
</article></div></div>`;

const DIRECTORY = `
<div data-target="" style="order: 3;" id="dir"><div class="directory-page__card-container"><article>
  <a data-a-target="preview-card-image-link" href="/kanal_beta"></a>
  <a data-a-target="preview-card-channel-link" href="/kanal_beta"><h4 title="t">t</h4><p title="Kanal_Beta">Kanal_Beta</p></a>
</article></div></div>
<div data-target="" style="order: 4;" id="cat"><div class="directory-page__card-container">
  <a data-a-target="tw-box-art-card-link" href="/directory/category/irl"></a><h2 title="IRL">IRL</h2>
</div></div>`;

const FOLLOWING = `
<div class="grid"><div id="fwrap"><div><div><article>
  <a data-a-target="preview-card-channel-link" href="/kanal_gamma"><h4 title="x">x</h4></a>
</article></div></div></div><div><div><div><article>
  <a data-a-target="preview-card-channel-link" href="/kanal_delta"></a>
</article></div></div></div></div>`;

const SIDEBAR = `
<div data-test-selector="side-nav" data-a-target="side-nav-bar"><nav id="side-nav"><div class="side-nav__scrollable_content">
  <div role="group" aria-label="Obserwowane kanały:" id="g1">
    <div data-a-target="side-nav-header-expanded"><h3>Obserwowane</h3></div>
    <div class="tw-transition" id="row1"><div><div class="side-nav-card">
      <a class="side-nav-card__link" data-a-id="followed-channel-0" href="/kanal_eps">
        <div data-a-target="side-nav-card-metadata"><p data-a-target="side-nav-title" title="Kanal_Eps">Kanal_Eps</p><p dir="auto" title="Minecraft">Minecraft</p></div>
      </a></div></div></div>
  </div>
  <div role="group" aria-label="Kanały na żywo" id="g2">
    <div data-a-target="side-nav-header-expanded"><h3>Kanały na żywo</h3></div>
    <div class="tw-transition"><div><div class="side-nav-card">
      <a class="side-nav-card__link" data-a-id="recommended-channel-0" href="/kanal_rec"></a></div></div></div>
  </div>
  <div role="group" aria-label="Polecane kategorie" id="g3">
    <div class="tw-transition" id="catrow"><div><div class="side-nav-card">
      <a class="side-nav-card__link" href="/directory/category/music"><p data-a-target="side-nav-title" title="Music">Music</p></a></div></div></div>
  </div>
</div></nav></div>`;

describe('twitch adapter', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('shelf card -> shelf container, login from image link, category from game link', () => {
    document.body.innerHTML = SHELF;
    const [it] = twitch.items(document);
    expect(it?.el.id).toBe('shelf');
    expect(it?.login).toBe('kanal_alfa');
    expect(it?.displayName).toBe('Kanal_Alfa');
    expect(it?.category).toEqual({ slug: 'just-chatting', name: 'Just Chatting' });
  });

  it('directory: stream card and category tile use the order: wrapper', () => {
    document.body.innerHTML = DIRECTORY;
    const items = twitch.items(document);
    const stream = items.find((i) => i.login === 'kanal_beta');
    const cat = items.find((i) => i.isCategory);
    expect(stream?.el.id).toBe('dir');
    expect(cat?.el.id).toBe('cat');
    expect(cat?.category).toEqual({ slug: 'irl', name: 'IRL' });
  });

  it('following: climbs from article but not into the shared grid', () => {
    document.body.innerHTML = FOLLOWING;
    const items = twitch.items(document);
    expect(items).toHaveLength(2);
    expect(items.find((i) => i.login === 'kanal_gamma')?.el.id).toBe('fwrap');
  });

  it('sidebar rows, category rows and recommended groups', () => {
    document.body.innerHTML = SIDEBAR;
    const items = twitch.items(document);
    const eps = items.find((i) => i.login === 'kanal_eps');
    expect(eps?.el.id).toBe('row1');
    expect(eps?.kind).toBe('row');
    expect(eps?.category).toEqual({ name: 'Minecraft' });
    expect(items.find((i) => i.isCategory)?.el.id).toBe('catrow');
    const groups = twitch.sections(document).map((g) => `${g.el.id}:${g.id}`);
    expect(groups).toEqual(['g2:sidebarChannels', 'g3:sidebarCategories']);
    expect(twitch.followed(document)?.el.id).toBe('g1');
  });
});

describe('twitch channel page', () => {
  it('display name comes from the stream header, not from the first h1 on the page', () => {
    history.pushState({}, '', '/kanal_delta');
    document.body.innerHTML = `
      <nav><h1>Twitch</h1></nav>
      <div data-target="channel-header-right"></div>
      <div id="live-channel-stream-information"><h1>Kanal_Delta</h1></div>`;
    expect(twitch.channelPage(document)?.displayName).toBe('Kanal_Delta');
    history.pushState({}, '', '/');
  });
});
