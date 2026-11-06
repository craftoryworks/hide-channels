import type { Adapter, Carousel, ChannelPage, Item, Section } from '../../content/types';
import type { CategoryRef } from '../../core/data';
import type { SectionId } from '../../core/types';
import { categoryFromHref, loginFromHref } from './urls';

/** Containers of stream / video / clip / category cards. */
const CARD = [
  'div[data-test-selector="shelf-card-selector"]',
  'div[data-target][style^="order:"]',
  '[data-a-target^="video-tower-card-"]',
  '[data-a-target^="clips-card-"]',
  '[data-a-target^="live-game-card-"]',
].join(',');

const SEARCH_RESULT = '[data-a-target^="search-result-"]';

const txt = (e: Element | null | undefined) => e?.textContent?.trim() || undefined;
/** First element matching the first selector that matches anything (priority order, not DOM order). */
const first = (root: ParentNode, ...sels: string[]) => {
  for (const s of sels) {
    const e = root.querySelector(s);
    if (e) return e;
  }
  return null;
};

/** Climb from an <article> while the ancestor still holds only this one card. */
function articleContainer(a: Element): HTMLElement | null {
  const art = a.closest('article');
  if (!art) return null;
  let cur: HTMLElement = art;
  for (let i = 0; i < 3; i++) {
    const p = cur.parentElement;
    if (!p || p.getElementsByTagName('article')[1]) break; // [1] stops at the 2nd article
    cur = p;
  }
  return cur;
}

function categoryIn(root: Element): CategoryRef | undefined {
  const a =
    root.querySelector<HTMLAnchorElement>('a[data-a-target="preview-card-game-link"]') ||
    root.querySelector<HTMLAnchorElement>('a[href*="/directory/category/"]');
  const slug = categoryFromHref(a?.getAttribute('href'));
  if (!slug) return;
  return { slug, name: txt(a) };
}

function streamCards(doc: Document, out: Map<HTMLElement, Item>) {
  const anchors = doc.querySelectorAll<HTMLAnchorElement>(
    'a[data-a-target="preview-card-channel-link"][href], a[data-a-target="preview-card-image-link"][href]',
  );
  for (const a of anchors) {
    if (a.closest(SEARCH_RESULT) || a.closest('[data-test-selector="side-nav"]')) continue;
    const box = (a.closest<HTMLElement>(CARD) || articleContainer(a)) as HTMLElement | null;
    if (!box || out.has(box)) continue;
    const login =
      loginFromHref(
        box.querySelector('a[data-a-target="preview-card-channel-link"][href]')?.getAttribute('href'),
      ) ||
      loginFromHref(
        box.querySelector('a[data-a-target="preview-card-image-link"][href]')?.getAttribute('href'),
      );
    if (!login) continue;
    // p[title] holds the bare name; the outer element's text also includes badges ("Zweryfikowane").
    const displayName =
      box.querySelector('[data-a-target="preview-card-channel-link"] p[title]')?.getAttribute('title') ||
      undefined;
    out.set(box, { el: box, kind: 'tile', login, displayName, category: categoryIn(box) });
  }
}

function categoryTiles(doc: Document, out: Map<HTMLElement, Item>) {
  for (const a of doc.querySelectorAll<HTMLAnchorElement>('a[data-a-target="tw-box-art-card-link"][href]')) {
    if (a.closest(SEARCH_RESULT)) continue;
    const slug = categoryFromHref(a.getAttribute('href'));
    if (!slug) continue;
    const box = a.closest<HTMLElement>(CARD) || a.parentElement;
    if (!box || out.has(box)) continue;
    const name =
      box.querySelector('h2[title]')?.getAttribute('title') || a.getAttribute('aria-label') || undefined;
    out.set(box, { el: box, kind: 'tile', isCategory: true, category: { slug, name } });
  }
}

function sidebar(doc: Document, out: Map<HTMLElement, Item>) {
  const nav = doc.querySelector('[data-test-selector="side-nav"]');
  if (!nav) return;
  const collapsed = nav.getAttribute('data-a-target') === 'side-nav-bar-collapsed';
  for (const a of nav.querySelectorAll<HTMLAnchorElement>(
    'a.side-nav-card__link[href], a.side-nav-card[href]',
  )) {
    const box = a.closest<HTMLElement>('.tw-transition') || a.closest<HTMLElement>('.side-nav-card') || a;
    if (out.has(box)) continue;
    const href = a.getAttribute('href');
    const kind = collapsed ? 'mini' : 'row';
    const name = a.querySelector('[data-a-target="side-nav-title"]')?.getAttribute('title') || undefined;
    const slug = categoryFromHref(href);
    if (slug) {
      out.set(box, { el: box, kind, isCategory: true, category: { slug, name } });
      continue;
    }
    const login = loginFromHref(href);
    if (!login) continue;
    const cat = a
      .querySelector(
        '[data-a-target="side-nav-card-metadata"] p[title]:not([data-a-target="side-nav-title"])',
      )
      ?.getAttribute('title');
    out.set(box, {
      el: box,
      kind,
      login,
      displayName: name || a.querySelector('img[alt]')?.getAttribute('alt') || undefined,
      category: cat ? { name: cat } : undefined,
    });
  }
}

function search(doc: Document, out: Map<HTMLElement, Item>) {
  for (const row of doc.querySelectorAll<HTMLElement>('#search-tray__container [role="row"]')) {
    const a = row.querySelector('a[data-tray-item][href]');
    const href = a?.getAttribute('href');
    const label = a?.getAttribute('aria-label')?.replace(/\s+[--]\s+[^--]+$/, '');
    const slug = categoryFromHref(href);
    if (slug) out.set(row, { el: row, kind: 'search', isCategory: true, category: { slug, name: label } });
    else {
      const login = loginFromHref(href);
      if (login) out.set(row, { el: row, kind: 'search', login });
    }
  }
  for (const box of doc.querySelectorAll<HTMLElement>(SEARCH_RESULT)) {
    const tgt = box.getAttribute('data-a-target') || '';
    if (tgt.includes('__') || tgt.startsWith('search-results__')) continue;
    if (tgt === 'search-result-category') {
      const a = box.querySelector('a[href*="/directory/category/"]');
      const slug = categoryFromHref(a?.getAttribute('href'));
      if (slug) out.set(box, { el: box, kind: 'search', isCategory: true, category: { slug, name: txt(a) } });
      continue;
    }
    let login: string | undefined;
    for (const a of box.querySelectorAll('a[href]')) {
      login = loginFromHref(a.getAttribute('href'));
      if (login) break;
    }
    if (login) out.set(box, { el: box, kind: 'search', login, category: categoryIn(box) });
  }
}

export const twitch: Adapter = {
  noise: ['.chat-scrollable-area__message-container', '.chat-list--default'],
  player: ['[data-a-target="video-player"]'],
  platform: 'twitch',

  items(doc) {
    const out = new Map<HTMLElement, Item>();
    sidebar(doc, out);
    search(doc, out);
    streamCards(doc, out);
    categoryTiles(doc, out);
    return [...out.values()];
  },

  sections(doc) {
    const res: Section[] = [];
    for (const g of doc.querySelectorAll<HTMLElement>('[data-a-target="side-nav-bar"] [role="group"]')) {
      const id: SectionId | undefined = g.querySelector('a[data-a-id^="recommended-channel-"]')
        ? 'sidebarChannels'
        : g.querySelector('a[data-a-id^="similarity-channel-"]')
          ? 'sidebarSimilar'
          : !g.querySelector('a[data-a-id^="followed-channel-"]') &&
              g.querySelector('a.side-nav-card__link[href^="/directory/category/"]')
            ? 'sidebarCategories'
            : undefined;
      if (!id) continue;
      res.push({
        id,
        el: g,
        header: g.querySelector<HTMLElement>('[data-a-target="side-nav-header-expanded"]'),
      });
    }
    return res;
  },

  carousel(doc): Carousel | undefined {
    const el = doc.querySelector<HTMLElement>('[data-a-target="front-page-carousel"]');
    const slide = el?.querySelector<HTMLElement>('[data-a-target^="featured-item-index-"]');
    if (!el || !slide) return;
    let login: string | undefined;
    for (const a of slide.querySelectorAll('a[href]')) {
      login = loginFromHref(a.getAttribute('href'));
      if (login) break;
    }
    const ghosts: Carousel['ghosts'] = [];
    for (const g of el.querySelectorAll<HTMLElement>('.featured-content-carousel__item-container')) {
      if (g === slide) continue;
      const m = g
        .querySelector('img')
        ?.getAttribute('src')
        ?.match(/live_user_([a-z0-9_]+)-/i);
      if (m?.[1]) ghosts.push({ el: g, login: m[1].toLowerCase() });
    }
    return {
      el,
      slide,
      login,
      displayName: txt(el.querySelector('[data-a-target="carousel-display-name"]')),
      category: categoryIn(slide),
      next: () => el.querySelector<HTMLElement>('[data-a-target="featured-item-right-button"]')?.click(),
      ghosts,
    };
  },

  followed(doc) {
    const g = doc
      .querySelector('[data-a-target="side-nav-bar"] a[data-a-id^="followed-channel-"]')
      ?.closest<HTMLElement>('[role="group"]');
    if (!g) return;
    return { el: g, more: g.querySelector<HTMLElement>('[data-a-target="side-nav-show-more-button"]') };
  },

  channelPage(doc): ChannelPage | undefined {
    const actions = doc.querySelector<HTMLElement>('[data-target="channel-header-right"]');
    if (!actions) return;
    const login = loginFromHref(doc.location.pathname);
    if (!login) return;
    const h1 = first(doc, '#live-channel-stream-information h1', '.metadata-layout__support h1', 'h1');
    const link = doc.querySelector<HTMLElement>('a[data-a-target="stream-game-link"]');
    const slug = categoryFromHref(link?.getAttribute('href'));
    return {
      login,
      displayName: txt(h1),
      actions,
      categoryLink: slug ? link : null,
      category: slug ? { slug, name: txt(link) } : undefined,
    };
  },

  pageCategory(doc) {
    const slug = categoryFromHref(doc.location.pathname);
    if (!slug) return;
    return { slug, name: txt(doc.querySelector('h1')) };
  },
};
