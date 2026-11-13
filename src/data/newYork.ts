import type { IssueId, MediaChannel, Office, Region, UsState } from '../engine/types';

/** [average opinion −2..+2, salience 0..1] per issue. */
type IssueTable = Record<IssueId, [opinion: number, salience: number]>;

function split(table: IssueTable) {
  const issueOpinion = {} as Record<IssueId, number>;
  const issueSalience = {} as Record<IssueId, number>;
  for (const [id, [o, s]] of Object.entries(table) as [IssueId, [number, number]][]) {
    issueOpinion[id] = o;
    issueSalience[id] = s;
  }
  return { issueOpinion, issueSalience };
}

function media(tv: number, cable: number, social: number, inPerson: number, radio: number): Record<MediaChannel, number> {
  return { tv, cable, social, inPerson, radio };
}

export const NY_REGIONS: Region[] = [
  {
    id: 'ny-nyc',
    state: 'NY',
    name: 'New York City',
    seatCity: 'New York City',
    type: 'urban',
    population: 8_400_000,
    turnout: 0.52,
    partisanLean: -0.6,
    blurb: 'Dense, diverse and loud. Rent, subways and policing dominate; a cable hit lands harder here than anywhere.',
    media: media(1.0, 1.3, 1.4, 1.1, 0.6),
    ...split({
      taxes: [-0.9, 0.6],
      min_wage: [-1.3, 0.6],
      healthcare: [-1.3, 0.6],
      guns: [-1.5, 0.6],
      abortion: [-1.5, 0.5],
      lgbtq: [-1.5, 0.6],
      immigration: [-1.0, 0.7],
      climate: [-1.2, 0.5],
      industry: [-0.4, 0.3],
      policing: [-0.2, 0.9],
      education: [-0.8, 0.6],
      housing: [-1.5, 1.0],
      transit: [-1.8, 0.9],
      labor: [-1.2, 0.6],
      cannabis: [-1.2, 0.3],
      small_biz: [-0.2, 0.5],
    }),
  },
  {
    id: 'ny-suburbs',
    state: 'NY',
    name: 'Long Island & Hudson Valley',
    seatCity: 'White Plains',
    type: 'suburban',
    population: 4_900_000,
    turnout: 0.6,
    partisanLean: -0.1,
    blurb: 'Commuter towns and cul-de-sacs. Property taxes, schools and safety decide close races; local TV still rules.',
    media: media(1.4, 1.1, 1.0, 0.9, 0.9),
    ...split({
      taxes: [0.9, 1.0],
      min_wage: [-0.3, 0.4],
      healthcare: [-0.3, 0.6],
      guns: [-0.6, 0.5],
      abortion: [-0.8, 0.6],
      lgbtq: [-0.6, 0.4],
      immigration: [0.4, 0.6],
      climate: [-0.5, 0.4],
      industry: [0.1, 0.3],
      policing: [0.8, 0.8],
      education: [-0.6, 0.9],
      housing: [1.1, 0.7],
      transit: [-0.2, 0.6],
      labor: [-0.2, 0.4],
      cannabis: [-0.3, 0.3],
      small_biz: [0.7, 0.5],
    }),
  },
  {
    id: 'ny-wny',
    state: 'NY',
    name: 'Western New York',
    seatCity: 'Buffalo',
    type: 'midsize',
    population: 2_900_000,
    turnout: 0.56,
    partisanLean: 0.05,
    blurb: 'Rust Belt pride. Factory jobs, unions and the cost of a winter heating bill; radio and local TV carry the message.',
    media: media(1.2, 0.9, 0.9, 1.1, 1.2),
    ...split({
      taxes: [0.4, 0.7],
      min_wage: [-0.6, 0.6],
      healthcare: [-0.5, 0.6],
      guns: [0.4, 0.6],
      abortion: [-0.2, 0.5],
      lgbtq: [-0.2, 0.3],
      immigration: [0.3, 0.4],
      climate: [0.2, 0.4],
      industry: [-1.3, 1.0],
      policing: [0.5, 0.6],
      education: [-0.7, 0.6],
      housing: [-0.3, 0.4],
      transit: [0.4, 0.3],
      labor: [-1.1, 0.9],
      cannabis: [-0.4, 0.2],
      small_biz: [0.4, 0.6],
    }),
  },
  {
    id: 'ny-north',
    state: 'NY',
    name: 'North Country & Southern Tier',
    seatCity: 'Watertown',
    type: 'rural',
    population: 3_300_000,
    turnout: 0.58,
    partisanLean: 0.4,
    blurb: 'Farms, forests and Fort Drum. Guns, energy prices and being forgotten by Albany; talk radio and showing up in person matter.',
    media: media(1.0, 0.7, 0.7, 1.4, 1.4),
    ...split({
      taxes: [1.3, 0.8],
      min_wage: [0.6, 0.4],
      healthcare: [0.2, 0.6],
      guns: [1.7, 0.9],
      abortion: [0.8, 0.6],
      lgbtq: [0.9, 0.4],
      immigration: [1.1, 0.6],
      climate: [1.2, 0.7],
      industry: [-0.2, 0.6],
      policing: [1.1, 0.5],
      education: [0.3, 0.5],
      housing: [1.2, 0.3],
      transit: [1.5, 0.3],
      labor: [0.5, 0.4],
      cannabis: [0.6, 0.3],
      small_biz: [1.4, 0.7],
    }),
  },
];

export const NEW_YORK: UsState = {
  id: 'NY',
  name: 'New York',
  regionIds: NY_REGIONS.map((r) => r.id),
  chapterPlatform: {
    // NY Blues are a bit more progressive on cities, a bit softer on guns upstate.
    DU: { transit: -1.8, housing: -1.6, guns: -1.3, industry: -1.3 },
    // NY Reds run as tax-cutters first; softer on social issues than the national party.
    RP: { taxes: 2, abortion: 0.8, lgbtq: 0.4, policing: 1.8 },
  },
};

const ALL_NY = NEW_YORK.regionIds;

export const NY_OFFICES: Office[] = [
  { id: 'mayor-nyc', level: 'mayor', name: 'Mayor of New York City', state: 'NY', regionIds: ['ny-nyc'], termYears: 4, cycle: { every: 4, offset: 1 }, partisan: false },
  { id: 'mayor-buffalo', level: 'mayor', name: 'Mayor of Buffalo', state: 'NY', regionIds: ['ny-wny'], termYears: 4, cycle: { every: 4, offset: 1 }, partisan: false },
  { id: 'mayor-watertown', level: 'mayor', name: 'Mayor of Watertown', state: 'NY', regionIds: ['ny-north'], termYears: 4, cycle: { every: 4, offset: 3 }, partisan: false },
  { id: 'house-ny-nyc', level: 'house', name: 'U.S. House — New York City', state: 'NY', regionIds: ['ny-nyc'], termYears: 2, cycle: { every: 2, offset: 0 }, partisan: true, nominationStanding: 40 },
  { id: 'house-ny-suburbs', level: 'house', name: 'U.S. House — Long Island & Hudson Valley', state: 'NY', regionIds: ['ny-suburbs'], termYears: 2, cycle: { every: 2, offset: 0 }, partisan: true, nominationStanding: 40 },
  { id: 'house-ny-wny', level: 'house', name: 'U.S. House — Western New York', state: 'NY', regionIds: ['ny-wny'], termYears: 2, cycle: { every: 2, offset: 0 }, partisan: true, nominationStanding: 40 },
  { id: 'house-ny-north', level: 'house', name: 'U.S. House — North Country & Southern Tier', state: 'NY', regionIds: ['ny-north'], termYears: 2, cycle: { every: 2, offset: 0 }, partisan: true, nominationStanding: 40 },
  // Two staggered Senate seats abstracted as one race every 2 years.
  { id: 'senate-ny', level: 'senate', name: 'U.S. Senate — New York', state: 'NY', regionIds: ALL_NY, termYears: 6, cycle: { every: 2, offset: 0 }, partisan: true, nominationStanding: 60 },
  { id: 'governor-ny', level: 'governor', name: 'Governor of New York', state: 'NY', regionIds: ALL_NY, termYears: 4, cycle: { every: 4, offset: 2 }, partisan: true, nominationStanding: 60 },
];
