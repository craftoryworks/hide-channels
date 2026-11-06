import { normLogin } from '../core/normalize';
import { slugFromHref } from '../platforms/kick/urls';
import { loginFromHref } from '../platforms/twitch/urls';

const SITE = /^(?:https?:\/\/)?(?:(?:www|m)\.)?(twitch\.tv|kick\.com)\//i;

/**
 * Channel typed or pasted into the popup: "xqc", "@xqc", "kick.com/xqc", "m.twitch.tv/xqc",
 * "https://www.twitch.tv/xqc/videos". Undefined for anything that can't be a channel, including
 * reserved paths like "twitch.tv/directory" and links to other sites.
 */
export function loginFromInput(v: string): string | undefined {
  const s = v.trim().replace(/^@/, '');
  const site = SITE.exec(s);
  if (!site && /[./]/.test(s)) return undefined;
  const seg = (site ? s.slice(site[0].length) : s).split(/[/?#]/)[0] ?? '';
  const href = `/${normLogin(seg)}`;
  // A link decides the site; a bare name may be a channel on either one.
  if (site) return site[1]?.toLowerCase() === 'twitch.tv' ? loginFromHref(href) : slugFromHref(href);
  return loginFromHref(href) ?? slugFromHref(href);
}
