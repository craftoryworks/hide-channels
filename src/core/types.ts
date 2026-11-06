import type { LangSetting } from '../locales/langs';

export type Platform = 'twitch' | 'kick';
export type PlatformFlags = Record<Platform, boolean>;

export interface ChannelEntry {
  login: string;
  displayName?: string;
  on: PlatformFlags;
  addedAt: number;
}

export interface CategoryEntry {
  key: string;
  name: string;
  slugs: Partial<Record<Platform, string>>;
  on: PlatformFlags;
  addedAt: number;
}

/** Page sections that can be hidden as a whole. */
export type SectionId = 'carousel' | 'sidebarChannels' | 'sidebarCategories' | 'sidebarSimilar';
export const SECTIONS: readonly SectionId[] = [
  'carousel',
  'sidebarChannels',
  'sidebarCategories',
  'sidebarSimilar',
];

export interface Settings {
  enabled: PlatformFlags;
  sections: Record<SectionId, boolean>;
  fillFollowed: boolean;
  /** What a hidden tile becomes: removed from the grid, or a neutral placeholder keeping its spot. */
  hiddenTiles: 'placeholder' | 'remove' | 'removeAlways';
  /** The user has used "Change this" on a placeholder once; stop offering it. */
  phHintDone: boolean;
  lang: LangSetting;
}

export interface Data {
  v: 1;
  channels: Record<string, ChannelEntry>;
  categories: Record<string, CategoryEntry>;
  settings: Settings;
}
