<script lang="ts">
import { browser } from 'wxt/browser';
import logo from '../../assets/craftory-logo-on-dark.svg';
import { addCategory, addChannel, removeCategory, removeChannel } from '../../core/data';
import { normName } from '../../core/normalize';
import { load, update, watch } from '../../core/store';
import { type Data, type Platform, type PlatformFlags, SECTIONS, type SectionId } from '../../core/types';
import { exportJson } from '../../ui/file';
import { ui } from '../../ui/i18n';
import { loginFromInput } from '../../ui/input';

let data = $state<Data | undefined>();
let tab = $state<'channels' | 'categories'>('channels');
let q = $state('');

const t = $derived(ui(data?.settings.lang));

load().then((d) => (data = d));
watch((d) => (data = d));

interface Row {
  id: string;
  name: string;
  on: PlatformFlags;
  addedAt: number;
}

const rows = $derived.by<Row[]>(() => {
  if (!data) return [];
  const list: Row[] =
    tab === 'channels'
      ? Object.values(data.channels).map((c) => ({
          id: c.login,
          name: c.displayName || c.login,
          on: c.on,
          addedAt: c.addedAt,
        }))
      : Object.values(data.categories).map((c) => ({
          id: c.key,
          name: c.name,
          on: c.on,
          addedAt: c.addedAt,
        }));
  const f = normName(q);
  return list
    .filter((r) => !f || normName(r.name).includes(f) || r.id.includes(f))
    .sort((a, b) => b.addedAt - a.addedAt);
});

// Huge lists (10k+) would make the popup sluggish: render one page and grow it while scrolling.
const PAGE = 100;
let limit = $state(PAGE);
$effect(() => {
  tab;
  q;
  limit = PAGE;
});
const shown = $derived(rows.slice(0, limit));
function onScroll(e: Event) {
  const el = e.currentTarget as HTMLElement;
  if (limit < rows.length && el.scrollTop + el.clientHeight > el.scrollHeight - 200) limit += PAGE;
}

const counts = $derived({
  channels: data ? Object.keys(data.channels).length : 0,
  categories: data ? Object.keys(data.categories).length : 0,
});

/** What Enter would add: a valid login on the channels tab, the typed name on the categories tab. */
const typed = $derived(tab === 'channels' ? loginFromInput(q) : q.trim() || undefined);
const exact = $derived(
  rows.some((r) => (tab === 'channels' ? r.id === typed : normName(r.name) === normName(q))),
);

function togglePlatform(p: Platform) {
  update((d) => {
    d.settings.enabled[p] = !d.settings.enabled[p];
  });
}

function toggleRow(id: string, p: Platform) {
  const which = tab; // the callback runs later; the user may switch tabs meanwhile
  update((d) => {
    const e = which === 'channels' ? d.channels[id] : d.categories[id];
    if (e) e.on[p] = !e.on[p];
  });
}

function removeRow(id: string) {
  const which = tab;
  update((d) => {
    if (which === 'channels') removeChannel(d, id);
    else {
      const c = d.categories[id];
      if (c) removeCategory(d, { name: c.name });
    }
  });
}

function onKey(e: KeyboardEvent) {
  if (e.key !== 'Enter') return;
  const v = typed;
  if (!v || exact) return; // invalid login: keep the text so it can be corrected
  const which = tab;
  update((d) => {
    if (which === 'channels') addChannel(d, v);
    else addCategory(d, { name: v });
  });
  q = '';
}

function toggleSection(id: SectionId) {
  update((d) => {
    d.settings.sections[id] = !d.settings.sections[id];
  });
}

const openOptions = () => browser.runtime.openOptionsPage();
// A file picker can't be opened from the popup: Chrome closes the popup as soon as the dialog takes
// focus, and the chosen file is lost. Import therefore happens on the settings page.
const openImport = () => browser.tabs.create({ url: browser.runtime.getURL('/options.html#data') });
</script>

{#if data}
  <main>
    <header>
      <span>Hide Channels <span class="by">by</span></span>
      <a href="https://craftory.works" target="_blank" rel="noopener" title="craftory.works">
        <img src={logo} alt="Craftory" width="90" height="20" />
      </a>
      <a class="kofi" href="https://ko-fi.com/craftory" target="_blank" rel="noopener" title={t.supportText}><svg class="heart" width="13" height="13" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 21s-7.5-4.6-10-9.3C.3 8.4 2.1 4 6.2 4c2.4 0 3.8 1.4 4.8 2.9C12 5.4 13.4 4 15.8 4 19.9 4 21.7 8.4 20 11.7 17.5 16.4 12 21 12 21z"/></svg> {t.support}</a>
    </header>

    <div class="top">
      <span class="lbl">{t.worksOn}</span>
      <div class="plats">
        {#each ['twitch', 'kick'] as const as p}
          <label class="ck"><input type="checkbox" checked={data.settings.enabled[p]} onchange={() => togglePlatform(p)} />{p === 'twitch' ? 'Twitch' : 'Kick'}</label>
        {/each}
      </div>
      <span class="lbl">{t.hideShort}</span>
      <div class="secs">
        {#each SECTIONS as id}
          <label class="ck" title={t.sec[id]}><input type="checkbox" checked={data.settings.sections[id]} onchange={() => toggleSection(id)} />{t.secShort[id]}</label>
        {/each}
      </div>
    </div>

    <div class="tsr">
      <div class="tabs" role="tablist">
        <button role="tab" aria-selected={tab === 'channels'} onclick={() => (tab = 'channels')}>{t.channels} ({counts.channels})</button>
        <button role="tab" aria-selected={tab === 'categories'} onclick={() => (tab = 'categories')}>{t.categories} ({counts.categories})</button>
      </div>
      <input
        class="search"
        bind:value={q}
        onkeydown={onKey}
        aria-label={tab === 'channels' ? t.searchChannel : t.searchCategory}
        placeholder={tab === 'channels' ? t.searchChannel : t.searchCategory}
      />
    </div>

    <ul class="list" onscroll={onScroll}>
      <li class="head" aria-hidden="true">
        <span>{tab === 'channels' ? t.colChannel : t.colCategory}</span><span class="col">Twitch</span><span class="col">Kick</span><span class="xsp"></span>
      </li>
      {#if typed && !exact}<li class="hint">{t.addHint(typed)}</li>{/if}
      {#each shown as r (r.id)}
        <li>
          <span class="name" title={r.name}>{r.name}</span>
          <span class="col"><input type="checkbox" checked={r.on.twitch} aria-label="{t.hideOnTwitch}: {r.name}" title={t.hideOnTwitch} onchange={() => toggleRow(r.id, 'twitch')} /></span>
          <span class="col"><input type="checkbox" checked={r.on.kick} aria-label="{t.hideOnKick}: {r.name}" title={t.hideOnKick} onchange={() => toggleRow(r.id, 'kick')} /></span>
          <button class="del" aria-label="{t.remove}: {r.name}" title={t.remove} onclick={() => removeRow(r.id)}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg>
          </button>
        </li>
      {:else}
        {#if !q.trim()}<li class="empty">{t.empty}</li>{:else if exact}<li class="empty">{t.noResults}</li>{/if}
      {/each}
    </ul>

    <footer>
      <button onclick={exportJson}>{t.exportBtn}</button>
      <button onclick={openImport}>{t.importBtn}</button>
      <button onclick={openOptions}>{t.settings}</button>
    </footer>
  </main>
{/if}

<style>
  main {
    width: 400px;
    height: 590px;
    display: flex;
    flex-direction: column;
    font-size: 12.5px;
  }
  header {
    display: flex;
    align-items: center;
    gap: 7px;
    padding: 10px 12px;
    border-bottom: 1px solid var(--line);
    font-weight: 700;
    font-size: 13.5px;
  }
  header a {
    display: inline-flex;
    border-radius: 4px;
    /* Align the logo's wordmark baseline with the text baseline. */
    position: relative;
    top: 1px;
  }
  header a img {
    display: block;
  }
  header a:hover img {
    filter: brightness(1.15);
  }
  header a.kofi {
    gap: 5px;
    align-items: center;
    margin-left: auto;
    top: 0;
    padding: 3px 8px;
    border: 1px solid var(--line-hi);
    border-radius: 6px;
    color: var(--fg-dim);
    font-size: 11.5px;
    font-weight: 500;
    text-decoration: none;
  }
  header a.kofi:hover {
    border-color: var(--accent);
    color: var(--accent);
  }
  .by {
    font-weight: 400;
    color: var(--fg-dim);
  }
  .top {
    display: grid;
    grid-template-columns: auto 1fr;
    gap: 6px 12px;
    align-items: start;
    padding: 8px 12px;
    border-bottom: 1px solid var(--line);
  }
  .lbl {
    padding-top: 3px;
    font-size: 11.5px;
    color: var(--fg-dim);
  }
  .plats {
    display: flex;
    gap: 14px;
  }
  .secs {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 2px 12px;
  }
  .ck {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    min-height: 22px;
    font-size: 12px;
    cursor: pointer;
  }
  input[type='checkbox'] {
    width: 15px;
    height: 15px;
    margin: 0;
    accent-color: var(--accent);
    cursor: pointer;
  }
  .tsr {
    display: flex;
    align-items: center;
    gap: 8px;
    padding-right: 12px;
    border-bottom: 1px solid var(--line);
  }
  .tabs {
    display: flex;
    flex: none;
    padding-left: 6px;
  }
  .tabs button {
    height: 36px;
    padding: 0 6px;
    border: 0;
    border-bottom: 2px solid transparent;
    background: transparent;
    color: var(--fg-dim);
    font-size: 12.5px;
  }
  .tabs button[aria-selected='true'] {
    border-bottom-color: var(--accent);
    color: var(--fg);
    font-weight: 600;
  }
  .search {
    flex: 1;
    min-width: 0;
    height: 28px;
    padding: 0 10px;
    border-radius: 7px;
    border: 1px solid var(--line-hi);
    background: var(--bg-deep);
    font-size: 12px;
  }
  .list {
    flex-grow: 1;
    overflow-y: auto;
    scrollbar-gutter: stable;
    margin: 0;
    padding: 0 4px;
    list-style: none;
  }
  .list li {
    display: flex;
    align-items: center;
    gap: 6px;
    min-height: 32px;
    padding: 0 8px;
    border-bottom: 1px solid var(--line);
  }
  .list li:not(.head):not(.empty):not(.hint):hover {
    background: var(--bg-hi);
  }
  .list .head {
    position: sticky;
    top: 0;
    z-index: 1;
    min-height: 26px;
    background: var(--bg);
    color: var(--fg-dim);
    font-size: 11px;
  }
  .head > span:first-child,
  .name {
    flex: 1;
    min-width: 0;
  }
  .name {
    font-weight: 500;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .col {
    width: 44px;
    flex: none;
    display: flex;
    justify-content: center;
  }
  .xsp {
    width: 24px;
    flex: none;
  }
  .list .hint {
    color: var(--accent);
    font-size: 12px;
  }
  .list .empty {
    color: var(--fg-dim);
    padding: 14px 8px;
    border: 0;
  }
  .del {
    flex: none;
    width: 24px;
    height: 24px;
    border-radius: 5px;
    border: 0;
    background: transparent;
    color: var(--fg-dim);
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .del:hover {
    background: var(--line-hi);
    color: var(--fg);
  }
  footer {
    display: flex;
    gap: 6px;
    padding: 6px 12px;
    border-top: 1px solid var(--line);
  }
  footer button {
    flex: 1;
    height: 30px;
    border-radius: 7px;
    border: 1px solid var(--line-hi);
    background: transparent;
    font-size: 12.5px;
  }
  footer button:hover {
    background: var(--bg-hi);
  }
  .heart {
    color: #e5484d;
    vertical-align: -2px;
  }
</style>
