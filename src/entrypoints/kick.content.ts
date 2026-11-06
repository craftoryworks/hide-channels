import { defineContentScript } from 'wxt/utils/define-content-script';
import { startEngine } from '../content/engine';
import { kick } from '../platforms/kick/adapter';

export default defineContentScript({
  // Only the main site: dashboard. and player. have nothing to hide.
  matches: ['https://kick.com/*', 'https://www.kick.com/*'],
  runAt: 'document_start',
  main(ctx) {
    startEngine(kick, ctx);
  },
});
