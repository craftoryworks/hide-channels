import type { CategoryRef } from '../core/data';
import type { Platform, SectionId } from '../core/types';

/**
 * tile   - card in a grid (X in the corner + pending overlay)
 * row    - sidebar row (small X + compact pending overlay)
 * mini   - collapsed sidebar avatar (no X)
 * search - search dropdown / results (no X)
 */
export type ItemKind = 'tile' | 'row' | 'mini' | 'search';

export interface Item {
  /** Element that gets hidden / overlaid. */
  el: HTMLElement;
  kind: ItemKind;
  login?: string;
  displayName?: string;
  category?: CategoryRef;
  /** The item itself is a category (category tile / category row). */
  isCategory?: boolean;
}

/** A whole page section that can be switched off (sidebar group, carousel). */
export interface Section {
  id: SectionId;
  el: HTMLElement;
  /** Where the "hide section" X goes. Missing = no X (e.g. carousel has its own menu). */
  header?: HTMLElement | null;
  /** Elements outside el that belong to the section (e.g. its "show more" buttons). */
  extra?: HTMLElement[];
}

/** Featured carousel on the home page: we skip hidden channels instead of removing slides. */
export interface Carousel {
  el: HTMLElement;
  /** Element of the visible slide; gets the X menu. */
  slide: HTMLElement;
  login?: string;
  displayName?: string;
  category?: CategoryRef;
  next(): void;
  /** Side thumbnails of other slides (Twitch) - blanked when hidden. */
  ghosts: { el: HTMLElement; login: string }[];
}

export interface ChannelPage {
  login: string;
  displayName?: string;
  /** Flex container next to the Follow button. */
  actions?: HTMLElement | null;
  categoryLink?: HTMLElement | null;
  category?: CategoryRef;
}

export interface Adapter {
  platform: Platform;
  items(doc: Document): Item[];
  sections(doc: Document): Section[];
  carousel(doc: Document): Carousel | undefined;
  /** Followed channels group and its "show more" button (for filling freed space). */
  followed(doc: Document): { el: HTMLElement; more: HTMLElement | null } | undefined;
  channelPage(doc: Document): ChannelPage | undefined;
  /** Category of the current page, if the user opened a category directly. */
  pageCategory(doc: Document): CategoryRef | undefined;
  /** Selectors of busy areas (chat) whose DOM changes never need a rescan. */
  noise?: string[];
  /** The video player: ignored everywhere except the home page, where the carousel lives in it. */
  player?: string[];
}
