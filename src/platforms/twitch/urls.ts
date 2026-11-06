import { normSlug } from '../../core/normalize';

/** First path segments that are Twitch pages, not channel logins. */
const RESERVED = new Set([
  'directory',
  'search',
  'videos',
  'settings',
  'subscriptions',
  'inventory',
  'wallet',
  'drops',
  'friends',
  'messages',
  'p',
  'downloads',
  'jobs',
  'turbo',
  'store',
  'prime',
  'u',
  'popout',
  'moderator',
  'embed',
  'team',
  'collections',
  'following',
  'login',
  'signup',
  'logout',
  'payments',
  'privacy',
  'legal',
  'bits',
]);

const BASE = 'https://www.twitch.tv';

function path(href: string | null | undefined): string[] | undefined {
  if (!href) return;
  try {
    const u = new URL(href, BASE);
    if (!/(^|\.)twitch\.tv$/.test(u.hostname)) return;
    return u.pathname.split('/').filter(Boolean);
  } catch {
    return;
  }
}

export function loginFromHref(href: string | null | undefined): string | undefined {
  const seg = path(href)?.[0]?.toLowerCase();
  if (!seg || RESERVED.has(seg) || !/^[a-z0-9_]{1,25}$/.test(seg)) return;
  return seg;
}

export function categoryFromHref(href: string | null | undefined): string | undefined {
  const p = path(href);
  if (p?.[0] !== 'directory' || (p[1] !== 'category' && p[1] !== 'game') || !p[2]) return;
  return normSlug(p[2]);
}
