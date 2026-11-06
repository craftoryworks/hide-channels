<script lang="ts">
import { tick } from 'svelte';
import { browser } from 'wxt/browser';
import logo from '../../assets/craftory-logo-on-dark.svg';
import { mergeInto, migrate } from '../../core/data';
import { backup, load, update, watch } from '../../core/store';
import type { Data, Settings } from '../../core/types';
import { LANG_NAMES, LANGS } from '../../locales/langs';
import { exportJson } from '../../ui/file';
import { ui } from '../../ui/i18n';
import PinGuide from './PinGuide.svelte';
import TilesPreview from './TilesPreview.svelte';

let data = $state<Data | undefined>();
let msg = $state('');
const version = browser.runtime.getManifest().version;
const REPO = 'https://github.com/craftoryworks/hide-channels';
const welcome = new URLSearchParams(location.search).has('welcome');
const t = $derived(ui(data?.settings.lang));
/** "Automatic" first, then languages alphabetically by their own names. */
const LANGS_SORTED = [...LANGS].sort((a, b) => LANG_NAMES[a].localeCompare(LANG_NAMES[b]));

load().then(async (d) => {
  data = d;
  // The page renders after the data loads, so jump to #data / #hidden only then.
  await tick();
  if (location.hash) document.getElementById(location.hash.slice(1))?.scrollIntoView();
});
watch((d) => (data = d));

function setLang(e: Event) {
  const v = (e.currentTarget as HTMLSelectElement).value as Settings['lang'];
  update((d) => {
    d.settings.lang = v;
  });
}

function setFill(e: Event) {
  const v = (e.currentTarget as HTMLInputElement).checked;
  update((d) => {
    d.settings.fillFollowed = v;
  });
}

function setHiddenTiles(e: Event) {
  const v = (e.currentTarget as HTMLInputElement).value as Settings['hiddenTiles'];
  update((d) => {
    d.settings.hiddenTiles = v;
  });
}

async function onFile(e: Event) {
  const input = e.currentTarget as HTMLInputElement;
  const file = input.files?.[0];
  input.value = '';
  if (!file) return;
  // A real list is well under 1 MB; refuse anything absurd before reading it into memory.
  if (file.size > 5_000_000) {
    msg = t.importErr;
    return;
  }
  try {
    const incoming = migrate(JSON.parse(await file.text()));
    await backup();
    await update((d) => mergeInto(d, incoming));
    msg = t.importOk(
      t.importChannels(Object.keys(incoming.channels).length),
      t.importCategories(Object.keys(incoming.categories).length),
    );
  } catch {
    msg = t.importErr;
  }
}
</script>

{#if data}
  <main>
    <h1>{t.optTitle}</h1>

    <section>
      <h2>{t.general}</h2>
      <label class="row">
        <span>{t.language}</span>
        <select value={data.settings.lang} onchange={setLang}>
          <option value="auto">{t.langAuto}</option>
          {#each LANGS_SORTED as l}<option value={l}>{LANG_NAMES[l]}</option>{/each}
        </select>
      </label>
      <p class="dim">{t.reload}</p>
    </section>

    <section class:welcome>
      <h2>{t.pinTitle}</h2>
        <p>
          {t.pinText[0]}
          <!-- Material Symbols "extension" and "keep" (Apache-2.0), same glyphs as Chrome's toolbar -->
          <svg class="ico" viewBox="0 -960 960 960" aria-hidden="true"><path d="M352-120H200q-33 0-56.5-23.5T120-200v-152q48 0 84-30.5t36-77.5q0-47-36-77.5T120-568v-152q0-33 23.5-56.5T200-800h160q0-42 29-71t71-29q42 0 71 29t29 71h160q33 0 56.5 23.5T800-720v160q42 0 71 29t29 71q0 42-29 71t-71 29v160q0 33-23.5 56.5T720-120H568q0-50-31.5-85T460-240q-45 0-76.5 35T352-120Zm-152-80h85q24-66 77-93t98-27q45 0 98 27t77 93h85v-240h80q8 0 14-6t6-14q0-8-6-14t-14-6h-80v-240H480v-80q0-8-6-14t-14-6q-8 0-14 6t-6 14v80H200v88q54 20 87 67t33 105q0 57-33 104t-87 68v88Zm260-260Z"/></svg>
          {t.pinText[1]}
          <svg class="ico" viewBox="0 -960 960 960" aria-hidden="true"><path d="m640-480 80 80v80H520v240l-40 40-40-40v-240H240v-80l80-80v-280h-40v-80h400v80h-40v280Zm-286 80h252l-46-46v-314H400v314l-46 46Zm126 0Z"/></svg>
          {t.pinText[2]}
        </p>
      <PinGuide title={t.extMenu} other={t.extOther} />
    </section>

    <section id="hidden">
      <h2>{t.hiddenTiles}</h2>
      <div class="modes">
        {#each [['placeholder', t.hiddenPlaceholder], ['remove', t.hiddenRemove], ['removeAlways', t.hiddenRemoveAlways]] as const as [v, label]}
          <label class="mode" class:sel={data.settings.hiddenTiles === v}>
            <span class="mhead">
              <input type="radio" name="hiddenTiles" value={v} checked={data.settings.hiddenTiles === v} onchange={setHiddenTiles} />
              <span>{label}</span>
            </span>
            {#if v !== 'removeAlways'}<TilesPreview mode={v} label={t.phPreview} />{/if}
          </label>
        {/each}
      </div>
      <p class="dim">{t.hiddenNote}</p>
    </section>

    <section>
      <label class="row">
        <span>{t.fillFollowed}</span>
        <input type="checkbox" checked={data.settings.fillFollowed} onchange={setFill} />
      </label>
    </section>

    <section id="data">
      <h2>{t.data}</h2>
      <p>{t.importMove}</p>
      <div class="btns">
        <button onclick={exportJson}>{t.exportBtn}</button>
        <label class="btn">
          {t.importBtn}
          <input type="file" accept="application/json,.json" onchange={onFile} />
        </label>
      </div>
      <p class="dim">{t.importInfo}</p>
      {#if msg}<p role="status" class="msg">{msg}</p>{/if}
    </section>
    <section>
      <h2>{t.bugs}</h2>
      <p>{t.bugsText}</p>
      <div class="btns">
        <a class="btn" href="mailto:contact@craftory.works?subject=Hide%20Channels">{t.emailMe}</a>
        <a class="btn" href="{REPO}/issues/" target="_blank" rel="noopener">{t.reportIssue}</a>
      </div>
    </section>

    <section>
      <h2>{t.about}</h2>
      <p><strong>Hide Channels for Twitch &amp; Kick</strong> v{version}</p>
      {#each t.aboutText as line}<p class="dim">{line}</p>{/each}
      <ul class="links">
        <li><a href="{REPO}/blob/main/LICENSE" target="_blank" rel="noopener">{t.license}</a></li>
        <li><a href="{REPO}#disclaimer" target="_blank" rel="noopener">{t.disclaimer}</a></li>
        <li><a href="https://craftory.works/hide-channels/privacy/" target="_blank" rel="noopener">{t.privacy}</a></li>
        <li><a href={REPO} target="_blank" rel="noopener">{t.source}</a></li>
      </ul>
      <p class="kofi">
        {t.supportText}
        <a class="btn" href="https://ko-fi.com/craftory" target="_blank" rel="noopener"><svg class="heart" width="13" height="13" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 21s-7.5-4.6-10-9.3C.3 8.4 2.1 4 6.2 4c2.4 0 3.8 1.4 4.8 2.9C12 5.4 13.4 4 15.8 4 19.9 4 21.7 8.4 20 11.7 17.5 16.4 12 21 12 21z"/></svg> {t.support}</a>
      </p>
    </section>

    <footer>
      <a href="https://craftory.works" target="_blank" rel="noopener">
        <span>{t.madeBy}</span>
        <img src={logo} alt="Craftory" width="150" height="33" />
      </a>
    </footer>
  </main>
{/if}

<style>
  main {
    max-width: 640px;
    margin: 0 auto;
    padding: 32px 16px;
  }
  h1 {
    font-size: 20px;
    margin: 0 0 24px;
  }
  h2 {
    font-size: 13px;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--fg-dim);
    margin: 0 0 12px;
  }
  section {
    padding: 20px;
    margin-bottom: 16px;
    border: 1px solid var(--line);
    border-radius: 12px;
    scroll-margin-top: 16px;
  }
  /* opened from the popup's Import button or a "change this" link */
  section:target {
    border-color: var(--accent);
  }
  .row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    padding: 10px 0;
    cursor: pointer;
  }
  .row input[type='checkbox'] {
    width: 18px;
    height: 18px;
    accent-color: var(--accent);
    flex-shrink: 0;
  }
  select {
    height: 36px;
    padding: 0 10px;
    border-radius: 8px;
    border: 1px solid var(--line-hi);
    background: var(--bg-deep);
  }
  .btns {
    display: flex;
    gap: 8px;
  }
  .btns button,
  .btn {
    height: 40px;
    padding: 0 18px;
    display: inline-flex;
    align-items: center;
    border-radius: 8px;
    border: 1px solid var(--line-hi);
    background: transparent;
    cursor: pointer;
  }
  .btn input {
    position: absolute;
    width: 1px;
    height: 1px;
    opacity: 0;
  }
  .btn:focus-within {
    outline: 2px solid var(--accent);
  }
  .dim {
    color: var(--fg-dim);
    font-size: 13px;
  }
  footer {
    display: flex;
    justify-content: center;
    padding: 16px 0 8px;
  }
  footer a {
    display: inline-flex;
    align-items: center;
    gap: 10px;
    color: var(--fg-dim);
    text-decoration: none;
    font-size: 13px;
  }
  footer a:hover img {
    opacity: 1;
  }
  footer img {
    opacity: 0.85;
  }
  .ico {
    width: 18px;
    height: 18px;
    vertical-align: -4px;
    fill: currentColor;
  }
  .modes {
    display: grid;
    gap: 10px;
  }
  .mode {
    display: grid;
    gap: 10px;
    padding: 12px;
    border: 1px solid var(--line-hi);
    border-radius: 10px;
    cursor: pointer;
  }
  .mode.sel {
    border-color: var(--accent);
  }
  .mhead {
    display: flex;
    align-items: center;
    gap: 10px;
  }
  .mhead input {
    width: 18px;
    height: 18px;
    margin: 0;
    accent-color: var(--accent);
  }
  a.btn {
    color: var(--fg);
    text-decoration: none;
  }
  a.btn:hover {
    border-color: var(--accent);
  }
  .kofi {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    margin: 16px 0 0;
  }
  .kofi .btn {
    flex: none;
    gap: 6px;
  }
  .links {
    margin: 0;
    padding-left: 18px;
  }
  .links a,
  .welcome {
    color: var(--accent);
  }
  .welcome {
    border-color: var(--accent);
  }
  .welcome p {
    color: var(--fg);
  }
  .msg {
    color: var(--accent);
  }
  .heart {
    color: #e5484d;
    vertical-align: -2px;
  }
</style>
