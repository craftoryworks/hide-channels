import { normSlug } from '../../core/normalize';

/** First path segments that are Kick pages, not channel slugs. */
const RESERVED = new Set([
  'browse',
  'category',
  'categories',
  'search',
  'following',
  'dashboard',
  'settings',
  'drops',
  'events',
  'kicks',
  'subscriptions',
  'video',
  'videos',
  'clips',
  'auth',
  'login',
  'signup',
  'home',
  'privacy-policy',
  'terms-of-service',
  'community-guidelines',
  'dmca-policy',
  'cookie-policy',
  'contact',
  'about',
  'popout',
]);

const BASE = 'https://kick.com';

function path(href: string | null | undefined): string[] | undefined {
  if (!href) return;
  try {
    const u = new URL(href, BASE);
    if (!/(^|\.)kick\.com$/.test(u.hostname)) return;
    return u.pathname.split('/').filter(Boolean);
  } catch {
    return;
  }
}

export function slugFromHref(href: string | null | undefined): string | undefined {
  const seg = path(href)?.[0]?.toLowerCase();
  if (!seg || RESERVED.has(seg) || !/^[a-z0-9_-]{2,40}$/.test(seg)) return;
  return seg;
}

export function categoryFromHref(href: string | null | undefined): string | undefined {
  const p = path(href);
  if (p?.[0] !== 'category' || !p[1]) return;
  return normSlug(p[1]);
}
