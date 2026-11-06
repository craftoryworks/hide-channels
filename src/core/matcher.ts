import type { CategoryRef } from './data';
import { baseName, normLogin, normName, normSlug, slugify } from './normalize';
import type { Data, Platform } from './types';

/** Fast lookup of what is hidden on one platform, built from a Data snapshot. */
export class Matcher {
  readonly channels = new Set<string>();
  readonly catSlugs = new Set<string>();
  readonly catNames = new Set<string>();

  constructor(d: Data, platform: Platform) {
    if (!d.settings.enabled[platform]) return;
    for (const c of Object.values(d.channels)) if (c.on[platform]) this.channels.add(c.login);
    for (const c of Object.values(d.categories)) {
      if (!c.on[platform]) continue;
      this.catNames.add(c.key);
      const base = baseName(c.name);
      if (base) this.catNames.add(base);
      const own = c.slugs[platform];
      if (own) this.catSlugs.add(own);
      else for (const s of Object.values(c.slugs)) if (s) this.catSlugs.add(s);
    }
  }

  channel(login?: string): boolean {
    return !!login && this.channels.has(normLogin(login));
  }

  category(ref?: CategoryRef): boolean {
    if (!ref) return false;
    if (ref.slug && this.catSlugs.has(normSlug(ref.slug))) return true;
    if (!ref.name) return false;
    // Kick "Categories for you" tiles only carry an English name; try loose variants.
    const base = baseName(ref.name);
    return (
      this.catNames.has(normName(ref.name)) ||
      (!!base && (this.catNames.has(base) || this.catSlugs.has(slugify(base))))
    );
  }
}
