import {
  ABILITY_KEYS,
  ARCHETYPE_GROUP_WEIGHTS,
  BACKGROUNDS,
  CAREER_ORIGINS,
  FOREIGN_COUNTRY_NAMES,
  HISTORICAL_ERAS,
  PARTY_FOUNDING_IDENTITIES,
  FACTIONS,
  FACTION_ERA_NAMES,
  FIRST_NAMES,
  IDEOLOGY_DIMENSIONS,
  LAST_NAMES,
  PARTIES,
  POPULATION_GROUPS,
  RARITIES,
  SCHEMA_VERSION,
  STARTING_POLITICIANS,
  STATE_BLUEPRINTS
} from './constants.js';

export const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
export const round1 = (value) => Math.round(value * 10) / 10;
export const round2 = (value) => Math.round(value * 100) / 100;

export function makeRng(seed = 19760120) {
  let state = (Number(seed) || 1) >>> 0;
  return {
    next() {
      state = (Math.imul(1664525, state) + 1013904223) >>> 0;
      return state / 4294967296;
    },
    int(min, max) {
      return Math.floor(this.next() * (max - min + 1)) + min;
    },
    pick(items) {
      return items[Math.floor(this.next() * items.length)];
    },
    shuffle(items) {
      const copy = [...items];
      for (let i = copy.length - 1; i > 0; i -= 1) {
        const j = this.int(0, i);
        [copy[i], copy[j]] = [copy[j], copy[i]];
      }
      return copy;
    },
    normal(mean = 0, deviation = 1) {
      const u = Math.max(this.next(), 1e-9);
      const v = Math.max(this.next(), 1e-9);
      return mean + deviation * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
    },
    get seed() { return state >>> 0; }
  };
}

function uniqueName(rng, usedNames) {
  for (let attempts = 0; attempts < 80; attempts += 1) {
    const first = rng.pick(FIRST_NAMES);
    const last = rng.pick(LAST_NAMES);
    const middle = rng.next() < 0.58 ? ` ${String.fromCharCode(65 + rng.int(0, 25))}.` : '';
    const name = `${first}${middle} ${last}`;
    if (!usedNames.has(name)) {
      usedNames.add(name);
      return name;
    }
  }
  const name = `${rng.pick(FIRST_NAMES)} ${rng.pick(LAST_NAMES)} ${usedNames.size + 1}`;
  usedNames.add(name);
  return name;
}

function normalizeWeights(weights) {
  const entries = Object.entries(weights).filter(([, value]) => value > 0);
  const total = entries.reduce((sum, [, value]) => sum + value, 0) || 1;
  return entries.map(([groupId, value]) => ({ groupId, share: round1(value / total * 100) }));
}

function createStateGroups(archetype, rng) {
  const base = ARCHETYPE_GROUP_WEIGHTS[archetype] || ARCHETYPE_GROUP_WEIGHTS.oldEstablishment;
  const jittered = {};
  Object.entries(base).forEach(([key, value]) => { jittered[key] = Math.max(1, value + rng.normal(0, 2.2)); });
  return normalizeWeights(jittered).map((group) => {
    const template = POPULATION_GROUPS.find((item) => item.id === group.groupId);
    return {
      ...group,
      loyaltyUnion: round1(clamp(50 - ((template?.economy ?? 50) - 50) * 0.31 - ((template?.social ?? 50) - 50) * 0.25 + rng.normal(0, 4), 7, 93)),
      enthusiasm: round1(clamp((template?.baseTurnout ?? 60) + rng.normal(0, 4), 30, 94)),
      trust: round1(clamp(58 + ((template?.institutions ?? 50) - 50) * 0.34 + rng.normal(0, 8), 10, 94))
    };
  });
}

function statePopulation(archetype, index, rng) {
  const bases = { coastalMetro: 0.23, industrial: 0.18, sunbelt: 0.16, oldEstablishment: 0.20, agrarian: 0.095, frontier: 0.065, energy: 0.08 };
  let pop = bases[archetype] * Math.exp(rng.normal(0, 0.48));
  if ([2, 22, 28, 35, 41].includes(index)) pop *= 2.35;
  return round1(clamp(pop, 0.03, 0.85));
}

function allocateHouseSeats(states) {
  const totalPopulation = states.reduce((sum, state) => sum + state.population, 0);
  const seats = Object.fromEntries(states.map((state) => [state.id, 1]));
  const raw = states.map((state) => {
    const quota = (state.population / totalPopulation) * 385;
    return { id: state.id, floor: Math.floor(quota), remainder: quota - Math.floor(quota) };
  });
  raw.forEach((item) => { seats[item.id] += item.floor; });
  let assigned = Object.values(seats).reduce((sum, value) => sum + value, 0);
  raw.sort((a, b) => b.remainder - a.remainder);
  let cursor = 0;
  while (assigned < 435) {
    seats[raw[cursor % raw.length].id] += 1;
    assigned += 1;
    cursor += 1;
  }
  return seats;
}

function createStateMetrics(archetype, rng) {
  const archetypeAdjustments = {
    coastalMetro: { gdp: 11, education: 8, health: 4, infrastructure: 4, crime: 5, rights: 7, environment: 5 },
    industrial: { gdp: 1, education: 0, health: 0, infrastructure: 3, crime: 1, rights: 0, environment: -3 },
    sunbelt: { gdp: 4, education: -1, health: -2, infrastructure: 1, crime: 2, rights: -1, environment: -2 },
    oldEstablishment: { gdp: 6, education: 6, health: 4, infrastructure: 3, crime: 0, rights: 4, environment: 2 },
    agrarian: { gdp: -10, education: -6, health: -7, infrastructure: -5, crime: -3, rights: -2, environment: 1 },
    frontier: { gdp: -4, education: -4, health: -5, infrastructure: -6, crime: -1, rights: 0, environment: 3 },
    energy: { gdp: 5, education: -3, health: -2, infrastructure: 0, crime: 0, rights: -2, environment: -9 }
  };
  const a = archetypeAdjustments[archetype] || {};
  return {
    gdpPerCapita: round1(clamp(61 + (a.gdp || 0) + rng.normal(0, 8), 35, 98)),
    growth: round1(clamp(rng.normal(2.2, 1.15), -2.5, 6.5)),
    unemployment: round1(clamp(rng.normal(5.2, 1.1), 2.4, 10.5)),
    income: round1(clamp(58 + (a.gdp || 0) * 0.6 + rng.normal(0, 7), 34, 94)),
    budget: round1(clamp(rng.normal(0, 3), -9, 9)),
    education: round1(clamp(57 + (a.education || 0) + rng.normal(0, 7), 30, 92)),
    health: round1(clamp(57 + (a.health || 0) + rng.normal(0, 7), 30, 92)),
    infrastructure: round1(clamp(55 + (a.infrastructure || 0) + rng.normal(0, 8), 28, 92)),
    crime: round1(clamp(48 + (a.crime || 0) + rng.normal(0, 8), 20, 82)),
    rights: round1(clamp(55 + (a.rights || 0) + rng.normal(0, 8), 25, 90)),
    environment: round1(clamp(55 + (a.environment || 0) + rng.normal(0, 8), 22, 92)),
    confidence: round1(clamp(rng.normal(56, 8), 30, 82))
  };
}

function generateStates(rng) {
  const states = STATE_BLUEPRINTS.map(([name, code, region, archetype, lean], index) => ({
    id: `state-${index + 1}`,
    name, code, region, archetype,
    population: statePopulation(archetype, index, rng),
    baselineLean: lean,
    currentLean: round1(lean + rng.normal(0, 1.5)),
    metrics: createStateMetrics(archetype, rng),
    metricRanks: {},
    groups: createStateGroups(archetype, rng),
    governorId: null,
    governorTermStart: 1,
    governorTerms: 0,
    governorTermLimit: rng.next() < 0.72 ? 2 : rng.next() < 0.72 ? 3 : 99,
    nextGovernorElectionYear: index % 2 === 0 ? 2 : 4,
    senatorIds: [],
    districtIds: [],
    politicianIds: [],
    policyHistory: [],
    annualHistory: [],
    electionHistory: [],
    primaryType: rng.pick(['Closed primary', 'Open primary', 'Semi-open primary', 'Caucus']),
    primaryWeek: 10 + ((index * 3) % 16)
  }));
  const seatAllocation = allocateHouseSeats(states);
  states.forEach((state) => {
    state.houseSeats = seatAllocation[state.id];
    state.electoralVotes = state.houseSeats + 2;
  });
  return states;
}

function generateDistricts(states, rng) {
  const districts = [];
  states.forEach((state) => {
    for (let number = 1; number <= state.houseSeats; number += 1) {
      const district = {
        id: `district-${districts.length + 1}`,
        stateId: state.id,
        number,
        name: `${state.code}-${number}`,
        lean: round1(clamp(state.currentLean + rng.normal(0, 7.2), -28, 28)),
        urbanization: round1(clamp((state.archetype === 'coastalMetro' ? 74 : state.archetype === 'sunbelt' ? 61 : state.archetype === 'industrial' ? 55 : 39) + rng.normal(0, 13), 10, 96)),
        incumbentId: null,
        electionHistory: []
      };
      districts.push(district);
      state.districtIds.push(district.id);
    }
  });
  return districts;
}

function raritySequence(count, rng) {
  const desired = {
    Generational: Math.max(2, Math.round(count * RARITIES.Generational.share)),
    Legend: Math.max(10, Math.round(count * RARITIES.Legend.share)),
    Epic: Math.round(count * RARITIES.Epic.share),
    Rare: Math.round(count * RARITIES.Rare.share),
    Uncommon: Math.round(count * RARITIES.Uncommon.share)
  };
  const sequence = [];
  Object.entries(desired).forEach(([rarity, amount]) => {
    for (let i = 0; i < amount && sequence.length < count; i += 1) sequence.push(rarity);
  });
  while (sequence.length < count) sequence.push('Common');
  return rng.shuffle(sequence);
}

function factionForParty(partyId, rng) { return rng.pick(FACTIONS[partyId]); }

function ideologyForPolitician(partyId, faction, rng) {
  const base = PARTY_FOUNDING_IDENTITIES[partyId]?.platform || (partyId === 'union'
    ? { economy: 52, social: 48, federal: 28, foreign: 55, trade: 64, immigration: 50, environment: 52, institutions: 78, style: 32 }
    : { economy: 66, social: 61, federal: 82, foreign: 36, trade: 44, immigration: 52, environment: 58, institutions: 55, style: 52 });
  return Object.fromEntries(IDEOLOGY_DIMENSIONS.map(({ key }) => {
    const factionValue = faction[key];
    const center = factionValue == null ? base[key] : base[key] * 0.4 + factionValue * 0.6;
    return [key, round1(clamp(center + rng.normal(0, 9), 2, 98))];
  }));
}

function abilitiesForRarity(rarity, rng) {
  const base = RARITIES[rarity].ability;
  const entries = ABILITY_KEYS.map(([key]) => [key, round1(clamp(base + rng.normal(0, rarity === 'Common' ? 8.5 : 7), 22, 99))]);
  return Object.fromEntries(entries);
}

function coalitionStanding(ideology, partyId, rng) {
  return {
    progressives: round1(clamp(55 - (ideology.social - 30) * 0.55 - (ideology.economy - 35) * 0.20 + rng.normal(0, 4), 5, 95)),
    conservatives: round1(clamp(45 + (ideology.social - 50) * 0.55 + (ideology.economy - 50) * 0.18 + rng.normal(0, 4), 5, 95)),
    labor: round1(clamp(55 - (ideology.economy - 35) * 0.45 + rng.normal(0, 5), 5, 95)),
    business: round1(clamp(45 + (ideology.economy - 50) * 0.48 + rng.normal(0, 5), 5, 95)),
    moderates: round1(clamp(67 - Math.abs(ideology.style - 42) * 0.42 - Math.abs(ideology.economy - 50) * 0.15 + rng.normal(0, 4), 5, 95)),
    populists: round1(clamp(42 + (ideology.style - 50) * 0.52 + rng.normal(0, 5), 5, 95)),
    partyBase: round1(clamp(55 + (partyId === 'union' ? 50 - ideology.social : ideology.social - 50) * 0.18 + rng.normal(0, 4), 20, 90))
  };
}


function weightedPick(items, rng) {
  const total = items.reduce((sum, item) => sum + (item.weight || 1), 0);
  let roll = rng.next() * total;
  for (const item of items) { roll -= item.weight || 1; if (roll <= 0) return item; }
  return items[items.length - 1];
}

function careerOriginFor(rng, age) {
  const eligible = CAREER_ORIGINS.filter((origin) => age >= origin.minAge);
  return weightedPick(eligible, rng);
}

function buildPrePoliticalCareer(origin, age, birthYear, rng) {
  const path = rng.pick(origin.paths);
  const stages = [];
  let currentAge = Math.max(18, Math.min(age - path.length * 2, origin.id === 'academic' ? 22 : 20));
  path.forEach((role, index) => {
    const duration = index === path.length - 1 ? Math.max(1, age - currentAge) : rng.int(2, 6);
    stages.push({ startAge: currentAge, endAge: Math.min(age, currentAge + duration), startYear: birthYear + currentAge, endYear: birthYear + Math.min(age, currentAge + duration), role });
    currentAge += duration;
  });
  return stages;
}

export function getStateRecognition(politician, stateId, world) {
  const index = world?.states?.findIndex((state) => state.id === stateId) ?? -1;
  if (index < 0) return politician.stateRecognition ?? 0;
  return politician.stateRecognitionMap?.[index] ?? (politician.homeStateId === stateId ? politician.stateRecognition ?? 0 : politician.nationalRecognition ?? 0);
}

export function getStateFavorability(politician, stateId, world) {
  const index = world?.states?.findIndex((state) => state.id === stateId) ?? -1;
  if (index < 0) return politician.homePopularity ?? 50;
  return politician.stateFavorabilityMap?.[index] ?? (politician.homeStateId === stateId ? politician.homePopularity ?? 50 : politician.nationalPopularity ?? 50);
}

export function recalculateRecognition(world, politician) {
  if (!politician.stateRecognitionMap?.length) return politician;
  const homeIndex = world.states.findIndex((state) => state.id === politician.homeStateId);
  const weights = world.states.map((state) => Math.max(0.2, state.population || 1));
  const total = weights.reduce((a,b)=>a+b,0) || 1;
  politician.stateRecognition = round1(politician.stateRecognitionMap[homeIndex] ?? 0);
  politician.homePopularity = round1(politician.stateFavorabilityMap?.[homeIndex] ?? politician.homePopularity ?? 50);
  politician.nationalRecognition = round1(politician.stateRecognitionMap.reduce((sum, value, i) => sum + value * weights[i], 0) / total);
  const recognizedWeight = politician.stateRecognitionMap.reduce((sum, value, i) => sum + Math.max(1, value) * weights[i], 0) || 1;
  politician.nationalPopularity = round1(clamp(politician.stateFavorabilityMap.reduce((sum, value, i) => sum + value * Math.max(1, politician.stateRecognitionMap[i]) * weights[i], 0) / recognizedWeight, 1, 99));
  return politician;
}

export function adjustStateStanding(world, politician, stateId, recognitionDelta = 0, favorabilityDelta = 0, spread = 0) {
  if (!politician.stateRecognitionMap?.length) return;
  const source = world.states.find((state) => state.id === stateId);
  world.states.forEach((state, index) => {
    let factor = state.id === stateId ? 1 : 0;
    if (spread > 0 && source) factor = state.id === stateId ? 1 : state.region === source.region ? spread * 0.42 : spread * 0.12;
    if (factor <= 0) return;
    politician.stateRecognitionMap[index] = round1(clamp(politician.stateRecognitionMap[index] + recognitionDelta * factor, 0, 100));
    politician.stateFavorabilityMap[index] = round1(clamp(politician.stateFavorabilityMap[index] + favorabilityDelta * factor, 1, 99));
  });
  recalculateRecognition(world, politician);
}

function makeForeignCountries(rng) {
  return FOREIGN_COUNTRY_NAMES.slice(0, 36).map((name, index) => ({
    id:`foreign-${index+1}`, name, majorPower:index<10,
    population: round1(clamp((index < 10 ? 8 : 3) * Math.exp(rng.normal(0,0.7)), 0.6, 42)),
    gdp: round1(clamp((index < 10 ? 7 : 2.4) * Math.exp(rng.normal(0,0.65)), 0.4, 34)),
    gdpPerCapita: round1(clamp(rng.normal(index < 10 ? 38 : 27, 9), 12, 65)),
    qualityLife: round1(clamp(rng.normal(38,10), 15, 65)), literacy:round1(clamp(rng.normal(38,16),8,74)),
    lifeExpectancy:round1(clamp(rng.normal(42,7),27,58)), military:round1(clamp(rng.normal(index<10?55:30,14),8,88)),
    technology:round1(clamp(rng.normal(index<10?47:31,12),10,78)), inequality:round1(clamp(rng.normal(63,10),35,88)),
    taxBurden:round1(clamp(rng.normal(9,3),2,18)), rights:round1(clamp(rng.normal(37,17),5,75)), stability:round1(clamp(rng.normal(57,14),20,88)),
    ideology:rng.pick(['Monarchy','Republic','Empire','Confederation','Parliamentary state']), atWar:false, history:[]
  }));
}

export function currentEra(world) {
  return HISTORICAL_ERAS.find((era) => world.date.year >= era.start && world.date.year <= era.end) || HISTORICAL_ERAS.at(-1);
}

export function politicianScore(politician, purpose = 'general') {
  const a = politician.abilities;
  const r = RARITIES[politician.rarity]?.weight || 0;
  const base = a.charisma * 0.13 + a.speech * 0.08 + a.debating * 0.07 + a.intelligence * 0.07 + a.instinct * 0.13 + a.organization * 0.10 + a.fundraising * 0.08 + a.media * 0.09 + a.discipline * 0.06 + a.empathy * 0.05 + a.coalition * 0.07 + a.governance * 0.07;
  const officeBonus = { President: 22, 'Vice President': 15, Governor: 13, Senator: 11, Representative: 6, 'State Executive': 4, 'State Legislator': 2, Mayor: 3, 'Private Citizen': 0, Retired: -8 }[politician.office] || 0;
  const recognition = purpose === 'national' ? politician.nationalRecognition * 0.20 : politician.stateRecognition * 0.12 + politician.homePopularity * 0.08;
  return round1(base + officeBonus + recognition + r + politician.momentum * 0.15 - politician.scandals * 2.2);
}

export function recalculatePower(politician) {
  politician.power = round1(clamp(
    politicianScore(politician, 'national') * 0.80 + politician.legacy * 0.08 + politician.nationalPopularity * 0.12,
    5, 100
  ));
  return politician.power;
}

function createPolitician({ id, state, district, partyId, rarity, rng, usedNames, year = 1, age = null, stateCount = 50 }) {
  const faction = factionForParty(partyId, rng);
  const generatedAge = age ?? rng.int(25, 74);
  const name = uniqueName(rng, usedNames);
  const ideology = ideologyForPolitician(partyId, faction, rng);
  const abilities = abilitiesForRarity(rarity, rng);
  const origin = careerOriginFor(rng, generatedAge);
  Object.entries(origin.abilities || {}).forEach(([key, delta]) => { abilities[key] = round1(clamp((abilities[key] || 50) + delta, 1, 99)); });
  const birthYear = year - generatedAge;
  const prePoliticalCareer = buildPrePoliticalCareer(origin, generatedAge, birthYear, rng);
  const homeIndex = Number(state.id.split('-').at(-1)) - 1;
  const stateRecognitionMap = Array.from({ length: stateCount }, (_, index) => round1(clamp(
    index === homeIndex ? origin.stateRecognition + abilities.charisma * 0.07 + rng.normal(0,4) : origin.id === 'celebrity' ? origin.nationalRecognition + rng.normal(0,5) : Math.max(0, origin.nationalRecognition + rng.normal(0,1.6)), 0, 92
  )));
  const stateFavorabilityMap = Array.from({ length: stateCount }, (_, index) => round1(clamp(
    48 + (index === homeIndex ? origin.homeFavorability : 0) + abilities.charisma * 0.035 + rng.normal(0,index===homeIndex?5:3), 15, 82
  )));
  const coalition = coalitionStanding(ideology, partyId, rng);
  Object.entries(origin.coalition || {}).forEach(([key, delta]) => { coalition[key] = round1(clamp((coalition[key] || 50) + delta, 1, 99)); });
  const politician = {
    id, name, initials:name.split(' ').filter((part)=>!part.endsWith('.')).map((part)=>part[0]).join('').slice(0,2),
    age:generatedAge,birthYear,partyId,partyEraId:null,factionId:faction.id,homeStateId:state.id,homeDistrictId:district?.id||rng.pick(state.districtIds),
    background:origin.name,careerOriginId:origin.id,prePoliticalCareer,rarity,ideology,abilities,
    hidden:{ ambition:rng.int(18,99),resilience:rng.int(18,99),risk:rng.int(8,96),corruption:rng.int(2,82),patience:rng.int(8,98),conviction:rng.int(15,98),adaptability:rng.int(15,98),health:rng.int(42,99)},
    office:'Private Citizen',officeStateId:null,officeDistrictId:null,officeSince:year,status:'Active',approval:null,
    stateRecognitionMap,stateFavorabilityMap,
    homePopularity:stateFavorabilityMap[homeIndex],nationalPopularity:48,stateRecognition:stateRecognitionMap[homeIndex],nationalRecognition:0,
    momentum:round1(rng.normal(0,2.5)),scandals:0,electionsWon:0,electionsLost:0,primariesWon:0,primariesLost:0,
    terms:{house:0,senate:0,governor:0,president:0},coalition,
    governingRecord:{economy:0,fiscal:0,social:0,rights:0,education:0,health:0,infrastructure:0,environment:0,crisis:0,stateRankChange:0},
    career:[...prePoliticalCareer.map((stage)=>({year:stage.startYear,week:1,type:'Pre-political career',event:`Began work as ${stage.role}.`})),{year,week:1,type:'Entry',event:`Entered major public life in ${state.name} from a background in ${origin.name.toLowerCase()}.`}],
    electionHistory:[],annualHistory:[],policyRecord:[],relationships:{allies:[],rivals:[],mentors:[],proteges:[]},legacy:0,power:0
  };
  // Calculate national standing from the complete 50-state map.
  const avgRec = stateRecognitionMap.reduce((a,b)=>a+b,0)/stateRecognitionMap.length;
  politician.nationalRecognition=round1(avgRec);
  politician.nationalPopularity=round1(stateFavorabilityMap.reduce((a,b)=>a+b,0)/stateFavorabilityMap.length);
  recalculatePower(politician);
  return politician;
}

function assignOffice(politician, office, { stateId = null, districtId = null, year = 1, approval = null, event = null } = {}) {
  politician.office = office;
  politician.officeStateId = stateId;
  politician.officeDistrictId = districtId;
  politician.officeSince = year;
  politician.approval = approval;
  politician.career.push({ year, week: 1, type: 'Office', event: event || `Began serving as ${office}.` });
  recalculatePower(politician);
}

function choosePartyFromLean(lean, rng) {
  const unionChance = clamp(50 - lean * 1.75, 8, 92);
  return rng.next() * 100 < unionChance ? 'union' : 'liberty';
}

function buildPoliticians(states, districts, rng, count) {
  const usedNames = new Set();
  const rarities = raritySequence(count, rng);
  const politicians = [];
  for (let i = 0; i < count; i += 1) {
    const state = states[i % states.length];
    const district = districts.find((item) => item.id === state.districtIds[i % state.districtIds.length]);
    const partyId = choosePartyFromLean(district?.lean ?? state.currentLean, rng);
    const politician = createPolitician({ id: `pol-${i + 1}`, state, district, partyId, rarity: rarities[i], rng, usedNames, age: rng.int(25, 74), stateCount: states.length });
    politicians.push(politician);
    state.politicianIds.push(politician.id);
  }
  return politicians;
}

function pickCandidate(pool, predicate, score, used) {
  const candidate = pool.filter((p) => !used.has(p.id) && predicate(p)).sort((a, b) => score(b) - score(a))[0];
  if (candidate) used.add(candidate.id);
  return candidate;
}

function createPartyState(partyId, politicians, rng) {
  const members = politicians.filter((politician) => politician.partyId === partyId);
  const founding = PARTY_FOUNDING_IDENTITIES[partyId];
  const factions = FACTIONS[partyId].map((faction, factionIndex) => {
    const factionMembers = members.filter((politician) => politician.factionId === faction.id);
    const leader = [...factionMembers].sort((a,b)=>politicianScore(b,'national')-politicianScore(a,'national'))[0];
    return {...faction,name:FACTION_ERA_NAMES.founding?.[partyId]?.[factionIndex]||faction.name,influence:round1(clamp(100/FACTIONS[partyId].length+rng.normal(0,4),8,35)),leaderId:leader?.id||null};
  });
  const total=factions.reduce((sum,f)=>sum+f.influence,0); factions.forEach((f)=>{f.influence=round1(f.influence*100/total)});
  const eraId=`${partyId}-era-1`;
  members.forEach((p)=>{p.partyEraId=eraId});
  return {
    id:partyId,slot:partyId,...founding,leaderId:[...members].sort((a,b)=>b.power-a.power)[0]?.id||null,factions,nationalSupport:50,
    foundedYear:1,currentEraId:eraId,platform:{...founding.platform},platformHistory:[{year:1,platform:{...founding.platform},support:50}],
    lineage:[{id:eraId,name:founding.name,short:founding.short,foundedYear:1,dissolvedYear:null,predecessorId:null,reason:'Founding coalition',platform:{...founding.platform}}],
    history:[{year:1,event:`The ${founding.name} organized as one of the republic’s founding national coalitions.`}],
    presidentialWins:0,houseControlYears:0,senateControlYears:0
  };
}

function calculateRanks(states) {
  const rankFields = [
    ['gdpPerCapita', true], ['growth', true], ['unemployment', false], ['income', true], ['budget', true],
    ['education', true], ['health', true], ['infrastructure', true], ['crime', false], ['rights', true], ['environment', true]
  ];
  rankFields.forEach(([field, highGood]) => {
    const sorted = [...states].sort((a, b) => highGood ? b.metrics[field] - a.metrics[field] : a.metrics[field] - b.metrics[field]);
    sorted.forEach((state, index) => { state.metricRanks[field] = index + 1; });
  });
}

function initialPresidentialElection(states, capitalDistrict, unionCandidate, libertyCandidate, rng) {
  let unionEV = 0;
  let libertyEV = 0;
  let unionPopular = 0;
  let libertyPopular = 0;
  const stateResults = [];
  const qualityGap = (politicianScore(unionCandidate, 'national') - politicianScore(libertyCandidate, 'national')) * 0.07;
  const nationalNoise = rng.normal(0, 1.2);
  [...states, capitalDistrict].forEach((state) => {
    const unionShare = round1(clamp(50 - state.currentLean + qualityGap + nationalNoise + rng.normal(0, 2.1), 25, 75));
    const turnout = Math.round(state.population * 1_000_000 * (0.49 + rng.next() * 0.12));
    const u = Math.round(turnout * unionShare / 100);
    const l = turnout - u;
    const winnerPartyId = unionShare >= 50 ? 'union' : 'liberty';
    if (winnerPartyId === 'union') unionEV += state.electoralVotes; else libertyEV += state.electoralVotes;
    unionPopular += u;
    libertyPopular += l;
    stateResults.push({ stateId: state.id, unionShare, libertyShare: round1(100 - unionShare), winnerPartyId, margin: round1(Math.abs(unionShare - 50) * 2), electoralVotes: state.electoralVotes, turnout });
  });
  if (unionEV === libertyEV) {
    const closest = [...stateResults].filter((r) => r.stateId !== capitalDistrict.id).sort((a, b) => a.margin - b.margin)[0];
    if (unionPopular >= libertyPopular) { unionEV += closest.electoralVotes; libertyEV -= closest.electoralVotes; }
    else { libertyEV += closest.electoralVotes; unionEV -= closest.electoralVotes; }
  }
  const winner = unionEV >= 270 ? unionCandidate : libertyCandidate;
  const loser = winner.id === unionCandidate.id ? libertyCandidate : unionCandidate;
  return {
    id: 'presidential-0', type: 'Presidential', year: 0, status: 'Complete',
    unionCandidateId: unionCandidate.id, libertyCandidateId: libertyCandidate.id,
    winnerId: winner.id, loserId: loser.id, unionEV, libertyEV, unionPopular, libertyPopular,
    turnout: unionPopular + libertyPopular, stateResults,
    narrative: `${winner.name} won the first archived presidential election with ${Math.max(unionEV, libertyEV)} electoral votes.`
  };
}

function establishRelationships(politicians, rng) {
  const notable = politicians.filter((p) => ['Generational', 'Legend', 'Epic', 'Rare'].includes(p.rarity) || ['President', 'Vice President', 'Governor', 'Senator'].includes(p.office));
  notable.forEach((politician) => {
    const same = notable.filter((other) => other.id !== politician.id && other.partyId === politician.partyId && other.homeStateId === politician.homeStateId);
    const rival = notable.filter((other) => other.id !== politician.id && other.partyId !== politician.partyId && (other.homeStateId === politician.homeStateId || other.office === politician.office));
    const ally = rng.pick(same.length ? same : notable.filter((other) => other.id !== politician.id && other.partyId === politician.partyId));
    const enemy = rng.pick(rival.length ? rival : notable.filter((other) => other.id !== politician.id && other.partyId !== politician.partyId));
    if (ally) politician.relationships.allies.push(ally.id);
    if (enemy) politician.relationships.rivals.push(enemy.id);
  });
}

export function syncGovernmentCounts(world) {
  const houseUnion = world.districts.reduce((sum, district) => sum + (getPolitician(world, district.incumbentId)?.partyId === 'union' ? 1 : 0), 0);
  const senateUnion = world.senateSeats.reduce((sum, seat) => sum + (getPolitician(world, seat.incumbentId)?.partyId === 'union' ? 1 : 0), 0);
  world.government.house = { union: houseUnion, liberty: 435 - houseUnion };
  world.government.senate = { union: senateUnion, liberty: 100 - senateUnion };
  return world;
}

function cachedIndex(world, cacheKey, sizeKey, items) {
  if (!world[cacheKey] || world[sizeKey] !== items.length) {
    Object.defineProperty(world, cacheKey, { value: new Map(items.map((item) => [item.id, item])), writable: true, configurable: true, enumerable: false });
    Object.defineProperty(world, sizeKey, { value: items.length, writable: true, configurable: true, enumerable: false });
  }
  return world[cacheKey];
}

export function getPolitician(world, id) { if(!id)return null; const live=cachedIndex(world, '__politicianIndex', '__politicianIndexSize', world.politicians).get(id); if(live)return live; return world.peopleArchive?.length?cachedIndex(world, '__peopleArchiveIndex', '__peopleArchiveIndexSize', world.peopleArchive).get(id)||null:null; }
export function getState(world, id) {
  if (!id) return null;
  if (id === world.country?.capitalDistrict?.id) return world.country.capitalDistrict;
  return cachedIndex(world, '__stateIndex', '__stateIndexSize', world.states).get(id) || null;
}
export function getDistrict(world, id) { return id ? cachedIndex(world, '__districtIndex', '__districtIndexSize', world.districts).get(id) || null : null; }
export function getSenateSeat(world, id) { return id ? cachedIndex(world, '__senateIndex', '__senateIndexSize', world.senateSeats).get(id) || null : null; }

export function createNewPolitician(world, rng, year, overrides = {}) {
  const state = getState(world, overrides.stateId) || rng.pick(world.states);
  const district = getDistrict(world, overrides.districtId) || getDistrict(world, rng.pick(state.districtIds));
  const partyId = overrides.partyId || choosePartyFromLean(district?.lean ?? state.currentLean, rng);
  const rarityRoll = rng.next();
  const rarity = overrides.rarity || (rarityRoll < 0.0003 ? 'Generational' : rarityRoll < 0.0023 ? 'Legend' : rarityRoll < 0.012 ? 'Epic' : rarityRoll < 0.062 ? 'Rare' : rarityRoll < 0.72 ? 'Uncommon' : 'Common');
  let usedNames=world.__usedPoliticianNames;
  if(!usedNames){
    usedNames=new Set([...world.politicians,...(world.peopleArchive||[])].map((p)=>p.name));
    Object.defineProperty(world,'__usedPoliticianNames',{value:usedNames,writable:true,configurable:true,enumerable:false});
  }
  const politician = createPolitician({
    id: `pol-${world.nextPoliticianId++}`,
    state,
    district,
    partyId,
    rarity,
    rng,
    usedNames,
    year,
    age: overrides.age || rng.int(25, 43),
    stateCount: world.states.length
  });
  const currentPlatform=world.parties?.[partyId]?.platform;
  if(currentPlatform){
    Object.keys(politician.ideology).forEach((key)=>{politician.ideology[key]=round1(clamp((politician.ideology[key]||50)*0.38+(currentPlatform[key]??50)*0.62+rng.normal(0,5),2,98));});
    recalculatePower(politician);
  }
  state.politicianIds.push(politician.id);
  return politician;
}

export function createWorld(seed = 1776) {
  const rng = makeRng(seed);
  const states = generateStates(rng);
  const districts = generateDistricts(states, rng);
  const capitalDistrict = {
    id: 'capital-district', name: 'Concordia District', code: 'CD', region: 'Capital District', archetype: 'coastalMetro',
    population: 0.08, currentLean: round1(-20 + rng.normal(0, 1)), electoralVotes: 3, houseSeats: 0,
    metrics: createStateMetrics('coastalMetro', rng), metricRanks: {}, groups: createStateGroups('coastalMetro', rng),
    governorId: null, senatorIds: [], districtIds: [], politicianIds: [], policyHistory: [], annualHistory: [], electionHistory: []
  };
  const politicians = buildPoliticians(states, districts, rng, STARTING_POLITICIANS);
  const used = new Set();

  districts.forEach((district) => {
    const state = states.find((item) => item.id === district.stateId);
    const partyId = choosePartyFromLean(district.lean, rng);
    const incumbent = pickCandidate(
      politicians,
      (p) => p.homeStateId === state.id && p.partyId === partyId && p.age >= 25,
      (p) => politicianScore(p) + (p.homeDistrictId === district.id ? 8 : 0),
      used
    ) || pickCandidate(politicians, (p) => p.homeStateId === state.id && p.age >= 25, politicianScore, used);
    assignOffice(incumbent, 'Representative', { stateId: state.id, districtId: district.id, year: 1, approval: round1(clamp(52 + rng.normal(0, 5), 34, 70)), event: `Began representing district ${district.name}.` });
    incumbent.terms.house = rng.int(1, 5);
    incumbent.electionsWon = incumbent.terms.house;
    incumbent.stateRecognition = round1(clamp(incumbent.stateRecognition + 14, 10, 78));
    incumbent.nationalRecognition = round1(clamp(incumbent.nationalRecognition + 6, 0, 55));
    district.incumbentId = incumbent.id;
  });

  const senateSeats = [];
  states.forEach((state, stateIndex) => {
    for (let seatNumber = 1; seatNumber <= 2; seatNumber += 1) {
      const preferred = choosePartyFromLean(state.currentLean + rng.normal(0, 4), rng);
      const senator = pickCandidate(
        politicians,
        (p) => p.homeStateId === state.id && p.partyId === preferred && p.age >= 30,
        (p) => politicianScore(p) + p.abilities.coalition * 0.12,
        used
      ) || pickCandidate(politicians, (p) => p.homeStateId === state.id && p.age >= 30, politicianScore, used);
      assignOffice(senator, 'Senator', { stateId: state.id, year: 1, approval: round1(clamp(52 + rng.normal(0, 5), 34, 72)), event: `Began serving in the Senate for ${state.name}.` });
      senator.terms.senate = rng.int(1, 3);
      senator.electionsWon = senator.terms.senate;
      senator.stateRecognition = round1(clamp(senator.stateRecognition + 24, 20, 90));
      senator.nationalRecognition = round1(clamp(senator.nationalRecognition + 16, 8, 72));
      state.senatorIds.push(senator.id);
      senateSeats.push({
        id: `senate-${stateIndex + 1}-${seatNumber}`,
        stateId: state.id,
        seatNumber,
        class: ((stateIndex + seatNumber) % 3) + 1,
        incumbentId: senator.id,
        nextElectionYear: [2, 4, 6][(stateIndex + seatNumber) % 3],
        electionHistory: []
      });
    }
  });

  states.forEach((state) => {
    const preferred = choosePartyFromLean(state.currentLean + rng.normal(0, 3), rng);
    const governor = pickCandidate(
      politicians,
      (p) => p.homeStateId === state.id && p.partyId === preferred && p.age >= 30,
      (p) => politicianScore(p) + p.abilities.governance * 0.18,
      used
    ) || pickCandidate(politicians, (p) => p.homeStateId === state.id && p.age >= 30, politicianScore, used);
    assignOffice(governor, 'Governor', { stateId: state.id, year: 1, approval: round1(clamp(54 + rng.normal(0, 5), 36, 72)), event: `Began serving as governor of ${state.name}.` });
    governor.terms.governor = rng.int(1, Math.min(2, state.governorTermLimit));
    governor.electionsWon = governor.terms.governor;
    governor.stateRecognition = round1(clamp(governor.stateRecognition + 30, 25, 94));
    governor.nationalRecognition = round1(clamp(governor.nationalRecognition + 18, 8, 75));
    state.governorId = governor.id;
    state.governorTerms = governor.terms.governor;
  });

  politicians.filter((p) => !used.has(p.id)).forEach((politician) => {
    const roll = rng.next();
    const office = roll < 0.22 ? 'State Legislator' : roll < 0.29 ? 'Mayor' : roll < 0.35 ? 'State Executive' : 'Private Citizen';
    if (office !== 'Private Citizen') {
      assignOffice(politician, office, { stateId: politician.homeStateId, year: 1, approval: round1(clamp(50 + rng.normal(0, 6), 30, 70)) });
      politician.stateRecognition = round1(clamp(politician.stateRecognition + (office === 'Mayor' ? 9 : 6), 5, 70));
      politician.electionsWon = rng.int(0, 2);
    }
  });

  const unionCandidate = pickCandidate(politicians, (p) => p.partyId === 'union' && p.age >= 40 && ['Governor','Senator'].includes(p.office), (p) => politicianScore(p, 'national'), new Set());
  const libertyCandidate = pickCandidate(politicians, (p) => p.partyId === 'liberty' && p.age >= 40 && ['Governor','Senator'].includes(p.office), (p) => politicianScore(p, 'national'), new Set());
  const foundingElection = initialPresidentialElection(states, capitalDistrict, unionCandidate, libertyCandidate, rng);
  const president = politicians.find((p) => p.id === foundingElection.winnerId);
  const loser = politicians.find((p) => p.id === foundingElection.loserId);

  // Vacate the president's prior office with a credible same-party replacement.
  if (president.office === 'Governor') {
    const state = states.find((s) => s.id === president.officeStateId);
    const replacement = politicians.filter((p) => !used.has(p.id) && p.homeStateId === state.id && p.partyId === president.partyId && ['State Executive','State Legislator','Mayor','Private Citizen'].includes(p.office)).sort((a,b) => politicianScore(b)-politicianScore(a))[0];
    if (replacement) {
      assignOffice(replacement, 'Governor', { stateId: state.id, year: 1, approval: 51, event: `Succeeded ${president.name} as governor of ${state.name}.` });
      state.governorId = replacement.id;
    }
  }
  if (president.office === 'Senator') {
    const seat = senateSeats.find((item) => item.incumbentId === president.id);
    const state = states.find((s) => s.id === seat.stateId);
    const replacement = politicians.filter((p) => p.homeStateId === state.id && p.partyId === president.partyId && ['State Executive','State Legislator','Mayor','Private Citizen','Representative'].includes(p.office)).sort((a,b) => politicianScore(b)-politicianScore(a))[0];
    if (replacement) {
      assignOffice(replacement, 'Senator', { stateId: state.id, year: 1, approval: 50, event: `Appointed to the Senate after ${president.name} won the presidency.` });
      seat.incumbentId = replacement.id;
      state.senatorIds = state.senatorIds.map((id) => id === president.id ? replacement.id : id);
    }
  }

  assignOffice(president, 'President', { year: 1, approval: round1(clamp(55 + rng.normal(0, 2), 49, 63)), event: 'Inaugurated as president after winning the first archived national election.' });
  president.terms.president = 1;
  president.electionsWon += 1;
  president.rarity = 'Generational';
  president.abilities.charisma = Math.max(90, president.abilities.charisma);
  president.abilities.governance = Math.max(88, president.abilities.governance);
  president.background = 'Military';
  president.careerOriginId = 'military';
  president.prePoliticalCareer = [{startAge:20,endAge:27,startYear:president.birthYear+20,endYear:president.birthYear+27,role:'Army officer'},{startAge:27,endAge:Math.max(28,president.age-3),startYear:president.birthYear+27,endYear:president.birthYear+Math.max(28,president.age-3),role:'Senior military commander'},{startAge:Math.max(28,president.age-3),endAge:president.age,startYear:president.birthYear+Math.max(28,president.age-3),endYear:1,role:'Revolutionary commander and constitutional leader'}];
  president.foundingFather = true;
  president.stateRecognitionMap = president.stateRecognitionMap.map(()=>round1(clamp(88+rng.normal(0,4),72,99)));
  president.stateFavorabilityMap = president.stateFavorabilityMap.map(()=>round1(clamp(72+rng.normal(0,6),52,91)));
  president.nationalRecognition = 100;
  president.nationalPopularity = round1(clamp(55 + rng.normal(0, 3), 45, 66));
  const excessGenerationals = politicians.filter((p)=>p.rarity==='Generational'&&p.id!==president.id).sort((a,b)=>politicianScore(a)-politicianScore(b));
  while (politicians.filter((p)=>p.rarity==='Generational').length>2 && excessGenerationals.length) { const demoted=excessGenerationals.shift(); demoted.rarity='Legend'; recalculatePower(demoted); }
  president.electionHistory.push({ year: 0, office: 'President', stage: 'General', result: 'Won', voteShare: round1((president.partyId === 'union' ? foundingElection.unionPopular : foundingElection.libertyPopular) / foundingElection.turnout * 100), electoralVotes: Math.max(foundingElection.unionEV, foundingElection.libertyEV) });
  loser.electionsLost += 1;
  loser.electionHistory.push({ year: 0, office: 'President', stage: 'General', result: 'Lost', voteShare: round1((loser.partyId === 'union' ? foundingElection.unionPopular : foundingElection.libertyPopular) / foundingElection.turnout * 100), electoralVotes: Math.min(foundingElection.unionEV, foundingElection.libertyEV) });

  const vp = politicians.filter((p) => p.partyId === president.partyId && p.id !== president.id && p.age >= 35 && ['Governor','Senator','Representative'].includes(p.office)).sort((a,b) => politicianScore(b,'national') + b.abilities.coalition * 0.2 - (politicianScore(a,'national') + a.abilities.coalition * 0.2))[0];
  if (vp) {
    if (vp.office === 'Governor') {
      const state = states.find((s) => s.id === vp.officeStateId);
      const replacement = politicians.filter((p) => p.id !== vp.id && p.homeStateId === state.id && p.partyId === vp.partyId && ['State Executive','State Legislator','Mayor','Private Citizen'].includes(p.office)).sort((a,b) => politicianScore(b)-politicianScore(a))[0];
      if (replacement) { assignOffice(replacement, 'Governor', { stateId: state.id, year: 1, approval: 51, event: `Succeeded ${vp.name} as governor of ${state.name}.` }); state.governorId = replacement.id; }
    } else if (vp.office === 'Senator') {
      const seat = senateSeats.find((item) => item.incumbentId === vp.id);
      const state = states.find((s) => s.id === seat.stateId);
      const replacement = politicians.filter((p) => p.id !== vp.id && p.homeStateId === state.id && p.partyId === vp.partyId && ['Representative','State Executive','State Legislator','Mayor','Private Citizen'].includes(p.office)).sort((a,b) => politicianScore(b)-politicianScore(a))[0];
      if (replacement) { assignOffice(replacement, 'Senator', { stateId: state.id, year: 1, approval: 50, event: `Appointed to the Senate after ${vp.name} became vice president.` }); seat.incumbentId = replacement.id; state.senatorIds = state.senatorIds.map((id) => id === vp.id ? replacement.id : id); }
    } else if (vp.office === 'Representative') {
      const district = districts.find((item) => item.incumbentId === vp.id);
      const state = states.find((s) => s.id === district.stateId);
      const replacement = politicians.filter((p) => p.id !== vp.id && p.homeStateId === state.id && p.partyId === vp.partyId && p.homeDistrictId === district.id && ['State Legislator','Mayor','State Executive','Private Citizen'].includes(p.office)).sort((a,b) => politicianScore(b)-politicianScore(a))[0];
      if (replacement) { assignOffice(replacement, 'Representative', { stateId: state.id, districtId: district.id, year: 1, approval: 49, event: `Appointed to district ${district.name} after ${vp.name} became vice president.` }); district.incumbentId = replacement.id; }
    }
    assignOffice(vp, 'Vice President', { year: 1, event: `Inaugurated as vice president alongside ${president.name}.` });
  }

  calculateRanks(states);
  states.forEach((state) => state.annualHistory.push({ year: 1, governorId: state.governorId, metrics: { ...state.metrics }, ranks: { ...state.metricRanks } }));
  politicians.filter((p) => p.office !== 'Private Citizen' || ['Generational','Legend','Epic'].includes(p.rarity)).forEach((p) => {
    p.annualHistory.push({ year: 1, office: p.office, approval: p.approval, homePopularity: p.homePopularity, nationalPopularity: p.nationalPopularity, stateRecognition: p.stateRecognition, nationalRecognition: p.nationalRecognition, power: p.power, legacy: p.legacy, stateRank: p.office === 'Governor' ? getState({ states, country: { capitalDistrict } }, p.officeStateId)?.metricRanks?.gdpPerCapita : null });
  });
  establishRelationships(politicians, rng);

  const parties = { union: createPartyState('union', politicians, rng), liberty: createPartyState('liberty', politicians, rng) };
  parties[president.partyId].presidentialWins = 1;
  foundingElection.unionPartyName=parties.union.name; foundingElection.libertyPartyName=parties.liberty.name;
  foundingElection.unionPartyEraId=parties.union.currentEraId; foundingElection.libertyPartyEraId=parties.liberty.currentEraId;
  foundingElection.winnerPartyName=parties[president.partyId].name;

  const world = {
    schemaVersion: SCHEMA_VERSION,
    seed: Number(seed) || 1776,
    rngSeed: rng.seed,
    nextPoliticianId: politicians.length + 1,
    date: { year: 1, week: 1 },
    country: {
      name: 'The Federal Republic of Columbia', shortName: 'Columbia', capital: 'Concordia', population: round1(states.reduce((sum, state) => sum + state.population, 0) + capitalDistrict.population), capitalDistrict,
      foundedYear:1, eraId:'founding',
      society:{ slaveryLegal:true, slaveryShare:12.8, abolitionSupport:18, indigenousRelations:36, indigenousIntegration:18, expansionPressure:62, industrialization:9, urbanization:12, inequality:64, taxBurden:7.5, socialSpending:3, civilRights:31, literacy:42, lifeExpectancy:41, qualityLife:36 },
      nationalStats:{ gdp:6.2,gdpPerCapita:34,military:29,technology:31,debt:18,governmentCapacity:36 },
      constitutionalTraditions:[{year:1,name:'Civilian transfer of authority',strength:65,description:'The presidency is understood as a temporary constitutional office rather than a personal possession.'}],
      annualHistory:[]
    },
    economy: { growth: round1(rng.normal(2.8, 1.0)), unemployment: round1(clamp(rng.normal(4.4, 0.8), 2, 8)), inflation: round1(clamp(rng.normal(2.1, 0.9), -1, 7)), confidence: round1(clamp(rng.normal(61, 5), 35, 78)) },
    worldSystem:{ countries:makeForeignCountries(rng), conflicts:[], history:[], rankingsYear:1 },
    historical:{ currentEraId:'founding', pressuresResolved:[], pressureLog:[], partyRealignments:[], foundingPresidentId:president.id },
    states, districts, senateSeats, politicians, peopleArchive:[], parties,
    government: {
      presidentId: president.id, vicePresidentId: vp?.id || null, presidentElectId: null, vicePresidentElectId: null,
      house: { union: 0, liberty: 0 }, senate: { union: 0, liberty: 0 },
      administrations: [{ id: 'admin-1', presidentId: president.id, vicePresidentId: vp?.id || null, partyId: president.partyId, partyEraId: president.partyEraId, partyName: parties[president.partyId].name, startYear: 1, endYear: null, approvalStart: president.approval, approvalEnd: null, laws: [], crises: [], legacy: 0 }],
      laws: [], crises: []
    },
    electionCycle: { phase: 'Governing', cycleYear: 1, unionCandidates: [], libertyCandidates: [], unionNomineeId: null, libertyNomineeId: null, unionRunningMateId: null, libertyRunningMateId: null, events: [], polls: [], winnerId: null, lastElectionId: foundingElection.id },
    elections: [foundingElection],
    raceArchive: [],
    primaryArchive: [],
    issues: [
      { name: 'cost of living', salience: 67 }, { name: 'industrial jobs', salience: 59 }, { name: 'healthcare access', salience: 55 },
      { name: 'border security', salience: 51 }, { name: 'public education', salience: 48 }, { name: 'institutional trust', salience: 44 }
    ],
    history: [{ year: 1, week: 1, type: 'Inauguration', importance: 5, title: `${president.name} begins the first archived administration`, text: foundingElection.narrative }],
    magazine: [
      { id: 'story-1', year: 1, week: 1, category: 'Cover', importance: 5, title: 'A Political Universe Begins', text: `${president.name} takes office while more than six thousand politicians compete across state, congressional, and national politics.`, subjectId: president.id },
      { id: 'story-2', year: 1, week: 1, category: 'Congress', importance: 4, title: 'Every Seat Has a Career Behind It', text: 'All 435 House districts, 100 Senate seats, and 50 governorships now have individual incumbents and future primary challengers.', subjectId: null }
    ],
    records: {
      youngestGovernor: null,
      stateTransformations: [],
      primaryUpsets: [],
      landslides: [{ year: 0, winnerId: president.id, electoralVotes: Math.max(foundingElection.unionEV, foundingElection.libertyEV), popularMargin: round1(Math.abs(foundingElection.unionPopular - foundingElection.libertyPopular) / foundingElection.turnout * 100) }]
    },
    annualReview: null,
    notifications: [{ id: 'note-1', type: 'major', title: 'The expanded republic is ready', text: `${politicians.length.toLocaleString()} active politicians now compete for every federal and state office.`, year: 1, week: 1 }]
  };
  world.politicians.forEach((p)=>{
    const hi=world.states.findIndex((state)=>state.id===p.homeStateId); if(hi<0)return;
    let rec=0,fav=0,spread=0;
    if(p.office==='Governor'){rec=34;fav=7;spread=5;} else if(p.office==='Senator'){rec=29;fav=5;spread=7;} else if(p.office==='Representative'){rec=16;fav=4;spread=1.5;} else if(p.office==='State Executive'){rec=11;fav=3;} else if(p.office==='State Legislator'){rec=8;fav=2;} else if(p.office==='Mayor'){rec=10;fav=3;}
    if(p.office!=='President'){
      p.stateRecognitionMap[hi]=round1(clamp(p.stateRecognitionMap[hi]+rec,0,100)); p.stateFavorabilityMap[hi]=round1(clamp(p.stateFavorabilityMap[hi]+fav,1,99));
      if(spread){const home=world.states[hi];world.states.forEach((st,i)=>{if(i!==hi&&st.region===home.region)p.stateRecognitionMap[i]=round1(clamp(p.stateRecognitionMap[i]+spread,0,100));});}
    }
    recalculateRecognition(world,p);
  });
  syncGovernmentCounts(world);
  world.country.annualHistory.push({year:1,population:world.country.population,economy:{...world.economy},nationalStats:{...world.country.nationalStats},society:{...world.country.society},worldRanks:null,presidentId:world.government.presidentId});
  return world;
}
