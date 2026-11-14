import type { EventCard, RegionType } from '../engine/types';

export const EVENT_CARDS: EventCard[] = [
  // Basic — always in hand, never consumed.
  {
    id: 'door_knocking', name: 'Door-knocking', basic: true, cost: 0, energy: 2, medium: 'inPerson', skills: ['charisma'],
    reach: 0.04, persuasion: 0.06, spillover: 0, gaffeRisk: false,
    description: 'Slow, cheap and personal. Works best where people still answer the door.',
  },
  {
    id: 'social_post', name: 'Social post', basic: true, cost: 0, energy: 1, medium: 'social', skills: ['charisma'],
    reach: 0.03, persuasion: 0.02, spillover: 0.2, gaffeRisk: false,
    description: 'Free, fast, and a little of it leaks statewide.',
  },
  {
    id: 'call_time', name: 'Call time', basic: true, cost: 0, energy: 1, medium: 'inPerson', skills: ['economics'],
    reach: 0, persuasion: 0, spillover: 0, gaffeRisk: false, fundraising: 1200,
    description: 'An afternoon dialing donors. Raises Economics × $1.2k × (0.5 + your local recognition).',
  },
  // Consumable — bought or dealt, used once.
  {
    id: 'town_hall', name: 'Town hall', basic: false, cost: 5000, energy: 2, medium: 'inPerson', skills: ['charisma'],
    reach: 0.06, persuasion: 0.1, spillover: 0, gaffeRisk: false,
    description: 'Take questions in a school gym. Strong persuasion, local only.',
  },
  {
    id: 'radio_interview', name: 'Local radio interview', basic: false, cost: 8000, energy: 1, medium: 'radio', skills: ['charisma'],
    reach: 0.08, persuasion: 0.05, spillover: 0, gaffeRisk: false,
    description: 'Morning drive-time. Big in rural and Rust Belt regions.',
  },
  {
    id: 'local_tv_ad', name: 'Local TV ad buy', basic: false, cost: 40000, energy: 1, medium: 'tv', skills: ['charisma'],
    reach: 0.15, persuasion: 0.06, spillover: 0.15, gaffeRisk: false,
    description: 'Thirty seconds between the weather and the game. Pure reach.',
  },
  {
    id: 'cable_interview', name: 'Cable news interview', basic: false, cost: 25000, energy: 1, medium: 'cable', skills: ['charisma'],
    reach: 0.12, persuasion: 0.08, spillover: 0.5, gaffeRisk: true,
    description: 'A national booking. Half the state hears it — in their own way.',
  },
  {
    id: 'social_campaign', name: 'Social media campaign', basic: false, cost: 30000, energy: 1, medium: 'social', skills: ['charisma'],
    reach: 0.14, persuasion: 0.05, spillover: 0.4, gaffeRisk: false,
    description: 'Paid, targeted, shareable. Travels well beyond the target region.',
  },
  {
    id: 'podcast_tour', name: 'Podcast tour', basic: false, cost: 15000, energy: 2, medium: 'social', skills: ['charisma'],
    reach: 0.08, persuasion: 0.09, spillover: 0.3, gaffeRisk: false,
    description: 'Long-form conversations. Persuasive with younger, online voters.',
  },
  {
    id: 'arena_rally', name: 'Arena rally', basic: false, cost: 120000, energy: 3, medium: 'inPerson', skills: ['charisma'],
    reach: 0.2, persuasion: 0.14, spillover: 0.2, gaffeRisk: false,
    description: 'Fill an arena. Expensive, exhausting, unforgettable.',
  },
  {
    id: 'fundraising_dinner', name: 'Fundraising dinner', basic: false, cost: 10000, energy: 2, medium: 'inPerson', skills: ['economics'],
    reach: 0.02, persuasion: 0, spillover: 0, gaffeRisk: false, fundraising: 3000,
    description: 'Rubber chicken and big checks. Raises Economics × $3k × (0.5 + your local recognition).',
  },
  {
    id: 'party_unity', name: 'Party unity event', basic: false, cost: 20000, energy: 2, medium: 'inPerson', skills: ['leadership'],
    reach: 0.05, persuasion: 0.03, spillover: 0, gaffeRisk: false, partyStanding: 4, requiresParty: true,
    description: 'Headline a party dinner and campaign for the ticket. +4 party standing (more with Leadership).',
  },
  {
    id: 'debate', name: 'Televised debate', basic: false, cost: 0, energy: 2, medium: 'tv', skills: ['charisma', 'strategy'],
    reach: 0.18, persuasion: 0.15, spillover: 0.6, gaffeRisk: true,
    description: 'Face your opponents live. High reward, real risk.',
  },
];

export const EVENT_CARDS_BY_ID: Record<string, EventCard> = Object.fromEntries(EVENT_CARDS.map((c) => [c.id, c]));

export const BASIC_CARD_IDS = EVENT_CARDS.filter((c) => c.basic).map((c) => c.id);

/** Dealt free when filing for a race; everything else is bought in the Market. */
export const STARTER_HAND = ['town_hall', 'radio_interview', 'debate'];

/** Relative chance of each card appearing in the Market. Debates are dealt, never sold. */
export const MARKET_WEIGHTS: Record<string, number> = {
  town_hall: 3,
  radio_interview: 3,
  local_tv_ad: 2,
  cable_interview: 2,
  social_campaign: 2,
  podcast_tour: 2,
  fundraising_dinner: 2,
  arena_rally: 1,
  party_unity: 2,
};

/** Media markets differ in price: an ad in NYC costs far more than one in Watertown. */
export const MARKET_COST_FACTOR: Record<RegionType, number> = {
  rural: 0.6,
  midsize: 0.8,
  suburban: 1,
  urban: 1.5,
};

export function getEventCard(id: string): EventCard {
  const card = EVENT_CARDS_BY_ID[id];
  if (!card) throw new Error(`Unknown event card: ${id}`);
  return card;
}
