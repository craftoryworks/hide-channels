import { browser } from 'wxt/browser';
import type { ContentScriptContext } from 'wxt/utils/content-script-context';
import { addCategory, addChannel, type CategoryRef, removeCategory, removeChannel } from '../core/data';
import { type Dict, dict } from '../core/i18n';
import { Matcher } from '../core/matcher';
import { normName, normSlug } from '../core/normalize';
import { load, update, watch } from '../core/store';
import type { Data, SectionId } from '../core/types';
import { CSS, type IconName, icon } from './styles';
import type { Adapter, Carousel, Item } from './types';

type Reason = 'channel' | 'category';

function sameCategory(a: CategoryRef, b: CategoryRef): boolean {
  if (a.slug && b.slug && normSlug(a.slug) === normSlug(b.slug)) return true;
  return !!a.name && !!b.name && normName(a.name) === normName(b.name);
}

function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  cls: string,
  ico?: IconName,
): HTMLElementTagNameMap[K] {
  const e = document.createElement(tag);
  e.className = cls;
  if (ico) e.append(icon(ico));
  return e;
}

function stop(e: Event) {
  e.preventDefault();
  e.stopPropagation();
}

/**
 * Our buttons live inside Twitch/Kick pages, so page scripts could `.click()` them. Only real user
 * clicks may change the list or open tabs. (Unit tests run in happy-dom, where nothing is trusted.)
 */
const trusted = (e: Event) => e.isTrusted || import.meta.env.MODE === 'test';

function setAttr(e: Element, name: string, on: boolean, value = '') {
  if (on) {
    if (e.getAttribute(name) !== value) e.setAttribute(name, value);
  } else if (e.hasAttribute(name)) e.removeAttribute(name);
}

function setLabel(b: HTMLElement, label: string) {
  if (b.title === label) return;
  b.title = label;
  b.setAttribute('aria-label', label);
}

function scrollParent(e: HTMLElement): HTMLElement | null {
  for (let p = e.parentElement; p; p = p.parentElement) {
    const o = getComputedStyle(p).overflowY;
    if ((o === 'auto' || o === 'scroll') && p.clientHeight > 0) return p;
  }
  return null;
}

const catName = (c?: CategoryRef) => c?.name || c?.slug || '';

export function startEngine(adapter: Adapter, ctx: ContentScriptContext): { scan: () => void } {
  const P = adapter.platform;
  let live: Data;
  /** Snapshot taken at page load / SPA navigation; only it decides what disappears from lists. */
  let applied: Data;
  let mLive: Matcher;
  let mApplied: Matcher;
  let t: Dict = dict();
  const items = new WeakMap<HTMLElement, Item>();
  let timer: number | undefined;

  const style = document.createElement('style');
  style.id = 'hc-style';
  style.textContent = CSS;
  (document.head || document.documentElement).append(style);

  function rebuild() {
    mLive = new Matcher(live, P);
    mApplied = new Matcher(applied, P);
    t = dict(live.settings.lang);
  }

  /** One pending scan at a time; `ms` lets throttled steps ask to be retried later. */
  function schedule(ms = 150) {
    if (timer || !live || !ctx.isValid) return;
    timer = window.setTimeout(() => {
      timer = undefined;
      if (ctx.isValid) scan();
    }, ms);
  }

  const nameOf = (it: { login?: string; displayName?: string }) => it.displayName || it.login || '';

  async function hideChannel(it: { login?: string; displayName?: string }) {
    if (!it.login) return;
    const login = it.login;
    await update((d) => {
      addChannel(d, login, it.displayName);
    });
  }

  async function hideCategory(ref?: CategoryRef) {
    if (!ref) return;
    await update((d) => {
      addCategory(d, ref, P);
    });
  }

  const unhideChannel = (login: string) => update((d) => removeChannel(d, login));
  const unhideCategory = (ref: CategoryRef) => update((d) => removeCategory(d, ref));

  async function setSection(id: SectionId, on: boolean) {
    await update((d) => {
      d.settings.sections[id] = on;
    });
  }

  let toastEl: HTMLElement | undefined;
  let toastTimer: number | undefined;
  function toast(text: string, onUndo?: () => void, ms = 8000) {
    toastEl?.remove();
    clearTimeout(toastTimer);
    const box = el('div', 'hc-toast');
    box.setAttribute('role', 'status');
    const span = el('span', '');
    span.textContent = text;
    box.append(span);
    if (onUndo) {
      const b = el('button', '');
      b.type = 'button';
      b.textContent = t.undo;
      b.addEventListener('click', (e) => {
        stop(e);
        if (!trusted(e)) return;
        onUndo();
        box.remove();
      });
      box.append(b);
    }
    document.body.append(box);
    toastEl = box;
    toastTimer = window.setTimeout(() => box.remove(), ms);
  }

  function makeBtn(label: string, fn: () => void): HTMLButtonElement {
    const b = el('button', '');
    b.type = 'button';
    b.textContent = label;
    b.addEventListener('click', (e) => {
      stop(e);
      if (trusted(e)) fn();
    });
    b.addEventListener('mousedown', (e) => e.stopPropagation());
    return b;
  }

  let openMenu: HTMLElement | undefined;
  function closeMenu() {
    if (!openMenu) return;
    openMenu.parentElement?.querySelector(':scope > .hc-x')?.setAttribute('aria-expanded', 'false');
    openMenu.remove();
    openMenu = undefined;
  }
  ctx.addEventListener(document, 'click', (e) => {
    if (openMenu && !openMenu.contains(e.target as Node)) closeMenu();
  });

  function showMenu(host: HTMLElement, xBtn: HTMLElement, entries: [string, () => void][]) {
    closeMenu();
    const m = el('div', 'hc-menu');
    m.setAttribute('role', 'menu');
    for (const [label, fn] of entries) {
      const b = el('button', '');
      b.type = 'button';
      b.setAttribute('role', 'menuitem');
      b.textContent = label;
      b.title = label;
      b.addEventListener('click', (e) => {
        stop(e);
        closeMenu();
        if (trusted(e)) fn();
      });
      m.append(b);
    }
    m.addEventListener('mouseleave', closeMenu);
    m.addEventListener('mousedown', (e) => e.stopPropagation());
    host.append(m);
    xBtn.setAttribute('aria-expanded', 'true');
    openMenu = m;
    (m.firstElementChild as HTMLElement | null)?.focus();
  }

  function makeX(cls: string, onClick: (btn: HTMLElement) => void): HTMLButtonElement {
    const b = el('button', cls, 'x');
    b.type = 'button';
    b.addEventListener('click', (e) => {
      stop(e);
      if (trusted(e)) onClick(b);
    });
    b.addEventListener('mousedown', (e) => e.stopPropagation());
    return b;
  }

  function match(m: Matcher, it: Item, exempt?: CategoryRef): { chan: boolean; cat: boolean } {
    const chan = !it.isCategory && m.channel(it.login);
    let cat = !!it.category && m.category(it.category);
    if (cat && exempt && it.category && sameCategory(exempt, it.category)) cat = false;
    return { chan, cat };
  }

  function onItemX(btn: HTMLElement) {
    const host = btn.parentElement;
    const it = host && items.get(host);
    if (!it) return;
    if (it.isCategory) hideCategory(it.category);
    else if (it.kind === 'tile' && catName(it.category))
      showMenu(host, btn, [
        [t.hideChannel(nameOf(it)), () => hideChannel(it)],
        [t.hideCategory(catName(it.category)), () => hideCategory(it.category)],
      ]);
    else hideChannel(it);
  }

  function ensureX(it: Item) {
    if (it.kind !== 'tile' && it.kind !== 'row') return;
    let b = it.el.querySelector<HTMLButtonElement>(':scope > .hc-x');
    if (!b) {
      b = makeX(`hc-x${it.kind === 'row' ? ' hc-x--row' : ''}`, onItemX);
      it.el.append(b);
    }
    setLabel(
      b,
      it.isCategory
        ? t.hideCategory(catName(it.category))
        : it.kind === 'row' || !it.category
          ? t.hideChannel(nameOf(it))
          : t.hide,
    );
  }

  function setOverlay(it: Item, reason: Reason | undefined) {
    let o = it.el.querySelector<HTMLElement>(':scope > .hc-pending');
    if (!reason || it.kind === 'mini' || it.kind === 'search') {
      o?.remove();
      return;
    }
    const who = reason === 'channel' ? nameOf(it) : catName(it.category);
    const text =
      it.kind === 'row'
        ? t.pendingRow(who)
        : reason === 'channel'
          ? t.pendingChannel(who)
          : t.pendingCategory(who);
    if (!o) {
      o = el('div', `hc-pending${it.kind === 'row' ? ' hc-pending--row' : ''}`);
      o.append(el('span', ''));
      const b = el('button', '');
      b.type = 'button';
      o.append(b);
      o.addEventListener('click', stop);
      o.addEventListener('mousedown', (e) => e.stopPropagation());
      b.addEventListener('click', (e) => {
        stop(e);
        if (!trusted(e)) return;
        const cur = items.get(it.el);
        const r = o?.dataset.reason as Reason | undefined;
        if (!cur || !r) return;
        if (r === 'channel' && cur.login) unhideChannel(cur.login);
        if (r === 'category' && cur.category) unhideCategory(cur.category);
      });
      it.el.append(o);
    }
    o.dataset.reason = reason;
    const span = o.firstElementChild as HTMLElement;
    if (span.textContent !== text) {
      span.textContent = text;
      span.title = text;
    }
    o.title = text;
    const b = o.lastElementChild as HTMLElement;
    if (b.textContent !== t.undo) b.textContent = t.undo;
    setLabel(b, `${t.undo}: ${text}`);
  }

  // Sites load more cards when the list gets short. If we remove almost everything they load
  // forever (seen on Kick clips and Twitch directory), which hammers their servers. In "remove"
  // mode, after GUARD_AFTER removed tiles without user input, further hidden tiles become
  // placeholders that keep their space (with a "why?" explanation), so the loader stops.
  // "removeAlways" skips the guard at the user's own risk.
  const GUARD_AFTER = 24;
  let burst = 0;
  let lastInput = 0;
  const guarded = new WeakSet<HTMLElement>();
  function onInput(e: Event) {
    if (!e.isTrusted || Date.now() - lastInput < 200) return;
    lastInput = Date.now();
    burst = 0;
  }
  for (const type of ['wheel', 'touchmove', 'keydown', 'pointerdown'] as const)
    ctx.addEventListener(window, type, onInput, { passive: true, capture: true });

  /** true when this tile should be removed, false when the guard keeps it as a placeholder */
  function removeTile(e: HTMLElement): boolean {
    if (guarded.has(e)) return false;
    if (e.hasAttribute('data-hc-hidden')) return true;
    if (live.settings.hiddenTiles === 'removeAlways' || ++burst <= GUARD_AFTER) return true;
    guarded.add(e);
    return false;
  }

  function openSettings() {
    browser.runtime.sendMessage({ type: 'openOptions', hash: 'hidden' }).catch(() => {});
    update((d) => {
      d.settings.phHintDone = true;
    });
  }

  /** Neutral "hidden" card in place of the tile. Deliberately without the name. */
  function setPlaceholder(el: HTMLElement, text: string | undefined, btn?: 'why' | 'change') {
    let p = el.querySelector<HTMLElement>(':scope > .hc-ph');
    setAttr(el, 'data-hc-ph', !!text);
    if (!text) {
      p?.remove();
      return;
    }
    if (!p) {
      p = el.ownerDocument.createElement('div');
      p.className = 'hc-ph';
      p.append(el.ownerDocument.createElement('span'));
      el.append(p);
    }
    const span = p.querySelector(':scope > span') as HTMLElement;
    if (span.textContent !== text) span.textContent = text;
    let b = p.querySelector<HTMLButtonElement>(':scope > button');
    if (b && b.dataset.kind !== btn) {
      b.remove();
      b = null;
    }
    if (btn && !b) {
      b =
        btn === 'why'
          ? makeBtn(t.phWhy, () => toast(t.phWhyText, undefined, 20000))
          : makeBtn(t.phChange, openSettings);
      b.dataset.kind = btn;
      p.append(b);
    }
  }

  function render(it: Item, exempt?: CategoryRef) {
    items.set(it.el, it);
    setAttr(it.el, 'data-hc-item', true, it.kind);
    const a = match(mApplied, it, exempt);
    const l = match(mLive, it, exempt);
    const hidden = (a.chan && l.chan) || (a.cat && l.cat);
    const reason: Reason | undefined = hidden
      ? undefined
      : l.chan
        ? 'channel'
        : l.cat
          ? 'category'
          : undefined;
    const tile = hidden && it.kind === 'tile';
    const wantPh = tile && live.settings.hiddenTiles === 'placeholder';
    // The placeholder keeps the tile's spot, so the site never sees a short list and keeps loading.
    const guard = tile && !wantPh && !removeTile(it.el);
    const ph = wantPh || guard;
    setPlaceholder(
      it.el,
      ph ? (it.isCategory || !(a.chan && l.chan) ? t.phCategory : t.phChannel) : undefined,
      guard ? 'why' : wantPh && !live.settings.phHintDone ? 'change' : undefined,
    );
    setAttr(it.el, 'data-hc-hidden', hidden && !ph);
    setAttr(it.el, 'data-hc-pending', !!reason);
    setOverlay(it, reason);
    if (!hidden) ensureX(it);
  }

  function sectionName(h: HTMLElement | null | undefined, id: SectionId): string {
    if (id === 'carousel') return t.carousel;
    const own = h?.querySelector('h1,h2,h3,h4')?.textContent || h?.firstChild?.textContent || '';
    return own.trim().replace(/:$/, '');
  }

  function renderSections() {
    for (const s of adapter.sections(document)) {
      const off = live.settings.sections[s.id];
      setAttr(s.el, 'data-hc-hidden', off);
      for (const x of s.extra ?? []) setAttr(x, 'data-hc-hidden', off);
      const h = s.header;
      if (!h) continue;
      const id = s.id;
      let b = h.querySelector<HTMLButtonElement>(':scope > .hc-sec');
      if (!b) {
        setAttr(h, 'data-hc-sec-host', true);
        b = makeX('hc-sec', async () => {
          await setSection(id, true);
          toast(t.toastSection(sectionName(h, id)), () => setSection(id, false));
        });
        h.append(b);
      }
      setLabel(b, t.hideSection(sectionName(h, id)));
    }
  }

  let fillClicks = 0;
  let lastFill = 0;
  let userShrank = false;
  ctx.addEventListener(
    document,
    'click',
    (e) => {
      if (!e.isTrusted) return;
      const f = adapter.followed(document);
      const target = e.target as Element;
      if (target.closest?.('[class*="hc-"]')) return;
      if (f?.el.contains(target) && !f.more?.contains(target)) userShrank = true;
    },
    { capture: true },
  );

  function fillFollowed() {
    const s = live.settings;
    if (!s.fillFollowed || !(s.sections.sidebarChannels || s.sections.sidebarCategories)) return;
    if (userShrank || fillClicks >= 9) return;
    const wait = 600 - (Date.now() - lastFill);
    if (wait > 0) {
      schedule(wait);
      return;
    }
    const f = adapter.followed(document);
    if (!f?.more || !f.el.isConnected) return;
    const sc = scrollParent(f.el);
    if (!sc || sc.scrollHeight > sc.clientHeight + 2) return; // already scrollable: nothing to fill
    // Bottom of visible content, independent of scroll position.
    const top = sc.getBoundingClientRect().top - sc.scrollTop;
    let bottom = 0;
    for (let e: Element | null = f.el; e; e = e.nextElementSibling) {
      if (e.getClientRects().length) bottom = Math.max(bottom, e.getBoundingClientRect().bottom - top);
    }
    if (sc.clientHeight - bottom < 45) return;
    fillClicks++;
    lastFill = Date.now();
    f.more.click();
  }

  let skips = 0;
  let lastSkip = 0;
  function renderCarousel() {
    const c: Carousel | undefined = adapter.carousel(document);
    if (!c) return;
    const off = live.settings.sections.carousel;
    setAttr(c.el, 'data-hc-hidden', off || skips > 15);
    if (off) return;
    for (const g of c.ghosts) setAttr(g.el, 'data-hc-ghost', mLive.channel(g.login));
    const hidden = mLive.channel(c.login) || mLive.category(c.category);
    if (hidden) {
      const wait = 700 - (Date.now() - lastSkip);
      if (wait <= 0) {
        skips++;
        lastSkip = Date.now();
        c.next();
        schedule(750);
      } else schedule(wait);
      return;
    }
    skips = 0; // a visible slide: start counting consecutive skips again
    const slide = c.slide;
    if (getComputedStyle(slide).position === 'static') setAttr(slide, 'data-hc-rel', true);
    let b = slide.querySelector<HTMLButtonElement>(':scope > .hc-x');
    if (!b) {
      b = makeX('hc-x hc-x--carousel', (btn) => {
        const cur = adapter.carousel(document);
        if (!cur) return;
        const entries: [string, () => void][] = [];
        const who = nameOf(cur);
        if (cur.login)
          entries.push([
            t.hideChannel(who),
            async () => {
              await hideChannel(cur);
              toast(t.toastSkip(who), () => cur.login && unhideChannel(cur.login));
            },
          ]);
        const cat = cur.category;
        if (cat && catName(cat))
          entries.push([
            t.hideCategory(catName(cat)),
            async () => {
              await hideCategory(cat);
              toast(t.toastCategory(catName(cat)), () => unhideCategory(cat));
            },
          ]);
        entries.push([
          t.hideCarousel,
          async () => {
            await setSection('carousel', true);
            toast(t.toastSection(t.carousel), () => setSection('carousel', false));
          },
        ]);
        showMenu(cur.slide, btn, entries);
      });
      slide.append(b);
    }
    setLabel(b, t.hide);
  }

  function renderChannelPage() {
    const cp = adapter.channelPage(document);
    if (!cp) return;
    if (cp.actions) {
      let eye = cp.actions.querySelector<HTMLButtonElement>(':scope > .hc-eye');
      if (!eye) {
        eye = el('button', 'hc-eye', 'eyeOff');
        eye.type = 'button';
        eye.addEventListener('click', async (e) => {
          stop(e);
          if (!trusted(e)) return;
          const cur = adapter.channelPage(document);
          if (!cur) return;
          const name = nameOf(cur);
          if (mLive.channel(cur.login)) {
            await unhideChannel(cur.login);
            toast(t.toastShown(name));
          } else {
            await hideChannel(cur);
            toast(t.toastChannel(name), () => unhideChannel(cur.login));
          }
        });
        cp.actions.append(eye);
      }
      const on = mLive.channel(cp.login);
      eye.classList.toggle('hc-eye--on', on);
      setLabel(eye, on ? t.showChannel(nameOf(cp)) : t.hideChannel(nameOf(cp)));
      eye.setAttribute('aria-pressed', String(on));
    }
    const link = cp.categoryLink;
    if (link && cp.category) {
      let x = link.nextElementSibling as HTMLButtonElement | null;
      if (!x?.classList.contains('hc-catx')) {
        x = el('button', 'hc-catx', 'x');
        x.type = 'button';
        x.addEventListener('click', async (e) => {
          stop(e);
          if (!trusted(e)) return;
          const ref = adapter.channelPage(document)?.category;
          if (!ref) return;
          const name = catName(ref);
          if (mLive.category(ref)) {
            await unhideCategory(ref);
            toast(t.toastShown(name));
          } else {
            await hideCategory(ref);
            toast(t.toastCategory(name), () => unhideCategory(ref));
          }
        });
        link.after(x);
      }
      const on = mLive.category(cp.category);
      setLabel(x, on ? t.showCategory(catName(cp.category)) : t.hideCategory(catName(cp.category)));
      x.setAttribute('aria-pressed', String(on));
      x.classList.toggle('hc-eye--on', on);
    }
  }

  /** Removes every control and mark we added (extension reloaded, or platform switched off). */
  function strip() {
    for (const e of document.querySelectorAll(
      '.hc-x, .hc-menu, .hc-pending, .hc-ph, .hc-sec, .hc-eye, .hc-catx, .hc-toast',
    ))
      e.remove();
    const attrs = ['hidden', 'ghost', 'item', 'pending', 'ph', 'rel', 'sec-host'].map((a) => `data-hc-${a}`);
    for (const e of document.querySelectorAll(attrs.map((a) => `[${a}]`).join(',')))
      for (const a of attrs) e.removeAttribute(a);
  }

  function scan() {
    if (!document.body) return;
    if (!live.settings.enabled[P]) {
      strip();
      return;
    }
    if (!style.isConnected) (document.head || document.documentElement).append(style);
    const exempt = adapter.pageCategory(document);
    for (const it of adapter.items(document)) render(it, exempt);
    renderSections();
    renderCarousel();
    renderChannelPage();
    fillFollowed();
  }

  const BASE_NOISE = ['[role="log"]', '.hc-toast', ...(adapter.noise ?? [])];
  const WITH_PLAYER = [...BASE_NOISE, ...(adapter.player ?? [])].join(',');
  const noise = () => (location.pathname === '/' ? BASE_NOISE.join(',') : WITH_PLAYER);
  const ours = (n: Node) => n instanceof Element && /(^|\s)hc-/.test(n.getAttribute('class') ?? '');
  /** Chat messages, video players and our own controls change all the time and never add tiles. */
  function relevant(records: MutationRecord[]): boolean {
    const ignore = noise();
    for (const r of records) {
      const target = r.target instanceof Element ? r.target : r.target.parentElement;
      if (!target || target.closest(ignore)) continue;
      if (r.type === 'attributes') return true;
      const nodes = [...r.addedNodes, ...r.removedNodes];
      if (nodes.some((n) => n.nodeType === Node.ELEMENT_NODE && !ours(n))) return true;
    }
    return false;
  }
  const mo = new MutationObserver((records) => {
    if (relevant(records)) schedule();
  });
  let unwatch = () => {};
  ctx.onInvalidated(() => {
    // Extension reloaded/updated: this script can no longer reach storage, so remove every
    // control it added. Otherwise its X buttons stay on the page and silently do nothing.
    mo.disconnect();
    clearTimeout(timer);
    clearTimeout(toastTimer);
    style.remove();
    strip();
    try {
      unwatch(); // browser.storage may already be gone in an orphaned script
    } catch {
      // nothing left to unsubscribe from
    }
  });

  load().then((d) => {
    live = d;
    applied = d;
    rebuild();
    mo.observe(document.documentElement, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['href'],
    });
    scan();
  });

  unwatch = watch((d) => {
    if (!applied) return; // first load() still running; it reads the newest value anyway
    live = d;
    rebuild();
    scan();
  });

  let lastHref = location.href;
  ctx.addEventListener(window, 'wxt:locationchange', () => {
    if (!live || location.href === lastHref) return;
    lastHref = location.href;
    applied = live;
    skips = 0;
    fillClicks = 0;
    userShrank = false;
    rebuild();
    closeMenu();
    schedule();
  });

  return { scan };
}
