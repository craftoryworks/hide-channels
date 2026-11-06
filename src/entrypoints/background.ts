import { browser } from 'wxt/browser';
import { defineBackground } from 'wxt/utils/define-background';

export default defineBackground(() => {
  browser.runtime.onInstalled.addListener(({ reason }) => {
    if (reason === 'install') browser.tabs.create({ url: browser.runtime.getURL('/options.html?welcome') });
  });
  browser.runtime.onMessage.addListener((msg: unknown, sender) => {
    if (sender.id !== browser.runtime.id) return;
    const m = msg as { type?: string; hash?: string };
    if (m?.type !== 'openOptions') return;
    const hash = m.hash && /^[a-z]+$/.test(m.hash) ? `#${m.hash}` : '';
    browser.tabs.create({ url: browser.runtime.getURL(`/options.html${hash}`) });
  });
});
