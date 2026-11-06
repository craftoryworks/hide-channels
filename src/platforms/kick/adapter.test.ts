import { beforeEach, describe, expect, it } from 'vitest';
import { kick } from './adapter';
import { categoryFromHref, slugFromHref } from './urls';

describe('kick urls', () => {
  it('slug and category', () => {
    expect(slugFromHref('/MokrySuchar')).toBe('mokrysuchar');
    expect(slugFromHref('/browse')).toBeUndefined();
    expect(slugFromHref('https://twitch.tv/x')).toBeUndefined();
    expect(categoryFromHref('/category/Just-Chatting')).toBe('just-chatting');
  });
});

// Fixtures trimmed from live DOM (2026-11-06).
const CARD = `
<section><div data-testid="livestream-results-card" id="card"><div>
  <a data-card-link="true" href="/mokrysuchar"></a>
  <a data-testid="media-card-thumbnail" href="/mokrysuchar"></a>
  <div><a href="/mokrysuchar"><img alt="mokrysuchar"></a><div>
    <a title="MokrySuchar" href="/mokrysuchar"><span>MokrySuchar</span></a>
    <div><a title="Tytuł" href="/mokrysuchar"><h3>Tytuł</h3></a></div>
    <div><div><a href="/category/just-chatting"><span>Rozmowy</span></a><button>Polski</button></div></div>
  </div></div>
</div></div></section>`;

const SIDEBAR = `
<div><section id="fol"><div>Obserwowane</div>
  <button id="frow"><a data-testid="sidebar-following-channel-1" href="/ppim"><div><img alt="ppim"></div>
    <div><div><span>ppim</span><span>IRL</span></div><div><span><span title="54">54</span></span></div></div></a></button>
</section>
<div><button data-testid="sidebar-show-more-following">Więcej</button></div>
<section id="rec"><div id="rechead">Polecane kanały</div>
  <button><a data-testid="sidebar-recommended-channel-1" href="/kebab_u_rudego"></a></button>
</section>
<div id="recmore"><button data-testid="sidebar-show-more-recommended-to-browse">Więcej</button></div></div>`;

const FOR_YOU = `<div data-testid="categories-for-you"><button id="b1"><div><div><span data-testid="category-Just Chatting"></span></div></div></button></div>
<div data-testid="category-card-root" id="cc"><a href="/category/slots"><div data-testid="category-Slots & Casino"></div></a></div>`;

describe('kick adapter', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('stream card', () => {
    document.body.innerHTML = CARD;
    const [it] = kick.items(document);
    expect(it?.el.id).toBe('card');
    expect(it?.login).toBe('mokrysuchar');
    expect(it?.displayName).toBe('MokrySuchar');
    expect(it?.category).toEqual({ slug: 'just-chatting', name: 'Rozmowy' });
  });

  it('sidebar rows, sections and followed', () => {
    document.body.innerHTML = SIDEBAR;
    const items = kick.items(document);
    const p = items.find((i) => i.login === 'ppim');
    expect(p?.el.id).toBe('frow');
    expect(p?.category).toEqual({ name: 'IRL' });
    expect(kick.sections(document).map((s) => [s.id, s.el.id, s.header?.id, s.extra?.[0]?.id])).toEqual([
      ['sidebarChannels', 'rec', 'rechead', 'recmore'],
    ]);
    expect(kick.followed(document)?.more?.textContent).toBe('Więcej');
  });

  it('category tiles use English name from data-testid', () => {
    document.body.innerHTML = FOR_YOU;
    const items = kick.items(document);
    expect(items.find((i) => i.el.id === 'b1')?.category).toEqual({
      slug: 'just-chatting',
      name: 'Just Chatting',
    });
    expect(items.find((i) => i.el.id === 'cc')?.category).toEqual({ slug: 'slots', name: 'Slots & Casino' });
  });
});
