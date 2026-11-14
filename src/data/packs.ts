import type { PackKind, PackTier, Rarity } from '../engine/types';

/** Cards in every pack. */
export const PACK_SIZE = 3;

/** Chance of each rarity per card, by pack tier. Regular packs never hold a legendary. */
export const PACK_ODDS: Record<PackTier, Record<Rarity, number>> = {
  regular: { common: 75, rare: 22, epic: 3, legendary: 0 },
  golden: { common: 30, rare: 45, epic: 20, legendary: 5 },
  elite: { common: 0, rare: 35, epic: 45, legendary: 20 },
};

export const PACK_PRICE: Record<PackKind, Record<PackTier, number>> = {
  people: { regular: 8_000, golden: 30_000, elite: 100_000 },
  policy: { regular: 6_000, golden: 25_000, elite: 90_000 },
  campaign: { regular: 6_000, golden: 25_000, elite: 90_000 },
};

export const PACK_KIND_LABEL: Record<PackKind, string> = {
  people: 'People',
  policy: 'Political events',
  campaign: 'Campaign actions',
};

export const PACK_TIER_LABEL: Record<PackTier, string> = {
  regular: 'Regular',
  golden: 'Golden',
  elite: 'Elite',
};

/** People packs: keep any of them. Event and action packs: keep one. */
export const PACK_KEEP: Record<PackKind, 'any' | 'one'> = { people: 'any', policy: 'one', campaign: 'one' };
