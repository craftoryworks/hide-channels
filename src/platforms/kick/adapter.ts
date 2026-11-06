import type { Adapter, Carousel, ChannelPage, Item, Section } from '../../content/types';
import type { CategoryRef } from '../../core/data';
import { slugify } from '../../core/normalize';
import { categoryFromHref, slugFromHref } from './urls';

const txt = (e: Element | null | undefined) => e?.textContent?.trim() || undefined;
/** First element matching the first selector that matches anything (priority order, not DOM order). */
const first = (root: ParentNode, ...sels: string[]) => {
  for (const s of sels) {
    const e = root.querySelector(s);
    if (e) return e;
  }
  return null;
};
const visible = (e: Element) => e.getClientRects().length > 0;
const SIDEBAR_ROW =
  'a[data-testid^="sidebar-following-channel-"], a[data-testid^="sidebar-recommended-channel-"]';

function categoryIn(root: Element): CategoryRef | undefined {
  const a = root.querySelector('a[href^="/category/"], a[href*="kick.com/category/"]');
  const slug = categoryFromHref(a?.getAttribute('href'));
  if (!slug) return;
  return { slug, name: txt(a) };
}

function firstSlug(root: Element, sel = 'a[href]'): string | undefined {
  for (const a of root.querySelectorAll(sel)) {
    const s = slugFromHref(a.getAttribute('href'));
    if (s) return s;
  }
  return undefined;
}

/** Stream / clip / VOD cards: one element per card. */
function cards(doc: Document, out: Map<HTMLElement, Item>) {
  const sel =
    '[data-testid="livestream-results-card"], [data-testid="clips-card"], [data-testid="vods-card"], [data-testid="channel-results-card"]';
  for (const box of doc.querySelectorAll<HTMLElement>(sel)) {
    if (out.has(box) || box.closest('[data-testid="carousel"]')) continue;
    const login = firstSlug(box, 'a[data-card-link][href]') || firstSlug(box);
    if (!login) continue;
    const named = box.querySelector(`a[title][href="/${login}" i]`);
    out.set(box, {
      el: box,
      kind: 'tile',
      login,
      displayName: named?.getAttribute('title') || txt(named) || undefined,
      category: categoryIn(box),
    });
  }
}

/** Category tiles (/browse/categories) and "Categories for you" buttons (English name in data-testid). */
function categories(doc: Document, out: Map<HTMLElement, Item>) {
  for (const box of doc.querySelectorAll<HTMLElement>('[data-testid="category-card-root"]')) {
    const a = box.querySelector('a[href*="/category/"]');
    const slug = categoryFromHref(a?.getAttribute('href'));
    if (!slug) continue;
    const named = box.querySelector('[data-testid^="category-"]:not([data-testid="category-card-root"])');
    const name = named?.getAttribute('data-testid')?.slice('category-'.length) || txt(a);
    out.set(box, { el: box, kind: 'tile', isCategory: true, category: { slug, name } });
  }
  for (const b of doc.querySelectorAll<HTMLElement>(
    '[data-testid="categories-for-you"] [data-testid^="category-"]',
  )) {
    if (b.closest('[data-testid="category-card-root"]')) continue;
    // data-testid sits on a small <span> deep inside the tile <button>.
    const box = b.closest<HTMLElement>('button, a') || b;
    const name = b.getAttribute('data-testid')?.slice('category-'.length);
    if (!name || out.has(box)) continue;
    out.set(box, { el: box, kind: 'tile', isCategory: true, category: { slug: slugify(name), name } });
  }
}

function sidebar(doc: Document, out: Map<HTMLElement, Item>) {
  for (const a of doc.querySelectorAll<HTMLAnchorElement>(SIDEBAR_ROW)) {
    const box = (a.parentElement?.tagName === 'BUTTON' ? a.parentElement : a) as HTMLElement;
    if (out.has(box)) continue;
    const login = slugFromHref(a.getAttribute('href'));
    if (!login) continue;
    const spans = a.querySelectorAll('span');
    const cat = spans[1] && !spans[1].querySelector('span') ? txt(spans[1]) : undefined;
    out.set(box, {
      el: box,
      kind: a.getBoundingClientRect().width > 0 && a.getBoundingClientRect().width < 90 ? 'mini' : 'row',
      login,
      displayName: txt(spans[0]) || a.querySelector('img[alt]')?.getAttribute('alt') || undefined,
      category: cat ? { name: cat } : undefined,
    });
  }
}

function search(doc: Document, out: Map<HTMLElement, Item>) {
  for (const a of doc.querySelectorAll<HTMLElement>('a[data-search-item]')) {
    const href = a.getAttribute('href');
    const slug = categoryFromHref(href);
    if (slug) out.set(a, { el: a, kind: 'search', isCategory: true, category: { slug, name: txt(a) } });
    else {
      const login = slugFromHref(href);
      if (login) out.set(a, { el: a, kind: 'search', login });
    }
  }
}

export const kick: Adapter = {
  noise: ['#chatroom-messages', '[data-testid="chatroom-messages"]'],
  platform: 'kick',

  items(doc) {
    const out = new Map<HTMLElement, Item>();
    sidebar(doc, out);
    search(doc, out);
    cards(doc, out);
    categories(doc, out);
    return [...out.values()];
  },

  sections(doc) {
    const a = doc.querySelector('a[data-testid^="sidebar-recommended-channel-"]');
    const sec = a?.closest<HTMLElement>('section');
    if (!sec) return [];
    return [
      // "Show more / less" buttons live in a sibling div right after the section.
      {
        id: 'sidebarChannels',
        el: sec,
        header: sec.firstElementChild as HTMLElement | null,
        extra: sec.nextElementSibling?.querySelector('[data-testid^="sidebar-show-"]')
          ? [sec.nextElementSibling as HTMLElement]
          : [],
      },
    ] as Section[];
  },

  carousel(doc): Carousel | undefined {
    const el = doc.querySelector<HTMLElement>('[data-testid="carousel"]');
    if (!el) return;
    // The slide is the player + info box; climb from the stream link but stay outside the chat.
    const start =
      el.querySelector('video')?.closest<HTMLElement>('a[href]') || el.querySelector<HTMLElement>('a[href]');
    if (!start) return;
    let slide: HTMLElement = start;
    for (let p = start.parentElement; p && p !== el; p = p.parentElement) {
      if (p.querySelector('[data-testid="chatroom-messages"], #chatroom-messages')) break;
      slide = p;
    }
    const login = slugFromHref(start.getAttribute('href')) || firstSlug(slide);
    return {
      el,
      slide,
      login,
      displayName: txt(el.querySelector('[data-testid="carousel-channel-name"]')) || login,
      category: categoryIn(el),
      next: () => {
        const btn =
          el.querySelector<HTMLElement>('button[aria-label="Go to next featured livestream"]') ||
          [...el.querySelectorAll<HTMLElement>('button[aria-label*="next" i]')].pop();
        btn?.click();
      },
      ghosts: [],
    };
  },

  followed(doc) {
    const a = doc.querySelector('a[data-testid^="sidebar-following-channel-"]');
    const sec = a?.closest<HTMLElement>('section');
    if (!sec) return;
    const more =
      sec.querySelector<HTMLElement>('[data-testid="sidebar-show-more-following"]') ||
      sec.nextElementSibling?.querySelector<HTMLElement>('[data-testid="sidebar-show-more-following"]') ||
      null;
    return { el: sec, more };
  },

  channelPage(doc): ChannelPage | undefined {
    const login = slugFromHref(doc.location.pathname);
    if (!login) return;
    const follow = [
      ...doc.querySelectorAll<HTMLElement>('[data-testid="follow-button"], [data-testid="unfollow-button"]'),
    ].find((b) => visible(b) && !b.closest('[data-testid="carousel"]'));
    const actions = follow?.parentElement ?? null;
    const name = doc.querySelector('[data-testid="channel-username"]');
    const link = [...doc.querySelectorAll<HTMLElement>('a[href^="/category/"]')].find(
      (a) => visible(a) && !a.closest('[data-testid^="sidebar"], nav, aside, [data-testid="carousel"]'),
    );
    const slug = categoryFromHref(link?.getAttribute('href'));
    if (!actions && !slug) return;
    return {
      login,
      displayName: txt(name) || login,
      actions,
      categoryLink: slug ? link : null,
      category: slug ? { slug, name: txt(link) } : undefined,
    };
  },

  pageCategory(doc) {
    const slug = categoryFromHref(doc.location.pathname);
    if (!slug) return;
    return { slug, name: txt(first(doc, '[data-testid="category-name"]', 'h1')) };
  },
};
