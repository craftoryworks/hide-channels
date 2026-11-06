import { defineContentScript } from 'wxt/utils/define-content-script';
import { startEngine } from '../content/engine';
import { twitch } from '../platforms/twitch/adapter';

export default defineContentScript({
  // Only the main site: dashboard., dev., help., clips., player. have nothing to hide.
  matches: ['https://www.twitch.tv/*', 'https://twitch.tv/*'],
  excludeMatches: ['https://www.twitch.tv/popout/*'],
  runAt: 'document_start',
  main(ctx) {
    startEngine(twitch, ctx);
  },
});
