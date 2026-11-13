import type { IssueId, Party, PartyId, PlatformPlank } from '../engine/types';

type PlatformTable = Record<IssueId, [position: number, weight: number]>;

function platform(table: PlatformTable): Record<IssueId, PlatformPlank> {
  return Object.fromEntries(
    Object.entries(table).map(([id, [position, weight]]) => [id, { position, weight }]),
  ) as Record<IssueId, PlatformPlank>;
}

/** Fictional parties — easy to map to real life, but not the real ones. */
export const PARTIES: Record<PartyId, Party> = {
  DU: {
    id: 'DU',
    name: 'Democratic Union',
    nickname: 'the Blues',
    mascot: 'the Mule',
    color: '#2f6fd6',
    platform: platform({
      taxes: [-1.5, 0.8],
      min_wage: [-1.5, 0.7],
      healthcare: [-1.5, 0.9],
      guns: [-1.5, 0.7],
      abortion: [-2, 1],
      lgbtq: [-1.8, 0.8],
      immigration: [-1.3, 0.7],
      climate: [-1.6, 0.8],
      industry: [-1, 0.5],
      policing: [-0.8, 0.5],
      education: [-1.5, 0.6],
      housing: [-1.2, 0.5],
      transit: [-1.3, 0.4],
      labor: [-1.7, 0.8],
      cannabis: [-1.2, 0.3],
      small_biz: [-0.8, 0.4],
    }),
  },
  RP: {
    id: 'RP',
    name: 'Republic Party',
    nickname: 'the Reds',
    mascot: 'the Mammoth',
    color: '#d6402f',
    platform: platform({
      taxes: [1.8, 1],
      min_wage: [1.3, 0.6],
      healthcare: [1.4, 0.7],
      guns: [1.8, 0.9],
      abortion: [1.6, 0.9],
      lgbtq: [1.2, 0.6],
      immigration: [1.7, 0.9],
      climate: [1.3, 0.6],
      industry: [0.8, 0.4],
      policing: [1.5, 0.7],
      education: [1.4, 0.6],
      housing: [1, 0.4],
      transit: [1, 0.3],
      labor: [1.5, 0.6],
      cannabis: [0.8, 0.3],
      small_biz: [1.7, 0.8],
    }),
  },
};

export const PARTY_IDS: PartyId[] = ['DU', 'RP'];
