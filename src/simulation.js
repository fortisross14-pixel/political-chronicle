import {
  EVENT_HEADLINES,
  FACTION_ERA_NAMES,
  HISTORICAL_PRESSURES,
  PARTY_SUCCESSOR_NAMES,
  ORIGIN_GROUP_AFFINITY,
  PARTIES,
  POLICY_LIBRARY,
  POPULATION_GROUPS,
  RARITIES
} from './constants.js';
import {
  adjustStateStanding,
  clamp,
  createNewPolitician,
  currentEra,
  getDistrict,
  getPolitician,
  getState,
  makeRng,
  politicianScore,
  recalculatePower,
  recalculateRecognition,
  round1,
  syncGovernmentCounts
} from './world.js';

const cycleYear = (year) => ((year - 1) % 4) + 1;
const opponent = (partyId) => (partyId === 'union' ? 'liberty' : 'union');
const partyName = (partyId, world = null) => world?.parties?.[partyId]?.name || PARTIES[partyId]?.name || partyId;
const cloneWorld = (world) => typeof structuredClone === 'function' ? structuredClone(world) : JSON.parse(JSON.stringify(world));

function uid(prefix, world, rng) {
  return `${prefix}-${world.date.year}-${world.date.week}-${rng.int(10000, 99999)}`;
}

function currentPresident(world) { return getPolitician(world, world.government.presidentId); }
function currentAdministration(world) { return world.government.administrations.at(-1); }

function addStory(world, rng, { category = 'Politics', importance = 2, title, text, subjectId = null, stateId = null }) {
  const story = { id: uid('story', world, rng), year: world.date.year, week: world.date.week, category, importance, title, text, subjectId, stateId };
  world.magazine.unshift(story);
  if (world.magazine.length > 650) world.magazine.length = 650;
  if (importance >= 5) world.notifications.unshift({ id: uid('note', world, rng), type: 'major', title, text, year: world.date.year, week: world.date.week });
  if (world.notifications.length > 40) world.notifications.length = 40;
  return story;
}

function addHistory(world, { type = 'Politics', importance = 3, title, text }) {
  world.history.unshift({ year: world.date.year, week: world.date.week, type, importance, title, text });
  if (world.history.length > 1200) world.history.length = 1200;
}

function addCareer(politician, world, event, type = 'Career') {
  politician.career.push({ year: world.date.year, week: world.date.week, type, event });
}

function nationalEnvironmentForUnion(world) {
  const president = currentPresident(world);
  const economic = (world.economy.growth - 2) * 0.45 - (world.economy.unemployment - 5) * 0.35 - (world.economy.inflation - 3) * 0.32 + (world.economy.confidence - 52) * 0.08;
  const approval = president ? (president.approval - 50) * 0.20 * (president.partyId === 'union' ? 1 : -1) : 0;
  const fatigue = president ? Math.max(0, world.date.year - currentAdministration(world).startYear) * 0.16 * (president.partyId === 'union' ? -1 : 1) : 0;
  return economic + approval + fatigue;
}

function updateNationalEconomy(world, rng) {
  if (world.date.week % 4 !== 0) return;
  const economy = world.economy;
  economy.growth = round1(clamp(economy.growth * 0.78 + 0.46 + rng.normal(0, 0.45), -6.5, 8.5));
  economy.unemployment = round1(clamp(economy.unemployment + (2.1 - economy.growth) * 0.10 + rng.normal(0, 0.14), 2.2, 13.5));
  economy.inflation = round1(clamp(economy.inflation * 0.84 + 0.47 + rng.normal(0, 0.22), -0.3, 11.5));
  economy.confidence = round1(clamp(
    economy.confidence + (54 - economy.confidence) * 0.10 + (economy.growth - 2) * 0.48 - (economy.unemployment - 5) * 0.22 - (economy.inflation - 3) * 0.28 + rng.normal(0, 0.9),
    20, 83
  ));
  if (rng.next() < 0.16 && (economy.growth > 3.7 || economy.growth < 0 || economy.unemployment > 7.5)) {
    const good = economy.growth > 3.7 && economy.unemployment < 5.5;
    addStory(world, rng, {
      category: 'Economy', importance: economy.growth < -1 ? 4 : 3,
      title: rng.pick(good ? EVENT_HEADLINES.economyGood : EVENT_HEADLINES.economyBad),
      text: `National growth is ${economy.growth.toFixed(1)}%, unemployment ${economy.unemployment.toFixed(1)}%, inflation ${economy.inflation.toFixed(1)}%, and confidence ${economy.confidence.toFixed(1)}.`
    });
  }
}

function officeholders(world) {
  const ids = new Set([world.government.presidentId, world.government.vicePresidentId]);
  world.districts.forEach((district) => ids.add(district.incumbentId));
  world.senateSeats.forEach((seat) => ids.add(seat.incumbentId));
  world.states.forEach((state) => ids.add(state.governorId));
  return [...ids].map((id) => getPolitician(world, id)).filter(Boolean);
}

function updateOfficeholders(world, rng) {
  const president = currentPresident(world);
  const activeCrises = world.government.crises.filter((crisis) => crisis.active);
  officeholders(world).forEach((politician) => {
    const target = politician.office === 'President' ? 48 : 52;
    const economicSignal = politician.office === 'President'
      ? (world.economy.growth - 2) * 0.025 - (world.economy.unemployment - 5) * 0.018 - (world.economy.inflation - 3) * 0.022 + (world.economy.confidence - 52) * 0.004
      : 0;
    const state = getState(world, politician.officeStateId || politician.homeStateId);
    const stateSignal = politician.office === 'Governor' && state
      ? (state.metrics.growth - 2) * 0.025 - (state.metrics.unemployment - 5) * 0.018 + (state.metrics.confidence - 52) * 0.004
      : 0;
    const skill = ((politician.abilities.governance + politician.abilities.empathy + politician.abilities.media) / 3 - 58) * 0.0015;
    const crisisPenalty = politician.id === president?.id ? activeCrises.reduce((sum, crisis) => sum + crisis.severity * 0.006, 0) : 0;
    if (politician.approval != null) politician.approval = round1(clamp(politician.approval + (target - politician.approval) * 0.008 + economicSignal + stateSignal + skill - crisisPenalty + rng.normal(0, 0.20), 18, 82));
    politician.homePopularity = round1(clamp(politician.homePopularity + ((politician.approval ?? 50) - politician.homePopularity) * 0.004 + rng.normal(0, 0.07), 8, 92));
    if (world.date.week % 13 === 0 && politician.officeStateId) adjustStateStanding(world, politician, politician.officeStateId, politician.office === 'Governor' ? 0.34 : 0.16, (((politician.approval ?? 50) - 50) * 0.012), politician.office === 'Governor' ? 0.12 : 0.05);
    else if (politician.office === 'President' && world.date.week % 13 === 0) { politician.stateFavorabilityMap=politician.stateFavorabilityMap.map((v)=>round1(clamp(v+((politician.approval??50)-v)*0.045,1,99))); politician.stateRecognitionMap=politician.stateRecognitionMap.map((v)=>round1(clamp(v+0.16,0,100))); recalculateRecognition(world,politician); }
    politician.momentum = round1(clamp(politician.momentum * 0.992 + rng.normal(0, 0.08), -35, 35));
    recalculatePower(politician);
  });
}

function eligiblePolicies(politician, level) {
  return POLICY_LIBRARY.filter((policy) => {
    if (!(policy.level === level || policy.level === 'both')) return false;
    const value = politician.ideology[policy.ideology.key];
    if (policy.ideology.min != null && value < policy.ideology.min) return false;
    if (policy.ideology.max != null && value > policy.ideology.max) return false;
    return true;
  });
}

function effectSummary(effects) {
  const labels = [];
  const map = { growth: 'growth', budget: 'budget', education: 'education', health: 'health', infrastructure: 'infrastructure', crime: 'crime', rights: 'civil rights', environment: 'environment' };
  Object.entries(map).forEach(([key, label]) => {
    if (effects[key]) labels.push(`${effects[key] > 0 ? '+' : ''}${effects[key]} ${label}`);
  });
  return labels.slice(0, 4).join(' · ');
}

function applyPolicy(world, rng, politician, policy, state = null) {
  const effects = policy.effects;
  if (state) {
    if (effects.growth) state.metrics.growth = round1(clamp(state.metrics.growth + effects.growth, -7, 10));
    if (effects.budget) state.metrics.budget = round1(clamp(state.metrics.budget + effects.budget, -20, 20));
    if (effects.education) state.metrics.education = round1(clamp(state.metrics.education + effects.education, 15, 100));
    if (effects.health) state.metrics.health = round1(clamp(state.metrics.health + effects.health, 15, 100));
    if (effects.infrastructure) state.metrics.infrastructure = round1(clamp(state.metrics.infrastructure + effects.infrastructure, 15, 100));
    if (effects.crime) state.metrics.crime = round1(clamp(state.metrics.crime + effects.crime, 10, 100));
    if (effects.rights) state.metrics.rights = round1(clamp(state.metrics.rights + effects.rights, 5, 100));
    if (effects.environment) state.metrics.environment = round1(clamp(state.metrics.environment + effects.environment, 5, 100));
  } else {
    if (effects.growth) world.economy.growth = round1(clamp(world.economy.growth + effects.growth * 0.4, -7, 10));
    if (effects.budget) world.economy.confidence = round1(clamp(world.economy.confidence + effects.budget * 0.12, 15, 90));
    const society=world.country.society, national=world.country.nationalStats;
    if (policy.id==='income-tax-cut') { society.taxBurden=round1(clamp(society.taxBurden-1.8,1,60)); society.inequality=round1(clamp(society.inequality+1.2,5,95)); }
    if (policy.id==='public-investment') { society.taxBurden=round1(clamp(society.taxBurden+1.0,1,60)); society.socialSpending=round1(clamp(society.socialSpending+2.2,0,70)); society.qualityLife=round1(clamp(society.qualityLife+0.8,5,100)); national.debt=round1(clamp(national.debt+2.5,0,180)); }
    if (policy.id==='budget-discipline') { society.socialSpending=round1(clamp(society.socialSpending-0.8,0,70)); national.debt=round1(clamp(national.debt-3,0,180)); }
    if (policy.id==='clean-energy') { society.taxBurden=round1(clamp(society.taxBurden+0.4,1,60)); society.qualityLife=round1(clamp(society.qualityLife+0.4,5,100)); }
    if (policy.id==='energy-expansion') { national.gdpPerCapita=round1(clamp(national.gdpPerCapita+0.7,5,150)); }
  }
  const coalitionMap = { conservative: 'conservatives', progressive: 'progressives', labor: 'labor', business: 'business', moderates: 'moderates', populists: 'populists' };
  Object.entries(coalitionMap).forEach(([effectKey, coalitionKey]) => {
    if (effects[effectKey]) politician.coalition[coalitionKey] = round1(clamp(politician.coalition[coalitionKey] + effects[effectKey], 1, 99));
  });
  if (state) adjustStateStanding(world, politician, state.id, 1.0 + (effects.nationalRecognition || 0) * 0.35, 0.8 + (effects.nationalPopularity || 0) * 0.45, 0.55);
  else world.states.forEach((s) => adjustStateStanding(world, politician, s.id, (effects.nationalRecognition || 0) / 50 + 0.05, (effects.nationalPopularity || 0) / 50, 0));
  politician.legacy = round1(politician.legacy + 0.4 + (policy.tags.includes('rights') ? 0.5 : 0));
  const record = {
    id: uid('policy', world, rng), year: world.date.year, week: world.date.week,
    level: state ? 'State' : 'Federal', jurisdictionId: state?.id || 'federal', policyId: policy.id,
    name: policy.name, issue: policy.issue, description: policy.description, effects: { ...effects }, summary: effectSummary(effects)
  };
  politician.policyRecord.unshift(record);
  if (politician.policyRecord.length > 90) politician.policyRecord.length = 90;
  if (state) {
    state.policyHistory.unshift({ ...record, governorId: politician.id });
    if (state.policyHistory.length > 120) state.policyHistory.length = 120;
  } else {
    world.government.laws.unshift({ ...record, presidentId: politician.id, significance: policy.tags.includes('rights') ? 4 : 3 });
    currentAdministration(world).laws.push(record.id);
  }
  policy.tags.forEach((tag) => {
    if (politician.governingRecord[tag] != null) politician.governingRecord[tag] = round1(politician.governingRecord[tag] + 1 + politician.abilities.governance / 100);
  });
  addCareer(politician, world, `${state ? `Signed ${policy.name} in ${state.name}` : `Signed the federal ${policy.name}`}.`, 'Policy');
  recalculatePower(politician);

  const controversial = policy.id.includes('abortion') || policy.id.includes('voter') || Math.abs(effects.progressive || 0) + Math.abs(effects.conservative || 0) >= 10;
  if (controversial || rng.next() < 0.16) {
    addStory(world, rng, {
      category: state ? 'States' : 'Government', importance: controversial ? 4 : 3,
      title: controversial ? `${politician.name} signs the ${policy.name}` : rng.pick(EVENT_HEADLINES.law),
      text: `${policy.description} The decision changes ${politician.name}’s standing beyond ${state?.name || 'the capital'}: conservatives ${effects.conservative ? `${effects.conservative > 0 ? '+' : ''}${effects.conservative}` : '—'}, progressives ${effects.progressive ? `${effects.progressive > 0 ? '+' : ''}${effects.progressive}` : '—'}.`,
      subjectId: politician.id, stateId: state?.id || null
    });
  }
}

function maybeGovernorPolicies(world, rng) {
  if (![13, 26, 39, 52].includes(world.date.week)) return;
  world.states.forEach((state) => {
    const governor = getPolitician(world, state.governorId);
    if (!governor || governor.status !== 'Active') return;
    const chance = 0.20 + governor.abilities.governance / 420 + governor.hidden.ambition / 900;
    if (rng.next() > chance) return;
    const pool = eligiblePolicies(governor, 'state').filter((policy) => !state.policyHistory.slice(0, 8).some((record) => record.policyId === policy.id));
    if (!pool.length) return;
    const policy = rng.pick(pool);
    applyPolicy(world, rng, governor, policy, state);
  });
}

function maybeFederalPolicy(world, rng) {
  if (world.date.week % 11 !== 0 || rng.next() > 0.40) return;
  const president = currentPresident(world);
  if (!president) return;
  const pool = eligiblePolicies(president, 'both').filter((policy) => !world.government.laws.slice(0, 8).some((law) => law.policyId === policy.id));
  if (!pool.length) return;
  const samePartyHouse = president.partyId === 'union' ? world.government.house.union >= 218 : world.government.house.liberty >= 218;
  const samePartySenate = president.partyId === 'union' ? world.government.senate.union >= 50 : world.government.senate.liberty >= 50;
  const passage = 0.18 + president.abilities.coalition / 260 + president.abilities.governance / 340 + (samePartyHouse ? 0.12 : -0.06) + (samePartySenate ? 0.10 : -0.06);
  if (rng.next() < passage) applyPolicy(world, rng, president, rng.pick(pool), null);
  else if (rng.next() < 0.25) addStory(world, rng, { category: 'Congress', importance: 2, title: `${rng.pick(pool).name} stalls in Congress`, text: 'The administration failed to unite its coalition or attract enough opposition votes.', subjectId: president.id });
}

function maybeStartOrResolveCrisis(world, rng) {
  const president = currentPresident(world);
  const active = world.government.crises.filter((crisis) => crisis.active);
  active.forEach((crisis) => {
    crisis.weeks += 1;
    crisis.severity = round1(clamp(crisis.severity + rng.normal(-0.04, 0.20), 1, 10));
    if (crisis.weeks > 7 && rng.next() < 0.055 + president.abilities.governance / 1400) {
      crisis.active = false;
      crisis.endYear = world.date.year;
      crisis.endWeek = world.date.week;
      const handledWell = rng.next() < (president.abilities.governance + president.abilities.empathy + president.abilities.discipline) / 300;
      const impact = crisis.severity * (handledWell ? 0.42 : -0.42);
      president.approval = round1(clamp(president.approval + impact, 15, 85));
      president.legacy = round1(president.legacy + crisis.severity * (handledWell ? 1.3 : -0.9));
      president.governingRecord.crisis = round1(president.governingRecord.crisis + crisis.severity * (handledWell ? 1 : -0.7));
      addCareer(president, world, `${handledWell ? 'Successfully managed' : 'Was politically damaged by'} the ${crisis.name}.`, 'Crisis');
      addStory(world, rng, {
        category: 'Crisis', importance: crisis.severity >= 7 ? 5 : 4,
        title: handledWell ? `${crisis.name} recedes after a strong response` : `${crisis.name} ends with lasting political damage`,
        text: handledWell ? `${president.name} receives broad credit for the response.` : `${president.name} leaves the crisis with weaker approval and a disputed governing record.`,
        subjectId: president.id
      });
    }
  });
  if (active.length || rng.next() > 0.0065) return;
  const types = [
    ['Banking Panic','financial crisis'], ['Coastal Storm Emergency','natural disaster'], ['National Rail Strike','labor crisis'],
    ['Border Standoff','security crisis'], ['Public Health Emergency','health crisis'], ['Energy Supply Shock','energy crisis'],
    ['Constitutional Confrontation','institutional crisis'], ['Overseas Military Crisis','foreign-policy crisis']
  ];
  const [name, type] = rng.pick(types);
  const crisis = { id: uid('crisis', world, rng), name, type, active: true, severity: rng.int(4, 9), weeks: 0, startYear: world.date.year, startWeek: world.date.week, endYear: null, endWeek: null };
  world.government.crises.unshift(crisis);
  currentAdministration(world).crises.push(crisis.id);
  addStory(world, rng, { category: 'Crisis', importance: 5, title: `${name} tests ${president.name}`, text: `A ${type} places the administration under immediate scrutiny.`, subjectId: president.id });
  addHistory(world, { type: 'Crisis', importance: 5, title: name, text: `The crisis began in Week ${world.date.week} of Year ${world.date.year}.` });
}

function maybeScandal(world, rng) {
  if (rng.next() > 0.009) return;
  const pool = officeholders(world).filter((p) => p.status === 'Active');
  const subject = rng.pick(pool);
  if (!subject) return;
  const risk = subject.hidden.corruption / 170 + subject.hidden.risk / 420 - subject.abilities.discipline / 700 + 0.10;
  if (rng.next() > risk) return;
  subject.scandals += 1;
  const serious = rng.next() < 0.22 + subject.hidden.corruption / 260;
  subject.approval = subject.approval == null ? null : round1(clamp(subject.approval - (serious ? rng.normal(7, 2) : rng.normal(3, 1)), 10, 85));
  const scandalState=subject.officeStateId||subject.homeStateId;
  adjustStateStanding(world,subject,scandalState,serious?2:1,serious?-7:-3,serious?0.7:0.3);
  subject.momentum = round1(clamp(subject.momentum - (serious ? 8 : 4), -35, 35));
  addCareer(subject, world, `${serious ? 'Faced a major' : 'Faced an'} ethics controversy.`, 'Scandal');
  addStory(world, rng, { category: 'Scandal', importance: serious ? 4 : 3, title: rng.pick(EVENT_HEADLINES.scandal), text: `${subject.name}, ${subject.office.toLowerCase()}, faces allegations that may alter the next election.`, subjectId: subject.id, stateId: subject.officeStateId });
  recalculatePower(subject);
}


function candidateGroupAppeal(world, candidate, state, primaryPartyId = null) {
  const affinity=ORIGIN_GROUP_AFFINITY[candidate.careerOriginId]||{};
  let weighted=0,total=0;
  for(const sg of state.groups||[]){
    const group=POPULATION_GROUPS.find((g)=>g.id===sg.groupId); if(!group)continue;
    const dimensions=['economy','social','federal','foreign','trade','immigration','environment','institutions','style'];
    let fit=62;
    let used=0;
    dimensions.forEach((key)=>{if(group[key]!=null&&candidate.ideology[key]!=null){fit-=Math.abs(group[key]-candidate.ideology[key])*0.18;used++;}});
    if(!used)fit=50;
    fit+=affinity[sg.groupId]||0;
    fit+=(candidate.abilities.empathy-50)*0.045+(candidate.abilities.charisma-50)*0.04;
    if(candidate.homeStateId===state.id)fit+=candidate.careerOriginId==='local-politics'||candidate.careerOriginId==='state-politics'?6:2;
    if(primaryPartyId){const unionLoyalty=sg.loyaltyUnion??50;const partisanFit=primaryPartyId==='union'?unionLoyalty:100-unionLoyalty;fit+= (partisanFit-50)*0.13;}
    const turnout=(sg.enthusiasm??60)/60;
    weighted+=clamp(fit,5,95)*(sg.share||0)*turnout; total+=(sg.share||0)*turnout;
  }
  return round1(total?weighted/total:50);
}

function raceCandidatePool(world, state, partyId, office, district = null, unavailable = new Set()) {
  const allowedOffices = office === 'House'
    ? ['Representative','State Legislator','Mayor','State Executive','Private Citizen']
    : office === 'Governor'
      ? ['Governor','Senator','Representative','State Legislator','Mayor','State Executive','Private Citizen']
      : ['Senator','Representative','Governor','State Legislator','Mayor','State Executive','Private Citizen'];
  return state.politicianIds
    .map((id) => getPolitician(world, id))
    .filter((p) => p && p.status === 'Active' && p.partyId === partyId && !unavailable.has(p.id) && p.age >= (office === 'House' ? 25 : office === 'Senate' ? 30 : 30) && allowedOffices.includes(p.office) && !['President','Vice President'].includes(p.office))
    .filter((p) => !district || p.homeDistrictId === district.id || p.office === 'Representative' && p.officeDistrictId === district.id)
    .sort((a, b) => politicianScore(b) - politicianScore(a));
}

function ensurePool(world, rng, state, partyId, office, district, pool, minimum) {
  while (pool.length < minimum) {
    const newcomer = createNewPolitician(world, rng, world.date.year, { stateId: state.id, districtId: district?.id, partyId, age: rng.int(office === 'House' ? 25 : 30, 49) });
    world.politicians.push(newcomer);
    pool.push(newcomer);
  }
  return pool;
}

function primaryFieldSize(office, incumbent, rng) {
  if (incumbent) {
    const safe = (incumbent.approval ?? incumbent.homePopularity) > 58 && incumbent.scandals === 0 && incumbent.power > 56;
    const uncontestedChance = office === 'House' ? (safe ? 0.72 : 0.48) : (safe ? 0.53 : 0.30);
    if (rng.next() < uncontestedChance) return 1;
    return office === 'House' ? rng.int(2, 3) : rng.int(2, 4);
  }
  const uncontestedChance = office === 'House' ? 0.17 : 0.08;
  return rng.next() < uncontestedChance ? 1 : office === 'House' ? rng.int(2, 4) : rng.int(2, 5);
}

function primaryScore(world, politician, office, state, district, incumbent, rng) {
  const platform=world.parties[politician.partyId]?.platform||{};
  const ideologyFit = 100 - Math.abs(politician.ideology.economy - (platform.economy??50)) * 0.28 - Math.abs(politician.ideology.social - (platform.social??50)) * 0.28 - Math.abs(politician.ideology.style - (platform.style??50)) * 0.10;
  const stateIndex = world.states.findIndex((s)=>s.id===state.id);
  const localFav = politician.stateFavorabilityMap?.[stateIndex] ?? politician.homePopularity;
  const localRec = politician.stateRecognitionMap?.[stateIndex] ?? politician.stateRecognition;
  const home = localFav * 0.34 + localRec * 0.30;
  const groupAppeal=candidateGroupAppeal(world,politician,state,politician.partyId);
  const officeBonus = politician.id === incumbent?.id ? 16 + (politician.approval ?? 50) * 0.16 : politician.office === 'Governor' ? 13 : politician.office === 'Senator' ? 10 : politician.office === 'Representative' ? 7 : 0;
  const districtBonus = district && politician.homeDistrictId === district.id ? 7 : 0;
  return home + groupAppeal*0.16 + politician.abilities.charisma * 0.13 + politician.abilities.organization * 0.14 + politician.abilities.fundraising * 0.10 + politician.abilities.speech * 0.08 + ideologyFit * 0.10 + officeBonus + districtBonus + RARITIES[politician.rarity].weight + politician.momentum * 0.35 - politician.scandals * 4 + rng.normal(0, office === 'House' ? 6 : 5);
}

function distributeShares(scored) {
  const min = Math.min(...scored.map((item) => item.score));
  const weighted = scored.map((item) => ({ ...item, weight: Math.pow(Math.max(2, item.score - min + 10), 1.35) }));
  const total = weighted.reduce((sum, item) => sum + item.weight, 0) || 1;
  return weighted.map((item) => ({ ...item, share: round1(item.weight / total * 100) })).sort((a, b) => b.share - a.share);
}

function processPrimaryLoss(world, rng, politician, share, office, state, winner) {
  politician.primariesLost += 1;
  politician.electionsLost += 1;
  const elite = ['Generational','Legend','Epic'].includes(politician.rarity);
  const young = politician.age <= 36;
  const strongShowing = share >= (office === 'House' ? 35 : 28);
  let recognitionGain = Math.max(0.2, (share - 12) * 0.09) + politician.abilities.charisma / 100;
  if (elite) recognitionGain *= 1.8;
  if (young) recognitionGain *= 1.25;
  if (strongShowing) recognitionGain += 2.5;
  adjustStateStanding(world, politician, state.id, recognitionGain, recognitionGain * 0.45, office === 'House' ? 0.06 : (elite || strongShowing) ? 0.36 : 0.16);
  politician.electionHistory.push({ year: world.date.year, office, stage: 'Primary', stateId: state.id, result: 'Lost', voteShare: share, opponentId: winner.id });
  addCareer(politician, world, `Lost the ${partyName(politician.partyId, world)} primary for ${office === 'Governor' ? `governor of ${state.name}` : office === 'Senate' ? `the Senate in ${state.name}` : `House district ${getDistrict(world, politician.homeDistrictId)?.name || ''}`} with ${share.toFixed(1)}%, but left the race with ${recognitionGain.toFixed(1)} additional recognition.`, 'Election');

  if ((office === 'Governor' || office === 'Senate') && young && elite && share >= 22) {
    addStory(world, rng, {
      category: 'Rising Stars', importance: politician.rarity === 'Generational' ? 5 : 4,
      title: rng.pick(EVENT_HEADLINES.risingStar),
      text: `${politician.name}, only ${politician.age}, lost the ${partyName(politician.partyId, world)} ${office.toLowerCase()} primary in ${state.name} with ${share.toFixed(1)}%—but gained ${recognitionGain.toFixed(1)} points of state recognition and is now widely viewed as a future contender.`,
      subjectId: politician.id, stateId: state.id
    });
  }
}

function runPrimary(world, rng, { office, state, district = null, partyId, incumbent = null, unavailable = new Set() }) {
  let pool = raceCandidatePool(world, state, partyId, office, district, unavailable);
  const size = primaryFieldSize(office, incumbent?.partyId === partyId ? incumbent : null, rng);
  pool = ensurePool(world, rng, state, partyId, office, district, pool, size);
  const field = [];
  if (incumbent?.partyId === partyId && !unavailable.has(incumbent.id)) field.push(incumbent);
  pool.forEach((candidate) => { if (field.length < size && !field.some((p) => p.id === candidate.id)) field.push(candidate); });
  if (!field.length) return null;
  const results = distributeShares(field.map((candidate) => ({ candidate, score: primaryScore(world, candidate, office, state, district, incumbent, rng) })));
  const winner = results[0].candidate;
  winner.primariesWon += 1;
  adjustStateStanding(world, winner, state.id, (results.length === 1 ? 0.4 : office === 'House' ? 1.5 : 3), results.length === 1 ? 0.1 : 0.6, office === 'House' ? 0.04 : 0.18);
  winner.momentum = round1(clamp(winner.momentum + (results.length === 1 ? 0.3 : 2.5), -35, 35));
  winner.electionHistory.push({ year: world.date.year, office, stage: 'Primary', stateId: state.id, districtId: district?.id || null, result: 'Won', voteShare: results[0].share, fieldSize: results.length });
  addCareer(winner, world, results.length === 1 ? `Advanced unopposed through the ${partyName(partyId, world)} primary for ${office}.` : `Won the ${partyName(partyId, world)} primary for ${office} with ${results[0].share.toFixed(1)}%.`, 'Election');
  results.slice(1).forEach((result) => processPrimaryLoss(world, rng, result.candidate, result.share, office, state, winner));
  const record = {
    id: uid('primary', world, rng), year: world.date.year, week: world.date.week, office, stateId: state.id, districtId: district?.id || null,
    partyId, partyName: world.parties[partyId]?.name || partyName(partyId, world), partyEraId: winner.partyEraId, winnerId: winner.id, uncontested: results.length === 1,
    results: results.map((result) => ({ candidateId: result.candidate.id, share: result.share }))
  };
  world.primaryArchive.unshift(record);
  if (world.primaryArchive.length > 60000) world.primaryArchive.length = 60000;
  return { winner, record };
}

function generalCandidateScore(world, rng, candidate, partyId, office, state, district, incumbent) {
  const environment = nationalEnvironmentForUnion(world) * (partyId === 'union' ? 1 : -1);
  const lean = district ? district.lean : state.currentLean;
  const partisan = partyId === 'union' ? -lean : lean;
  const stateIndex=world.states.findIndex((s)=>s.id===state.id);
  const localFav=candidate.stateFavorabilityMap?.[stateIndex] ?? candidate.homePopularity;
  const localRec=candidate.stateRecognitionMap?.[stateIndex] ?? candidate.stateRecognition;
  const groupAppeal=candidateGroupAppeal(world,candidate,state,null);
  const quality = politicianScore(candidate) * 0.48 + localFav * 0.16 + localRec * 0.13 + groupAppeal*0.16 + candidate.abilities.debating * 0.06 + candidate.abilities.fundraising * 0.05;
  const incumbentBonus = incumbent?.id === candidate.id ? 8 + (candidate.approval ?? 50) * 0.07 + Math.min(5, world.date.year - candidate.officeSince) * 0.5 : 0;
  const executive = office === 'Governor' ? candidate.abilities.governance * 0.07 : 0;
  return quality + partisan * (office === 'House' ? 1.25 : 1.0) + environment * (office === 'House' ? 0.9 : 1.15) + incumbentBonus + executive + candidate.momentum * 0.30 - candidate.scandals * 4 + rng.normal(0, office === 'House' ? 5.5 : 4.2);
}

function vacateOffice(world, politician) {
  if (!politician) return;
  if (politician.office === 'Representative') {
    const district = getDistrict(world, politician.officeDistrictId);
    if (district?.incumbentId === politician.id) district.incumbentId = null;
  } else if (politician.office === 'Senator') {
    const seat = world.senateSeats.find((item) => item.incumbentId === politician.id);
    if (seat) seat.incumbentId = null;
    const state = getState(world, politician.officeStateId);
    if (state) state.senatorIds = state.senatorIds.filter((id) => id !== politician.id);
  } else if (politician.office === 'Governor') {
    const state = getState(world, politician.officeStateId);
    if (state?.governorId === politician.id) state.governorId = null;
  }
  politician.office = 'Private Citizen';
  politician.officeStateId = null;
  politician.officeDistrictId = null;
  politician.approval = null;
  recalculatePower(politician);
}

function takeOffice(world, politician, office, state, district = null) {
  const officeLabel = office === 'House' ? 'Representative' : office === 'Senate' ? 'Senator' : office;
  if (politician.office !== officeLabel || politician.officeStateId !== state.id || politician.officeDistrictId !== district?.id) vacateOffice(world, politician);
  politician.office = officeLabel;
  politician.officeStateId = state.id;
  politician.officeDistrictId = district?.id || null;
  politician.officeSince = world.date.year + (world.date.week >= 45 ? 1 : 0);
  politician.approval = round1(clamp(53 + politician.momentum * 0.12 + Math.max(0, politician.homePopularity - 50) * 0.10, 38, 72));
  if (office === 'House') {
    politician.terms.house += 1;
    district.incumbentId = politician.id;
  } else if (office === 'Senate') {
    politician.terms.senate += 1;
  } else if (office === 'Governor') {
    politician.terms.governor += 1;
    state.governorId = politician.id;
    state.governorTerms = politician.terms.governor;
    politician.executiveBaseline = { year: world.date.year + 1, gdpRank: state.metricRanks.gdpPerCapita, incomeRank: state.metricRanks.income, growthRank: state.metricRanks.growth };
  }
  recalculatePower(politician);
}

function runGeneralRace(world, rng, race) {
  const { office, stateId, districtId, incumbentId, unionCandidateId, libertyCandidateId } = race;
  const state = getState(world, stateId);
  const district = getDistrict(world, districtId);
  const originalIncumbent = getPolitician(world, incumbentId);
  const liveIncumbentId = office === 'House' ? district?.incumbentId : office === 'Senate' ? world.senateSeats.find((item) => item.id === race.seatId)?.incumbentId : state?.governorId;
  const incumbent = getPolitician(world, liveIncumbentId);
  const union = getPolitician(world, unionCandidateId);
  const liberty = getPolitician(world, libertyCandidateId);
  const unionScore = generalCandidateScore(world, rng, union, 'union', office, state, district, incumbent);
  const libertyScore = generalCandidateScore(world, rng, liberty, 'liberty', office, state, district, incumbent);
  const unionShare = round1(clamp(50 + (unionScore - libertyScore) * 0.46, 18, 82));
  const libertyShare = round1(100 - unionShare);
  const winner = unionShare >= 50 ? union : liberty;
  const loser = winner.id === union.id ? liberty : union;
  const winnerShare = Math.max(unionShare, libertyShare);
  const loserShare = 100 - winnerShare;

  winner.electionsWon += 1;
  loser.electionsLost += 1;
  adjustStateStanding(world, winner, state.id, office === 'House' ? 3 : 7, 2.5 + (winnerShare - 50) * 0.12, office === 'House' ? 0.05 : 0.25);
  adjustStateStanding(world, loser, state.id, office === 'House' ? 0.5 : 1.5, Math.max(-3,(loserShare-42)*0.12), office === 'House' ? 0.02 : 0.10);
  winner.electionHistory.push({ year: world.date.year, office, stage: 'General', stateId, districtId: districtId || null, result: 'Won', voteShare: winnerShare, opponentId: loser.id });
  loser.electionHistory.push({ year: world.date.year, office, stage: 'General', stateId, districtId: districtId || null, result: 'Lost', voteShare: loserShare, opponentId: winner.id });
  addCareer(winner, world, `Won election as ${office === 'House' ? `representative for ${district.name}` : office === 'Governor' ? `governor of ${state.name}` : `senator from ${state.name}`} with ${winnerShare.toFixed(1)}%.`, 'Election');
  addCareer(loser, world, `Lost the general election for ${office} with ${loserShare.toFixed(1)}%.`, 'Election');

  if (incumbent && incumbent.id !== winner.id) {
    addCareer(incumbent, world, `Left office after losing the ${office} election.`, 'Office');
    vacateOffice(world, incumbent);
  }
  if (winner.office !== (office === 'House' ? 'Representative' : office) || winner.id !== incumbent?.id) takeOffice(world, winner, office, state, district);
  else {
    if (office === 'House') winner.terms.house += 1;
    if (office === 'Senate') winner.terms.senate += 1;
    if (office === 'Governor') winner.terms.governor += 1;
    winner.officeSince = winner.officeSince || world.date.year;
  }
  if (loser.id !== incumbent?.id && ['Representative','Senator','Governor'].includes(loser.office)) {
    // Candidates who abandoned another office to seek this one do not retain it.
    vacateOffice(world, loser);
  }

  if (office === 'Senate') {
    const seat = world.senateSeats.find((item) => item.id === race.seatId);
    seat.incumbentId = winner.id;
    seat.nextElectionYear = world.date.year + 6;
    state.senatorIds = world.senateSeats.filter((item) => item.stateId === state.id).map((item) => item.id === seat.id ? winner.id : item.incumbentId).filter(Boolean);
  }
  if (office === 'Governor') {
    state.nextGovernorElectionYear = world.date.year + 4;
    const previousYoungest = world.records.youngestGovernor;
    if (!previousYoungest || winner.age < previousYoungest.age) {
      world.records.youngestGovernor = { politicianId: winner.id, age: winner.age, year: world.date.year, stateId: state.id };
      addStory(world, rng, { category: 'States', importance: winner.age <= 35 ? 5 : 4, title: rng.pick(EVENT_HEADLINES.governor), text: `${winner.name}, age ${winner.age}, becomes the youngest governor in the archived history of the republic after winning ${state.name}.`, subjectId: winner.id, stateId: state.id });
    }
  }
  const archive = { id: uid('race', world, rng), year: world.date.year, week: world.date.week, office, stateId, districtId: districtId || null, seatId: race.seatId || null, incumbentId, unionCandidateId: union.id, libertyCandidateId: liberty.id, unionPartyName: world.parties.union.name, libertyPartyName: world.parties.liberty.name, unionPartyEraId: union.partyEraId, libertyPartyEraId: liberty.partyEraId, winnerId: winner.id, unionShare, libertyShare, margin: round1(Math.abs(unionShare - libertyShare)), flipped: originalIncumbent ? originalIncumbent.partyId !== winner.partyId : false };
  world.raceArchive.unshift(archive);
  if (world.raceArchive.length > 30000) world.raceArchive.length = 30000;
  return archive;
}

function prepareFederalStatePrimaries(world, rng) {
  if (![2, 4].includes(cycleYear(world.date.year)) || world.date.week !== 28 || world.pendingRaces) return;
  const unavailable = new Set([world.government.presidentId, world.government.vicePresidentId]);
  const pending = { year: world.date.year, governor: [], senate: [], house: [] };

  world.states.filter((state) => state.nextGovernorElectionYear <= world.date.year).forEach((state) => {
    const incumbent = getPolitician(world, state.governorId);
    const canRun = incumbent && incumbent.status === 'Active' && incumbent.terms.governor < state.governorTermLimit && incumbent.age < 78;
    const runningIncumbent = canRun ? incumbent : null;
    const union = runPrimary(world, rng, { office: 'Governor', state, partyId: 'union', incumbent: runningIncumbent, unavailable });
    const liberty = runPrimary(world, rng, { office: 'Governor', state, partyId: 'liberty', incumbent: runningIncumbent, unavailable });
    if (union && liberty) {
      pending.governor.push({ office: 'Governor', stateId: state.id, incumbentId: incumbent?.id || null, unionCandidateId: union.winner.id, libertyCandidateId: liberty.winner.id });
      [...union.record.results, ...liberty.record.results].forEach((result) => unavailable.add(result.candidateId));
    }
  });

  world.senateSeats.filter((seat) => seat.nextElectionYear <= world.date.year).forEach((seat) => {
    const state = getState(world, seat.stateId);
    const incumbent = getPolitician(world, seat.incumbentId);
    const runningIncumbent = incumbent?.status === 'Active' && incumbent.age < 82 ? incumbent : null;
    const union = runPrimary(world, rng, { office: 'Senate', state, partyId: 'union', incumbent: runningIncumbent, unavailable });
    const liberty = runPrimary(world, rng, { office: 'Senate', state, partyId: 'liberty', incumbent: runningIncumbent, unavailable });
    if (union && liberty) {
      pending.senate.push({ office: 'Senate', stateId: state.id, seatId: seat.id, incumbentId: incumbent?.id || null, unionCandidateId: union.winner.id, libertyCandidateId: liberty.winner.id });
      [...union.record.results, ...liberty.record.results].forEach((result) => unavailable.add(result.candidateId));
    }
  });

  world.districts.forEach((district) => {
    const state = getState(world, district.stateId);
    const incumbent = getPolitician(world, district.incumbentId);
    const runningIncumbent = incumbent?.status === 'Active' && incumbent.age < 84 && !unavailable.has(incumbent.id) ? incumbent : null;
    const union = runPrimary(world, rng, { office: 'House', state, district, partyId: 'union', incumbent: runningIncumbent, unavailable });
    const liberty = runPrimary(world, rng, { office: 'House', state, district, partyId: 'liberty', incumbent: runningIncumbent, unavailable });
    if (union && liberty) pending.house.push({ office: 'House', stateId: state.id, districtId: district.id, incumbentId: incumbent?.id || null, unionCandidateId: union.winner.id, libertyCandidateId: liberty.winner.id });
  });
  world.pendingRaces = pending;
  const totalPrimaries = pending.house.length * 2 + pending.senate.length * 2 + pending.governor.length * 2;
  const uncontested = world.primaryArchive.filter((record) => record.year === world.date.year && record.uncontested).length;
  addStory(world, rng, {
    category: 'Primaries', importance: 5, title: 'The republic chooses thousands of nominees',
    text: `${totalPrimaries.toLocaleString()} party nominations were resolved across 435 House districts, ${pending.senate.length} Senate contests, and ${pending.governor.length} governorships. ${uncontested.toLocaleString()} candidates advanced without opposition.`
  });
}

function resolveFederalStateElections(world, rng) {
  if (world.date.week !== 45 || !world.pendingRaces) return;
  const results = [];
  world.pendingRaces.governor.forEach((race) => results.push(runGeneralRace(world, rng, race)));
  world.pendingRaces.senate.forEach((race) => results.push(runGeneralRace(world, rng, race)));
  world.pendingRaces.house.forEach((race) => results.push(runGeneralRace(world, rng, race)));
  syncGovernmentCounts(world);
  const flips = results.filter((result) => result.flipped).length;
  const governorFlips = results.filter((result) => result.office === 'Governor' && result.flipped).length;
  addStory(world, rng, {
    category: cycleYear(world.date.year) === 4 ? 'Election Night' : 'Midterms', importance: 5,
    title: cycleYear(world.date.year) === 4 ? 'Congress and the states render their verdict' : 'A national midterm reshapes power',
    text: `${flips} offices changed party, including ${governorFlips} governorships. The House stands Union ${world.government.house.union}–${world.government.house.liberty} Liberty; the Senate Union ${world.government.senate.union}–${world.government.senate.liberty} Liberty.`
  });
  addHistory(world, { type: 'Election', importance: 5, title: `${cycleYear(world.date.year) === 4 ? 'General' : 'Midterm'} Election of Year ${world.date.year}`, text: `${results.length} federal and gubernatorial contests were resolved with ${flips} party flips.` });
  world.pendingRaces = null;
}

function presidentialDesire(world, politician, rng) {
  if (politician.status !== 'Active' || politician.age < 35 || politician.age > 78 || politician.terms.president >= 2) return -999;
  if (!['President','Vice President','Governor','Senator','Representative'].includes(politician.office) && politician.nationalRecognition < 42) return -999;
  const governorYears = politician.office === 'Governor' ? world.date.year - politician.officeSince : 0;
  const governorReadiness = politician.office !== 'Governor' ? 0 : governorYears < 4 ? -28 : governorYears < 8 ? 0 : governorYears < 12 ? 10 : 18;
  const executiveRecord = politician.governingRecord.stateRankChange * 1.0 + politician.governingRecord.economy * 0.6 + politician.governingRecord.crisis * 0.4;
  const office = { President: 45, 'Vice President': 24, Governor: 20 + Math.min(12, governorYears) + governorReadiness, Senator: 15, Representative: 5 }[politician.office] || 0;
  return politicianScore(politician, 'national') + politician.nationalRecognition * 0.55 + politician.nationalPopularity * 0.28 + executiveRecord + office + politician.hidden.ambition * 0.14 + RARITIES[politician.rarity].weight * 1.6 + rng.normal(0, 5);
}

function choosePresidentialField(world, partyId, rng) {
  const president = currentPresident(world);
  const incumbentEligible = president?.partyId === partyId && president.terms.president < 2 && president.status === 'Active';
  const ranked = world.politicians
    .filter((p) => p.partyId === partyId)
    .map((politician) => ({ politician, desire: presidentialDesire(world, politician, rng) }))
    .filter((item) => item.desire > 30)
    .sort((a, b) => b.desire - a.desire);
  const size = incumbentEligible ? rng.int(2, 4) : rng.int(6, 10);
  const selected = [];
  if (incumbentEligible) selected.push(president);
  ranked.forEach(({ politician }) => { if (selected.length < size && !selected.some((p) => p.id === politician.id)) selected.push(politician); });
  return selected.map((politician, index) => ({ politicianId: politician.id, status: 'Active', delegates: 0, momentum: round1(politician.momentum + (index === 0 ? 4 : 0) + rng.normal(0, 2)), funds: round1(clamp(politician.abilities.fundraising * 0.65 + politician.nationalRecognition * 0.25 + rng.normal(0, 7), 12, 100)), poll: 0, contestsWon: 0, enteredWeek: world.date.week, withdrawalWeek: null }));
}

function presidentialCandidates(world, partyId) { return partyId === 'union' ? world.electionCycle.unionCandidates : world.electionCycle.libertyCandidates; }

function recalculatePresidentialPolls(world, partyId, rng) {
  const field = presidentialCandidates(world, partyId).filter((candidate) => candidate.status === 'Active');
  const scored = field.map((candidate) => {
    const politician = getPolitician(world, candidate.politicianId);
    const incumbent = politician.office === 'President' ? 32 : 0;
    const record = politician.governingRecord.stateRankChange * 0.55 + politician.governingRecord.economy * 0.25;
    return { candidate, value: Math.max(1, politicianScore(politician, 'national') * 0.62 + politician.nationalRecognition * 0.45 + candidate.momentum * 1.3 + candidate.funds * 0.15 + incumbent + record + rng.normal(0, 3)) };
  });
  const total = scored.reduce((sum, item) => sum + item.value, 0) || 1;
  scored.forEach(({ candidate, value }) => { candidate.poll = round1(value / total * 100); });
}

function launchPresidentialPrimaries(world, rng) {
  if (cycleYear(world.date.year) !== 4 || world.date.week !== 2 || world.electionCycle.unionCandidates.length) return;
  world.electionCycle.phase = 'Presidential Primaries';
  world.electionCycle.cycleYear = world.date.year;
  world.electionCycle.unionCandidates = choosePresidentialField(world, 'union', rng);
  world.electionCycle.libertyCandidates = choosePresidentialField(world, 'liberty', rng);
  recalculatePresidentialPolls(world, 'union', rng);
  recalculatePresidentialPolls(world, 'liberty', rng);
  [...world.electionCycle.unionCandidates, ...world.electionCycle.libertyCandidates].forEach((candidate) => {
    const p = getPolitician(world, candidate.politicianId);
    addCareer(p, world, 'Entered the presidential nomination contest.', 'Election');
    world.states.forEach((state)=>adjustStateStanding(world,p,state.id,0.08,0,0));
  });
  addStory(world, rng, { category: 'Presidential Race', importance: 5, title: rng.pick(EVENT_HEADLINES.primary), text: `${world.electionCycle.unionCandidates.length} Union and ${world.electionCycle.libertyCandidates.length} Liberty candidates begin the state-by-state presidential nomination campaign.` });
}

function presidentialPrimaryScore(world, rng, candidate, state) {
  const p = getPolitician(world, candidate.politicianId);
  const platform=world.parties[p.partyId]?.platform||{};
  const fit = 100 - Math.abs(p.ideology.economy - (platform.economy??50)) * 0.30 - Math.abs(p.ideology.social - (platform.social??50)) * 0.30 - Math.abs(p.ideology.federal - (platform.federal??50)) * 0.12;
  const stateIndex=world.states.findIndex((s)=>s.id===state.id);
  const stateRec=p.stateRecognitionMap?.[stateIndex] ?? p.nationalRecognition;
  const stateFav=p.stateFavorabilityMap?.[stateIndex] ?? p.nationalPopularity;
  const home = (p.homeStateId === state.id ? 18 : getState(world, p.homeStateId)?.region === state.region ? 4 : 0) + stateRec*0.22 + (stateFav-50)*0.08;
  const governor = p.office === 'Governor' && p.officeStateId === state.id ? 25 : 0;
  const record = p.governingRecord.stateRankChange * 0.8 + p.governingRecord.economy * 0.35;
  return candidate.poll * 0.45 + candidate.momentum * 0.8 + candidate.funds * 0.16 + p.abilities.organization * 0.15 + p.abilities.charisma * 0.15 + p.abilities.speech * 0.08 + p.nationalRecognition * 0.20 + fit * 0.13 + home + governor + record + rng.normal(0, 7);
}

function resolvePresidentialPrimaries(world, rng) {
  if (world.electionCycle.phase !== 'Presidential Primaries' || world.date.week < 5 || world.date.week > 22) return;
  const contests = world.states.filter((state) => state.primaryWeek === world.date.week);
  if (!contests.length) {
    if (world.date.week % 2 === 0) { recalculatePresidentialPolls(world, 'union', rng); recalculatePresidentialPolls(world, 'liberty', rng); }
    return;
  }
  ['union','liberty'].forEach((partyId) => {
    const active = presidentialCandidates(world, partyId).filter((candidate) => candidate.status === 'Active');
    contests.forEach((state) => {
      const results = distributeShares(active.map((candidate) => ({ candidate, score: presidentialPrimaryScore(world, rng, candidate, state) })));
      const delegates = Math.max(20, state.electoralVotes * 4);
      results.forEach((result, index) => {
        const won = Math.round(delegates * result.share / 100);
        result.candidate.delegates += won;
        result.candidate.momentum = round1(clamp(result.candidate.momentum + (index === 0 ? 3 : result.share < 10 ? -1.5 : 0.2), -35, 35));
        if (index === 0) result.candidate.contestsWon += 1;
      });
      const winner = getPolitician(world, results[0].candidate.politicianId);
      if (state.electoralVotes >= 18 || state.primaryWeek <= 8) addStory(world, rng, { category: 'Presidential Primary', importance: state.electoralVotes >= 25 ? 4 : 3, title: `${winner.name} wins ${state.name}`, text: `${winner.name} wins ${results[0].share.toFixed(1)}% and ${delegates} delegates in the ${state.primaryType.toLowerCase()}.`, subjectId: winner.id, stateId: state.id });
    });
    recalculatePresidentialPolls(world, partyId, rng);
    const remaining = presidentialCandidates(world, partyId).filter((candidate) => candidate.status === 'Active').sort((a,b) => b.delegates - a.delegates);
    if (remaining.length > 2 && world.date.week >= 10) {
      const leader = remaining[0].delegates || 1;
      remaining.slice(2).forEach((candidate) => {
        if ((candidate.delegates < leader * 0.18 && candidate.poll < 10 && rng.next() < 0.35) || (candidate.poll < 4 && rng.next() < 0.25)) {
          candidate.status = 'Withdrawn'; candidate.withdrawalWeek = world.date.week;
          const p = getPolitician(world, candidate.politicianId);
          p.electionsLost += 1; world.states.forEach((st)=>adjustStateStanding(world,p,st.id,Math.max(1,candidate.contestsWon)/55,0,0));
          addCareer(p, world, `Suspended a presidential campaign after winning ${candidate.contestsWon} contests.`, 'Election');
        }
      });
    }
  });
}

function finalizePresidentialNominees(world, rng) {
  if (cycleYear(world.date.year) !== 4 || world.date.week !== 23 || world.electionCycle.unionNomineeId) return;
  ['union','liberty'].forEach((partyId) => {
    const field = presidentialCandidates(world, partyId).sort((a,b) => b.delegates - a.delegates || b.poll - a.poll);
    const winner = field[0];
    if (!winner) return;
    if (partyId === 'union') world.electionCycle.unionNomineeId = winner.politicianId; else world.electionCycle.libertyNomineeId = winner.politicianId;
    const nominee = getPolitician(world, winner.politicianId);
    nominee.primariesWon += 1;
    nominee.electionHistory.push({ year: world.date.year, office: 'President', stage: 'Primary', result: 'Won', delegates: winner.delegates, contestsWon: winner.contestsWon });
    nominee.stateRecognitionMap=nominee.stateRecognitionMap.map((v)=>round1(clamp(Math.max(v,74)+rng.normal(0,3),0,100))); recalculateRecognition(world,nominee);
    addCareer(nominee, world, `Won the ${partyName(partyId, world)} presidential nomination with ${winner.delegates} delegates.`, 'Election');
    field.slice(1).forEach((candidate) => {
      const p = getPolitician(world, candidate.politicianId);
      p.primariesLost += 1;
      p.electionHistory.push({ year: world.date.year, office: 'President', stage: 'Primary', result: 'Lost', delegates: candidate.delegates, contestsWon: candidate.contestsWon });
    });
  });
  world.electionCycle.phase = 'Conventions';
  addStory(world, rng, { category: 'Presidential Race', importance: 5, title: 'The presidential matchup is set', text: `${getPolitician(world, world.electionCycle.unionNomineeId).name} and ${getPolitician(world, world.electionCycle.libertyNomineeId).name} emerge as the nominees.` });
}

function holdConventions(world, rng) {
  if (cycleYear(world.date.year) !== 4 || world.date.week !== 29 || world.electionCycle.phase !== 'Conventions') return;
  ['union','liberty'].forEach((partyId) => {
    const nomineeId = partyId === 'union' ? world.electionCycle.unionNomineeId : world.electionCycle.libertyNomineeId;
    const nominee = getPolitician(world, nomineeId);
    const candidates = world.politicians.filter((p) => p.status === 'Active' && p.partyId === partyId && p.id !== nominee.id && p.age >= 35 && p.nationalRecognition >= 25 && !['President'].includes(p.office)).sort((a,b) => (b.abilities.coalition + b.abilities.governance + b.nationalRecognition) - (a.abilities.coalition + a.abilities.governance + a.nationalRecognition));
    const mate = candidates.slice(0, 16).sort((a,b) => {
      const balanceA = Math.abs(a.ideology.social - nominee.ideology.social) + Math.abs(a.ideology.economy - nominee.ideology.economy);
      const balanceB = Math.abs(b.ideology.social - nominee.ideology.social) + Math.abs(b.ideology.economy - nominee.ideology.economy);
      return (b.abilities.coalition + b.nationalRecognition - balanceB * 0.15 + rng.normal(0,4)) - (a.abilities.coalition + a.nationalRecognition - balanceA * 0.15 + rng.normal(0,4));
    })[0];
    if (partyId === 'union') world.electionCycle.unionRunningMateId = mate?.id || null; else world.electionCycle.libertyRunningMateId = mate?.id || null;
    nominee.momentum = round1(clamp(nominee.momentum + 4, -35, 35));
  });
  world.electionCycle.phase = 'General Election';
  addStory(world, rng, { category: 'Conventions', importance: 5, title: 'The parties present their national tickets', text: `${getPolitician(world, world.electionCycle.unionNomineeId).name} selects ${getPolitician(world, world.electionCycle.unionRunningMateId)?.name}; ${getPolitician(world, world.electionCycle.libertyNomineeId).name} selects ${getPolitician(world, world.electionCycle.libertyRunningMateId)?.name}.` });
}

function resolvePresidentialDebate(world, rng) {
  if (world.electionCycle.phase !== 'General Election' || ![34,38,42].includes(world.date.week)) return;
  const union = getPolitician(world, world.electionCycle.unionNomineeId);
  const liberty = getPolitician(world, world.electionCycle.libertyNomineeId);
  const score = (p) => p.abilities.debating * 0.35 + p.abilities.speech * 0.25 + p.abilities.intelligence * 0.15 + p.abilities.discipline * 0.12 + p.abilities.charisma * 0.13 + rng.normal(0, 8);
  const u = score(union); const l = score(liberty);
  const winner = u >= l ? union : liberty; const loser = winner.id === union.id ? liberty : union;
  const margin = Math.abs(u-l);
  winner.momentum = round1(clamp(winner.momentum + 1.5 + margin * 0.08, -35, 35));
  loser.momentum = round1(clamp(loser.momentum - 0.8 - margin * 0.04, -35, 35));
  addStory(world, rng, { category: 'Debate', importance: 4, title: `${winner.name} gains after the presidential debate`, text: `${winner.name} was judged stronger on command, communication, and preparation. The race shifts by ${Math.max(0.5, margin * 0.08).toFixed(1)} points of momentum.`, subjectId: winner.id });
}

function presidentialStateScore(world, rng, candidate, state) {
  const environment = nationalEnvironmentForUnion(world) * (candidate.partyId === 'union' ? 1 : -1);
  const partisan = candidate.partyId === 'union' ? -state.currentLean : state.currentLean;
  const stateIndex=world.states.findIndex((s)=>s.id===state.id);
  const stateRec=state.id==='capital-district'?candidate.nationalRecognition:(candidate.stateRecognitionMap?.[stateIndex]??candidate.nationalRecognition);
  const stateFav=state.id==='capital-district'?candidate.nationalPopularity:(candidate.stateFavorabilityMap?.[stateIndex]??candidate.nationalPopularity);
  const home = candidate.homeStateId === state.id ? 5 : getState(world, candidate.homeStateId)?.region === state.region ? 1 : 0;
  const groupAppeal=state.id==='capital-district'?50:candidateGroupAppeal(world,candidate,state,null);
  const governorRecord = candidate.governingRecord.stateRankChange * 0.55 + candidate.governingRecord.economy * 0.25;
  return politicianScore(candidate, 'national') * 0.42 + stateFav * 0.20 + stateRec * 0.15 + groupAppeal*0.14 + candidate.momentum * 0.50 + candidate.abilities.debating * 0.06 + candidate.abilities.coalition * 0.07 + partisan * 1.0 + environment * 1.0 + home + governorRecord + rng.normal(0, 2.2);
}

function resolvePresidentialElection(world, rng) {
  if (world.electionCycle.phase !== 'General Election' || world.date.week !== 46) return;
  const union = getPolitician(world, world.electionCycle.unionNomineeId);
  const liberty = getPolitician(world, world.electionCycle.libertyNomineeId);
  let unionEV = 0, libertyEV = 0, unionPopular = 0, libertyPopular = 0;
  const stateResults = [];
  [...world.states, world.country.capitalDistrict].forEach((state) => {
    const us = presidentialStateScore(world, rng, union, state);
    const ls = presidentialStateScore(world, rng, liberty, state);
    const unionShare = round1(clamp(50 + (us-ls) * 0.42, 20, 80));
    const turnout = Math.round(state.population * 1_000_000 * (0.48 + rng.next() * 0.15));
    const u = Math.round(turnout * unionShare / 100); const l = turnout-u;
    const winnerPartyId = unionShare >= 50 ? 'union' : 'liberty';
    if (winnerPartyId === 'union') unionEV += state.electoralVotes; else libertyEV += state.electoralVotes;
    unionPopular += u; libertyPopular += l;
    stateResults.push({ stateId: state.id, unionShare, libertyShare: round1(100-unionShare), winnerPartyId, margin: round1(Math.abs(unionShare-50)*2), electoralVotes: state.electoralVotes, turnout });
    if (state.id !== 'capital-district') state.electionHistory.unshift({ year: world.date.year, type: 'Presidential', winnerPartyId, unionShare, margin: round1(Math.abs(unionShare-50)*2) });
  });
  if (unionEV === libertyEV) {
    const closest = stateResults.filter((r) => r.stateId !== 'capital-district').sort((a,b) => a.margin-b.margin)[0];
    if (unionPopular >= libertyPopular) { unionEV += closest.electoralVotes; libertyEV -= closest.electoralVotes; }
    else { libertyEV += closest.electoralVotes; unionEV -= closest.electoralVotes; }
  }
  const winner = unionEV >= 270 ? union : liberty;
  const loser = winner.id === union.id ? liberty : union;
  const winnerMate = winner.partyId === 'union' ? world.electionCycle.unionRunningMateId : world.electionCycle.libertyRunningMateId;
  const turnout = unionPopular + libertyPopular;
  const winnerShare = round1((winner.partyId === 'union' ? unionPopular : libertyPopular) / turnout * 100);
  const loserShare = round1(100-winnerShare);
  winner.electionsWon += 1; loser.electionsLost += 1;
  winner.electionHistory.push({ year: world.date.year, office: 'President', stage: 'General', result: 'Won', voteShare: winnerShare, electoralVotes: Math.max(unionEV, libertyEV), opponentId: loser.id });
  loser.electionHistory.push({ year: world.date.year, office: 'President', stage: 'General', result: 'Lost', voteShare: loserShare, electoralVotes: Math.min(unionEV, libertyEV), opponentId: winner.id });
  addCareer(winner, world, `Won the presidency with ${winnerShare.toFixed(1)}% and ${Math.max(unionEV, libertyEV)} electoral votes.`, 'Election');
  addCareer(loser, world, `Lost the presidential election with ${loserShare.toFixed(1)}% and ${Math.min(unionEV, libertyEV)} electoral votes.`, 'Election');
  winner.stateRecognitionMap=winner.stateRecognitionMap.map(()=>100); winner.stateFavorabilityMap=winner.stateFavorabilityMap.map((v)=>round1(clamp(v+6,1,98))); recalculateRecognition(world,winner);
  world.government.presidentElectId = winner.id;
  world.government.vicePresidentElectId = winnerMate;
  const election = { id: uid('presidential', world, rng), type: 'Presidential', year: world.date.year, status: 'Complete', unionCandidateId: union.id, libertyCandidateId: liberty.id, unionPartyName:world.parties.union.name, libertyPartyName:world.parties.liberty.name, unionPartyEraId:union.partyEraId, libertyPartyEraId:liberty.partyEraId, winnerPartyName:world.parties[winner.partyId].name, winnerId: winner.id, loserId: loser.id, unionEV, libertyEV, unionPopular, libertyPopular, turnout, stateResults, narrative: `${winner.name} won ${Math.max(unionEV, libertyEV)} electoral votes and ${winnerShare.toFixed(1)}% of the popular vote.` };
  world.elections.unshift(election);
  world.electionCycle.phase = 'Transition'; world.electionCycle.winnerId = winner.id; world.electionCycle.lastElectionId = election.id;
  world.parties[winner.partyId].presidentialWins += 1;
  const popularMargin = round1(Math.abs(unionPopular-libertyPopular)/turnout*100);
  world.records.landslides.push({ year: world.date.year, winnerId: winner.id, electoralVotes: Math.max(unionEV, libertyEV), popularMargin });
  world.records.landslides.sort((a,b) => b.electoralVotes-a.electoralVotes || b.popularMargin-a.popularMargin);
  world.records.landslides.length = Math.min(world.records.landslides.length, 20);
  const headline = Math.max(unionEV, libertyEV) >= 400 ? `${winner.name} wins a historic landslide` : popularMargin < 1.2 ? `${winner.name} survives a knife-edge election` : `${winner.name} elected president`;
  addStory(world, rng, { category: 'Election Night', importance: 5, title: headline, text: election.narrative, subjectId: winner.id });
  addHistory(world, { type: 'Election', importance: 5, title: headline, text: election.narrative });
}

function fillVacatedSeat(world, rng, politician, preferredPartyId) {
  if (!politician) return;
  if (politician.office === 'Governor') {
    const state = getState(world, politician.officeStateId);
    const replacement = state.politicianIds.map((id) => getPolitician(world,id)).filter((p) => p.status === 'Active' && p.partyId === preferredPartyId && ['State Executive','State Legislator','Mayor','Private Citizen'].includes(p.office)).sort((a,b) => politicianScore(b)-politicianScore(a))[0] || (() => { const p=createNewPolitician(world,rng,world.date.year,{stateId:state.id,partyId:preferredPartyId,age:rng.int(32,55)}); world.politicians.push(p); return p; })();
    replacement.office='Governor'; replacement.officeStateId=state.id; replacement.officeDistrictId=null; replacement.officeSince=world.date.year; replacement.approval=51; replacement.terms.governor+=1; state.governorId=replacement.id; addCareer(replacement,world,`Became acting governor of ${state.name} after a federal transition.`,'Office');
  } else if (politician.office === 'Senator') {
    const seat = world.senateSeats.find((item) => item.incumbentId === politician.id);
    const state = getState(world, seat?.stateId);
    if (!seat || !state) return;
    const replacement = state.politicianIds.map((id)=>getPolitician(world,id)).filter((p)=>p.status==='Active'&&p.partyId===preferredPartyId&&['Representative','State Executive','State Legislator','Mayor','Private Citizen'].includes(p.office)).sort((a,b)=>politicianScore(b)-politicianScore(a))[0] || (()=>{const p=createNewPolitician(world,rng,world.date.year,{stateId:state.id,partyId:preferredPartyId,age:rng.int(30,60)});world.politicians.push(p);return p;})();
    replacement.office='Senator'; replacement.officeStateId=state.id; replacement.officeDistrictId=null; replacement.officeSince=world.date.year; replacement.approval=50; replacement.terms.senate+=1; seat.incumbentId=replacement.id; state.senatorIds=world.senateSeats.filter((s)=>s.stateId===state.id).map((s)=>s.id===seat.id?replacement.id:s.incumbentId).filter(Boolean); addCareer(replacement,world,`Appointed to the Senate after ${politician.name} entered the administration.`,'Office');
  } else if (politician.office === 'Representative') {
    const district = getDistrict(world, politician.officeDistrictId);
    const state = getState(world, district?.stateId);
    if (!district || !state) return;
    const replacement = state.politicianIds.map((id)=>getPolitician(world,id)).filter((p)=>p.status==='Active'&&p.partyId===preferredPartyId&&p.homeDistrictId===district.id&&['State Legislator','Mayor','State Executive','Private Citizen'].includes(p.office)).sort((a,b)=>politicianScore(b)-politicianScore(a))[0] || (()=>{const p=createNewPolitician(world,rng,world.date.year,{stateId:state.id,districtId:district.id,partyId:preferredPartyId,age:rng.int(25,55)});world.politicians.push(p);return p;})();
    replacement.office='Representative';replacement.officeStateId=state.id;replacement.officeDistrictId=district.id;replacement.officeSince=world.date.year;replacement.approval=49;replacement.terms.house+=1;district.incumbentId=replacement.id;addCareer(replacement,world,`Appointed to fill the vacancy in district ${district.name}.`,'Office');
  }
}

function inauguration(world, rng) {
  if (cycleYear(world.date.year) !== 1 || world.date.week !== 3 || !world.government.presidentElectId) return;
  const outgoing = currentPresident(world);
  const incoming = getPolitician(world, world.government.presidentElectId);
  const incomingVp = getPolitician(world, world.government.vicePresidentElectId);
  if (!incoming) return;
  const admin = currentAdministration(world);
  admin.endYear = world.date.year;
  admin.approvalEnd = outgoing.approval;
  admin.legacy = round1(outgoing.legacy);
  addCareer(outgoing, world, 'Completed service as president.', 'Office');
  outgoing.office='Private Citizen'; outgoing.officeStateId=null; outgoing.officeDistrictId=null; outgoing.approval=null; recalculatePower(outgoing);
  const oldVp=getPolitician(world,world.government.vicePresidentId); if(oldVp&&oldVp.id!==incoming.id&&oldVp.id!==incomingVp?.id){addCareer(oldVp,world,'Completed service as vice president.','Office');oldVp.office='Private Citizen';oldVp.officeStateId=null;oldVp.officeDistrictId=null;oldVp.approval=null;recalculatePower(oldVp);}

  fillVacatedSeat(world,rng,incoming,incoming.partyId); if(incomingVp) fillVacatedSeat(world,rng,incomingVp,incomingVp.partyId);
  incoming.office='President';incoming.officeStateId=null;incoming.officeDistrictId=null;incoming.officeSince=world.date.year;incoming.terms.president+=1;incoming.approval=round1(clamp(54+incoming.momentum*0.1+rng.normal(0,2),47,65));incoming.stateRecognitionMap=incoming.stateRecognitionMap.map(()=>100);recalculateRecognition(world,incoming);addCareer(incoming,world,`Inaugurated as president for term ${incoming.terms.president}.`,'Office');recalculatePower(incoming);
  if(incomingVp){incomingVp.office='Vice President';incomingVp.officeStateId=null;incomingVp.officeDistrictId=null;incomingVp.officeSince=world.date.year;incomingVp.approval=null;addCareer(incomingVp,world,'Inaugurated as vice president.','Office');recalculatePower(incomingVp);}
  world.government.presidentId=incoming.id;world.government.vicePresidentId=incomingVp?.id||null;world.government.presidentElectId=null;world.government.vicePresidentElectId=null;
  world.government.administrations.push({id:uid('admin',world,rng),presidentId:incoming.id,vicePresidentId:incomingVp?.id||null,partyId:incoming.partyId,partyEraId:incoming.partyEraId,partyName:world.parties[incoming.partyId]?.name||partyName(incoming.partyId,world),startYear:world.date.year,endYear:null,approvalStart:incoming.approval,approvalEnd:null,laws:[],crises:[],legacy:0});
  world.electionCycle={phase:'Governing',cycleYear:world.date.year,unionCandidates:[],libertyCandidates:[],unionNomineeId:null,libertyNomineeId:null,unionRunningMateId:null,libertyRunningMateId:null,events:[],polls:[],winnerId:null,lastElectionId:world.electionCycle.lastElectionId};
  syncGovernmentCounts(world);
  addStory(world,rng,{category:'Inauguration',importance:5,title:`${incoming.name} begins a new administration`,text:`The new president enters office with a House of Union ${world.government.house.union}–${world.government.house.liberty} Liberty and a Senate of Union ${world.government.senate.union}–${world.government.senate.liberty} Liberty.`,subjectId:incoming.id});
  addHistory(world,{type:'Inauguration',importance:5,title:`${incoming.name} inaugurated`,text:`A new ${partyName(incoming.partyId, world)} administration began in Year ${world.date.year}.`});
}

function updateElectionCycle(world, rng) {
  if (cycleYear(world.date.year) === 3 && world.date.week === 35 && world.electionCycle.phase === 'Governing') {
    world.electionCycle.phase='Invisible Primary';
    addStory(world,rng,{category:'Presidential Race',importance:4,title:'The invisible primary begins',text:'Governors and senators begin testing donors, endorsements, and national coalitions ahead of the next presidential contest.'});
  }
  launchPresidentialPrimaries(world,rng);
  resolvePresidentialPrimaries(world,rng);
  finalizePresidentialNominees(world,rng);
  holdConventions(world,rng);
  resolvePresidentialDebate(world,rng);
  prepareFederalStatePrimaries(world,rng);
  resolveFederalStateElections(world,rng);
  resolvePresidentialElection(world,rng);
  inauguration(world,rng);
}

function calculateStateRanks(states) {
  const fields=[['gdpPerCapita',true],['growth',true],['unemployment',false],['income',true],['budget',true],['education',true],['health',true],['infrastructure',true],['crime',false],['rights',true],['environment',true]];
  fields.forEach(([field,highGood])=>{const sorted=[...states].sort((a,b)=>highGood?b.metrics[field]-a.metrics[field]:a.metrics[field]-b.metrics[field]);sorted.forEach((state,index)=>{state.metricRanks[field]=index+1;});});
}

function annualStateDevelopment(world, rng) {
  world.states.forEach((state) => {
    const governor=getPolitician(world,state.governorId);
    const skill=governor?(governor.abilities.governance+governor.abilities.intelligence+governor.abilities.discipline)/3:50;
    const national=world.economy;
    state.metrics.growth=round1(clamp(state.metrics.growth*0.42+national.growth*0.52+(skill-55)*0.025+state.metrics.infrastructure/500+rng.normal(0,0.75),-7,10));
    state.metrics.unemployment=round1(clamp(state.metrics.unemployment+(2.1-state.metrics.growth)*0.17+(55-skill)*0.008+rng.normal(0,0.35),1.5,16));
    state.metrics.gdpPerCapita=round1(clamp(state.metrics.gdpPerCapita+state.metrics.growth*0.25+(skill-55)*0.025+rng.normal(0,0.75),25,120));
    state.metrics.income=round1(clamp(state.metrics.income+state.metrics.growth*0.18+(state.metrics.education-55)*0.025+rng.normal(0,0.6),25,110));
    state.metrics.budget=round1(clamp(state.metrics.budget*0.72+(state.metrics.growth-2)*0.7+(skill-55)*0.045+rng.normal(0,1.2),-20,20));
    state.metrics.education=round1(clamp(state.metrics.education+(skill-55)*0.035+rng.normal(0,0.7),15,100));
    state.metrics.health=round1(clamp(state.metrics.health+(skill-55)*0.03+rng.normal(0,0.7),15,100));
    state.metrics.infrastructure=round1(clamp(state.metrics.infrastructure+(skill-55)*0.03+state.metrics.budget*0.025+rng.normal(0,0.7),15,100));
    state.metrics.crime=round1(clamp(state.metrics.crime+(55-skill)*0.025-(state.metrics.growth-2)*0.15+rng.normal(0,0.8),10,100));
    state.metrics.rights=round1(clamp(state.metrics.rights+rng.normal(0,0.35),5,100));
    state.metrics.environment=round1(clamp(state.metrics.environment+rng.normal(0,0.45),5,100));
    state.metrics.confidence=round1(clamp(50+state.metrics.growth*2-state.metrics.unemployment*1.4+state.metrics.budget*0.4+rng.normal(0,3),15,95));
    const popGrowth=state.archetype==='sunbelt'||state.archetype==='coastalMetro'?rng.normal(1.25,0.5):state.archetype==='industrial'?rng.normal(0.15,0.45):rng.normal(0.48,0.4);
    state.population=round1(clamp(state.population*(1+popGrowth/100),0.45,60));
  });
  calculateStateRanks(world.states);
  world.country.population=round1(world.states.reduce((sum,state)=>sum+state.population,0)+world.country.capitalDistrict.population);

  world.states.forEach((state)=>{
    const governor=getPolitician(world,state.governorId);
    state.annualHistory.push({year:world.date.year,governorId:state.governorId,metrics:{...state.metrics},ranks:{...state.metricRanks}});
    if(state.annualHistory.length>110)state.annualHistory.shift();
    if(!governor)return;
    const baseline=governor.executiveBaseline;
    if(baseline){
      const improvement=(baseline.gdpRank-state.metricRanks.gdpPerCapita)+(baseline.incomeRank-state.metricRanks.income)*0.5+(baseline.growthRank-state.metricRanks.growth)*0.35;
      governor.governingRecord.stateRankChange=round1(improvement);
      governor.governingRecord.economy=round1(governor.governingRecord.economy+state.metrics.growth*0.5+(50-state.metricRanks.gdpPerCapita)*0.04);
      governor.governingRecord.fiscal=round1(governor.governingRecord.fiscal+state.metrics.budget*0.15);
      adjustStateStanding(world,governor,state.id,Math.max(0,improvement)*0.05+(state.metricRanks.gdpPerCapita<=5?1.5:0),Math.max(-0.5,improvement*0.015),state.metricRanks.gdpPerCapita<=10?0.45:0.16);
      governor.nationalPopularity=round1(clamp(governor.nationalPopularity+Math.max(-1,improvement*0.025),1,95));
      governor.milestones ||= [];
      if((state.metricRanks.gdpPerCapita===1||improvement>=18)&&!governor.milestones.includes('state-economic-model')){
        governor.milestones.push('state-economic-model');
        world.records.stateTransformations.push({politicianId:governor.id,stateId:state.id,year:world.date.year,rankChange:round1(improvement),currentRank:state.metricRanks.gdpPerCapita});
        world.records.stateTransformations.sort((a,b)=>b.rankChange-a.rankChange);world.records.stateTransformations.length=Math.min(world.records.stateTransformations.length,25);
        addStory(world,rng,{category:'States',importance:5,title:'A state becomes the national economic model',text:`After ${world.date.year-governor.officeSince+1} years under ${governor.name}, ${state.name} now ranks #${state.metricRanks.gdpPerCapita} in GDP per capita and has improved its combined economic standing by ${improvement.toFixed(1)} places. Presidential speculation is immediate.`,subjectId:governor.id,stateId:state.id});
        addCareer(governor,world,`${state.name} became a national economic model, reaching #${state.metricRanks.gdpPerCapita} in GDP per capita.`,'Legacy');
      }
    }
  });
}

function annualPoliticianSnapshots(world) {
  world.politicians.forEach((p)=>{
    if(p.status!=='Active')return;
    const notable=p.office!=='Private Citizen'||p.stateRecognition>=32||p.nationalRecognition>=20||['Generational','Legend','Epic'].includes(p.rarity)||p.electionHistory.some((e)=>e.year===world.date.year);
    if(!notable)return;
    const state=getState(world,p.officeStateId||p.homeStateId);
    p.annualHistory.push({year:world.date.year,office:p.office,approval:p.approval,homePopularity:p.homePopularity,nationalPopularity:p.nationalPopularity,stateRecognition:p.stateRecognition,nationalRecognition:p.nationalRecognition,power:p.power,legacy:p.legacy,stateRank:p.office==='Governor'?state?.metricRanks?.gdpPerCapita:null,elections:p.electionHistory.filter((e)=>e.year===world.date.year).length,policies:p.policyRecord.filter((e)=>e.year===world.date.year).length,topStates:world.states.map((s,i)=>({stateId:s.id,recognition:p.stateRecognitionMap?.[i]||0,favorability:p.stateFavorabilityMap?.[i]||50})).sort((a,b)=>b.recognition-a.recognition).slice(0,5)});
    if(p.annualHistory.length>110)p.annualHistory.shift();
  });
}


function compactRetiredPoliticians(world) {
  world.peopleArchive=world.peopleArchive||[];
  const cutoff=world.date.year-4;
  const keep=[]; const compact=[];
  world.politicians.forEach((p)=>{
    const nationallyImportant=['Generational','Legend','Epic'].includes(p.rarity)||p.terms?.president>0||p.terms?.governor>0||p.terms?.senate>0||p.legacy>=22;
    if(p.status!=='Retired'||nationallyImportant||(p.retirementYear??world.date.year)>cutoff){keep.push(p);return;}
    const archivedStateStanding={};
    world.states.forEach((state,index)=>{const recognition=p.stateRecognitionMap?.[index]??0;const favorability=p.stateFavorabilityMap?.[index]??50;if(recognition>=8||state.id===p.homeStateId)archivedStateStanding[state.id]={recognition:round1(recognition),favorability:round1(favorability)};});
    compact.push({
      id:p.id,name:p.name,rarity:p.rarity,partyId:p.partyId,partyEraId:p.partyEraId,age:p.age,birthYear:p.birthYear,homeStateId:p.homeStateId,homeDistrictId:p.homeDistrictId,
      background:p.background,careerOriginId:p.careerOriginId,status:'Archived',archived:true,office:'Retired',officeSince:p.officeSince,retirementYear:p.retirementYear,
      abilities:{...p.abilities},ideology:{...p.ideology},terms:{...p.terms},electionsWon:p.electionsWon,electionsLost:p.electionsLost,primariesWon:p.primariesWon,primariesLost:p.primariesLost,
      approval:null,homePopularity:p.homePopularity,stateRecognition:p.stateRecognition,nationalPopularity:p.nationalPopularity,nationalRecognition:p.nationalRecognition,power:p.power,legacy:p.legacy,scandals:p.scandals,
      governingRecord:{...p.governingRecord},coalition:{...p.coalition},prePoliticalCareer:(p.prePoliticalCareer||[]).slice(),career:(p.career||[]).slice(-18),electionHistory:(p.electionHistory||[]).slice(-16),
      annualHistory:(p.annualHistory||[]).filter((_,i,a)=>i===0||i===a.length-1||i%4===0).slice(-20),policyRecord:(p.policyRecord||[]).slice(0,8),relationships:{allies:(p.relationships?.allies||[]).slice(0,3),rivals:(p.relationships?.rivals||[]).slice(0,3),mentors:(p.relationships?.mentors||[]).slice(0,3),proteges:(p.relationships?.proteges||[]).slice(0,3)},
      archivedStateStanding,stateRecognitionMap:null,stateFavorabilityMap:null
    });
  });
  if(!compact.length)return;
  const archivedIds=new Set(compact.map((p)=>p.id));
  world.politicians=keep; world.peopleArchive.push(...compact);
  world.states.forEach((state)=>{state.politicianIds=state.politicianIds.filter((id)=>!archivedIds.has(id));});
  delete world.__politicianIndex;delete world.__politicianIndexSize;delete world.__peopleArchiveIndex;delete world.__peopleArchiveIndexSize;
}

function retireAndReplace(world, rng) {
  const protectedIds=new Set([world.government.presidentId,world.government.vicePresidentId,world.government.presidentElectId,world.government.vicePresidentElectId].filter(Boolean));
  const retirements=[];
  world.politicians.forEach((p)=>{
    if(p.status!=='Active')return;
    p.age+=1;
    const ageRisk=p.age<64?0:p.age<70?0.025:p.age<76?0.075:p.age<82?0.18:0.42;
    const healthRisk=(100-p.hidden.health)/850;
    const privateExit=p.office==='Private Citizen'&&p.stateRecognition<24&&p.age>55?0.05:0;
    if(!protectedIds.has(p.id)&&rng.next()<ageRisk+healthRisk+privateExit){
      p.status='Retired';p.retirementYear=world.date.year;retirements.push(p);addCareer(p,world,'Retired from active politics.','Retirement');vacateOffice(world,p);p.office='Retired';p.approval=null;recalculatePower(p);
    }
  });
  // Fill any accidental vacancies immediately.
  world.states.forEach((state)=>{
    if(!state.governorId){const p=createNewPolitician(world,rng,world.date.year+1,{stateId:state.id,partyId:state.currentLean<=0?'union':'liberty',age:rng.int(32,57)});world.politicians.push(p);p.office='Governor';p.officeStateId=state.id;p.approval=50;p.terms.governor=1;state.governorId=p.id;addCareer(p,world,`Became acting governor of ${state.name} after a vacancy.`,'Office');}
  });
  world.senateSeats.forEach((seat)=>{if(!seat.incumbentId){const state=getState(world,seat.stateId);const p=createNewPolitician(world,rng,world.date.year+1,{stateId:state.id,partyId:state.currentLean<=0?'union':'liberty',age:rng.int(30,62)});world.politicians.push(p);p.office='Senator';p.officeStateId=state.id;p.approval=49;p.terms.senate=1;seat.incumbentId=p.id;state.senatorIds=world.senateSeats.filter((s)=>s.stateId===state.id).map((s)=>s.id===seat.id?p.id:s.incumbentId).filter(Boolean);addCareer(p,world,`Appointed to a Senate vacancy in ${state.name}.`,'Office');}});
  world.districts.forEach((district)=>{if(!district.incumbentId){const state=getState(world,district.stateId);const p=createNewPolitician(world,rng,world.date.year+1,{stateId:state.id,districtId:district.id,partyId:district.lean<=0?'union':'liberty',age:rng.int(25,58)});world.politicians.push(p);p.office='Representative';p.officeStateId=state.id;p.officeDistrictId=district.id;p.approval=48;p.terms.house=1;district.incumbentId=p.id;addCareer(p,world,`Appointed to a vacancy in district ${district.name}.`,'Office');}});
  compactRetiredPoliticians(world);
  const target=6200;
  let active=world.politicians.filter((p)=>p.status==='Active').length;
  if(active>target){
    const excess=active-target;
    const quiet=world.politicians.filter((p)=>p.status==='Active'&&p.office==='Private Citizen'&&p.stateRecognition<30&&p.nationalRecognition<12).sort((a,b)=>(a.power+a.stateRecognition)-(b.power+b.stateRecognition)).slice(0,excess);
    quiet.forEach((p)=>{p.status='Retired';p.retirementYear=world.date.year;p.office='Retired';p.approval=null;addCareer(p,world,'Left active politics after failing to secure a viable office or nomination.','Retirement');recalculatePower(p);});
    active=world.politicians.filter((p)=>p.status==='Active').length;
  }
  const spawn=Math.max(0,target-active);
  const newcomers=[];
  for(let i=0;i<spawn;i+=1){const p=createNewPolitician(world,rng,world.date.year+1,{age:rng.int(25,40)});world.politicians.push(p);newcomers.push(p);}
  const activeGenerationals=world.politicians.filter((p)=>p.status==='Active'&&p.rarity==='Generational').sort((a,b)=>(b.foundingFather?1000:0)+b.power-((a.foundingFather?1000:0)+a.power));
  activeGenerationals.slice(2).forEach((p)=>{p.rarity='Legend';recalculatePower(p);});
  const star=newcomers.filter((p)=>['Generational','Legend','Epic'].includes(p.rarity)).sort((a,b)=>RARITIES[b.rarity].weight-RARITIES[a.rarity].weight)[0];
  if(star)addStory(world,rng,{category:'New Generation',importance:star.rarity==='Generational'?5:3,title:`${star.name} enters public life in ${getState(world,star.homeStateId).name}`,text:`The ${star.age}-year-old ${star.rarity.toLowerCase()}-potential newcomer begins with ${star.abilities.charisma.toFixed(0)} charisma and ${star.abilities.intelligence.toFixed(0)} intelligence.`,subjectId:star.id,stateId:star.homeStateId});
  if(retirements.length){const notable=[...retirements].sort((a,b)=>b.legacy+b.power-(a.legacy+a.power))[0];addStory(world,rng,{category:'Retirements',importance:['Generational','Legend'].includes(notable.rarity)?4:3,title:rng.pick(EVENT_HEADLINES.retirement),text:`${notable.name} leaves active politics. ${Math.max(0,retirements.length-1)} additional politicians also retired at year-end.`,subjectId:notable.id});}
}


function updateWorldSystem(world, rng) {
  const priorEraId=world.historical.currentEraId;
  const era=currentEra(world); world.historical.currentEraId=era.id; world.country.eraId=era.id;
  const society=world.country.society; const stats=world.country.nationalStats;
  if(priorEraId && priorEraId!==era.id){
    addStory(world,rng,{category:'Historical Era',importance:5,title:`The ${era.name} begins`,text:`Columbia enters a new historical era in Year ${world.date.year}. Old coalitions, institutions, and social questions will now face a different economic and international environment.`});
    addHistory(world,{type:'Era',importance:5,title:`Beginning of the ${era.name}`,text:`Year ${world.date.year} marked Columbia’s transition into the ${era.name}.`});
  }
  // Long-run technological and demographic development. Policy choices can substantially alter the path.
  society.industrialization=round1(clamp(society.industrialization+(era.id==='founding'?0.25:era.id==='expansion'?0.7:era.id==='industrial'?1.45:era.id==='global-conflict'?1.05:0.65)+rng.normal(0,0.18),0,100));
  if(society.slaveryLegal){ society.abolitionSupport=round1(clamp(society.abolitionSupport+0.22+society.literacy*0.004+society.industrialization*0.003+rng.normal(0,0.18),3,96)); society.slaveryShare=round1(clamp(society.slaveryShare+rng.normal(0.05,0.18),1,30)); }
  society.indigenousIntegration=round1(clamp(society.indigenousIntegration+(society.indigenousRelations-45)*0.008+rng.normal(0,0.08),0,100));
  society.urbanization=round1(clamp(society.urbanization+0.10+society.industrialization/520+rng.normal(0,0.08),4,96));
  society.literacy=round1(clamp(society.literacy+(era.id==='founding'?0.32:0.55)+world.country.nationalStats.governmentCapacity/480+rng.normal(0,0.15),10,100));
  society.lifeExpectancy=round1(clamp(society.lifeExpectancy+0.08+society.qualityLife/1400+rng.normal(0,0.08),28,88));
  society.qualityLife=round1(clamp(society.qualityLife+world.economy.growth*0.10+society.socialSpending*0.018-society.inequality*0.006+rng.normal(0,0.25),10,100));
  stats.technology=round1(clamp(stats.technology+(era.id==='industrial'?1.1:era.id==='global-conflict'?1.3:0.65)+rng.normal(0,0.22),5,100));
  stats.gdpPerCapita=round1(clamp(stats.gdpPerCapita+world.economy.growth*0.22+stats.technology*0.006-society.inequality*0.003+rng.normal(0,0.35),8,150));
  stats.gdp=round1(clamp(stats.gdp*(1+world.economy.growth/100+Math.max(0,world.country.population-9)/2500),0.5,5000));
  stats.military=round1(clamp(stats.military+stats.gdp/900+stats.technology/700+rng.normal(0,0.5),5,100));
  stats.governmentCapacity=round1(clamp(stats.governmentCapacity+0.15+society.literacy/1000+rng.normal(0,0.18),10,100));
  // Population grows with the era and living conditions; state shares can slowly diverge without changing the fixed 435-seat model.
  const basePopulationGrowth=era.id==='founding'?1.75:era.id==='expansion'?1.85:era.id==='industrial'?1.45:era.id==='global-conflict'?1.05:era.id==='modern-state'?1.0:0.55;
  world.states.forEach((state)=>{
    const localQuality=((state.metrics.education+state.metrics.health+state.metrics.infrastructure)/3); const migration=(state.metrics.growth-2)*0.055+(localQuality-55)*0.006;
    const rate=clamp(basePopulationGrowth+migration+rng.normal(0,0.16),-0.6,3.2);
    state.population=Math.round(clamp(state.population*(1+rate/100),0.05,120)*100)/100;
  });
  world.country.capitalDistrict.population=Math.round(clamp(world.country.capitalDistrict.population*(1+clamp(basePopulationGrowth+0.35,0,3)/100),0.05,12)*100)/100;
  world.country.population=round1(world.states.reduce((sum,state)=>sum+state.population,0)+world.country.capitalDistrict.population);
  // Foreign countries evolve at a cheaper aggregate level.
  world.worldSystem.countries.forEach((c)=>{
    const development=(c.technology-35)*0.006+(c.stability-50)*0.003+rng.normal(1.7,0.65);
    c.gdp=round1(clamp(c.gdp*(1+development/100),0.2,6000)); c.gdpPerCapita=round1(clamp(c.gdpPerCapita+development*0.18+rng.normal(0,0.22),7,150));
    c.population=round1(clamp(c.population*(1+clamp(1.2-(c.qualityLife-50)*0.01,0.2,1.8)/100),0.3,650));
    c.technology=round1(clamp(c.technology+(era.id==='industrial'||era.id==='global-conflict'?0.7:0.4)+rng.normal(0,0.28),5,100));
    c.qualityLife=round1(clamp(c.qualityLife+development*0.08+rng.normal(0,0.25),8,100)); c.literacy=round1(clamp(c.literacy+0.35+c.technology/700,5,100));
    c.lifeExpectancy=round1(clamp(c.lifeExpectancy+0.07+c.qualityLife/1800,22,90)); c.military=round1(clamp(c.military+c.gdp/1800+c.technology/1200+rng.normal(0,0.45),3,100));
    c.stability=round1(clamp(c.stability+rng.normal(0,0.7),10,98));
  });
  world.worldSystem.rankingsYear=world.date.year;
  const columbia={id:'columbia',gdp:stats.gdp,gdpPerCapita:stats.gdpPerCapita,qualityLife:society.qualityLife,military:stats.military,technology:stats.technology,inequality:society.inequality,rights:society.civilRights};
  const all=[columbia,...world.worldSystem.countries];const rank=(key,high=true)=>[...all].sort((a,b)=>high?(b[key]??0)-(a[key]??0):(a[key]??0)-(b[key]??0)).findIndex((c)=>c.id==='columbia')+1;
  world.country.annualHistory.push({year:world.date.year,population:world.country.population,economy:{...world.economy},nationalStats:{...stats},society:{...society},worldRanks:{gdp:rank('gdp'),gdpPerCapita:rank('gdpPerCapita'),qualityLife:rank('qualityLife'),military:rank('military'),technology:rank('technology'),lowInequality:rank('inequality',false),rights:rank('rights')},presidentId:world.government.presidentId});
  if(world.country.annualHistory.length>320)world.country.annualHistory.shift();
}

function makeNationalDecisionRecord(world,rng,president,title,choice,summary,effects={}) {
  const record={id:uid('decision',world,rng),year:world.date.year,week:world.date.week,level:'Federal',jurisdictionId:'federal',policyId:`historical-${title.toLowerCase().replace(/[^a-z0-9]+/g,'-')}`,name:title,issue:'historical turning point',description:choice,effects:{...effects},summary};
  president.policyRecord.unshift(record); currentAdministration(world).laws.push(record.id); world.government.laws.unshift({...record,presidentId:president.id,significance:5});
  addCareer(president,world,`${title}: ${choice}`,'Historical decision'); president.legacy=round1(president.legacy+(effects.legacy||1));
  world.historical.pressureLog.unshift({pressureId:record.policyId,year:world.date.year,presidentId:president.id,title,choice,summary});
  addStory(world,rng,{category:'Historical Turning Point',importance:5,title,text:`${president.name}: ${choice}. ${summary}`,subjectId:president.id});
  addHistory(world,{type:'Turning Point',importance:5,title,text:`${president.name} chose: ${choice}. ${summary}`});
}


function archiveConflict(world,rng,{name,type='International war',opponentId=null,domestic=false,outcome='Unresolved',duration=1}) {
  const opponent=opponentId?world.worldSystem.countries.find((c)=>c.id===opponentId):rng.pick(world.worldSystem.countries.filter((c)=>c.majorPower));
  const conflict={id:uid('conflict',world,rng),name,type,startYear:world.date.year,endYear:world.date.year+duration,domestic,opponentId:opponent?.id||null,opponentName:opponent?.name||null,outcome};
  world.worldSystem.conflicts.unshift(conflict);world.worldSystem.history.unshift(conflict);if(opponent)opponent.history.unshift({year:world.date.year,event:name,outcome});return conflict;
}

function resolveHistoricalPressure(world,rng,pressure) {
  const president=currentPresident(world); if(!president)return;
  const s=world.country.society, n=world.country.nationalStats; const social=president.ideology.social, federal=president.ideology.federal, foreign=president.ideology.foreign, economy=president.ideology.economy;
  let choice='',summary='',effects={legacy:1};
  if(pressure.id==='founding-precedent'){
    if(federal<45){choice='Built a strong national treasury and durable federal institutions';n.governmentCapacity=clamp(n.governmentCapacity+9,0,100);s.taxBurden=clamp(s.taxBurden+1.2,0,60);summary='The young republic accepts a stronger federal center, national credit, and broader administrative capacity as part of its constitutional tradition.';world.country.constitutionalTraditions.push({year:world.date.year,name:'Strong federal administration',strength:72,description:'National institutions gained early legitimacy under the founding administration.'});effects.legacy=3;}else{choice='Protected a compact of sovereign states and limited federal reach';n.governmentCapacity=clamp(n.governmentCapacity-2,0,100);s.taxBurden=clamp(s.taxBurden-0.5,0,60);summary='State governments retain greater authority, while the federal administration grows more slowly and depends heavily on local cooperation.';world.country.constitutionalTraditions.push({year:world.date.year,name:'Strong state sovereignty',strength:72,description:'The founding administration established a narrow interpretation of federal power.'});effects.legacy=3;}
  } else if(pressure.id==='native-policy'){
    if(social<38||president.abilities.empathy>75){choice='Protected autonomous nations and negotiated citizenship rights';s.indigenousRelations=clamp(s.indigenousRelations+16,0,100);s.indigenousIntegration=clamp(s.indigenousIntegration+12,0,100);s.expansionPressure=clamp(s.expansionPressure-8,0,100);s.civilRights=clamp(s.civilRights+4,0,100);summary='Settlement advances more slowly, but indigenous communities retain stronger institutions and a growing place in national politics.';}
    else if(federal>64||president.ideology.style>67){choice='Authorized removal and accelerated frontier settlement';s.indigenousRelations=clamp(s.indigenousRelations-18,0,100);s.indigenousIntegration=clamp(s.indigenousIntegration-10,0,100);s.expansionPressure=clamp(s.expansionPressure+12,0,100);n.gdp=round1(n.gdp*1.015);summary='Settlers gain land rapidly while indigenous relations collapse and long-run integration becomes far harder.';}
    else {choice='Created negotiated federal territories';s.indigenousRelations=clamp(s.indigenousRelations+5,0,100);s.indigenousIntegration=clamp(s.indigenousIntegration+3,0,100);summary='The compromise reduces immediate violence without resolving the long frontier dispute.';}
  } else if(pressure.id==='slavery-question'){
    if(!s.slaveryLegal)return;
    if(s.abolitionSupport>58 || social<33 || president.abilities.empathy>86){choice=s.abolitionSupport>52?'Signed compensated gradual emancipation':'Backed immediate federal emancipation';s.slaveryLegal=false;s.slaveryShare=0;s.civilRights=clamp(s.civilRights+16,0,100);s.inequality=clamp(s.inequality-4,0,100);summary='Slavery ends without a full civil war, though sectional bitterness and economic disruption persist for years.';effects.legacy=5;}
    else if(s.abolitionSupport<30 && federal>65){choice='Protected slavery as a state institution';s.abolitionSupport=clamp(s.abolitionSupport+6,0,100);s.slaveryShare=clamp(s.slaveryShare+1.2,0,30);summary='The institution survives and expands politically, postponing the confrontation while increasing future sectional pressure.';effects.legacy=-1;}
    else {choice='The sectional compromise collapsed into civil war';const strength=(president.abilities.governance+president.abilities.discipline+president.abilities.speech)/3;const win=strength+rng.normal(0,12)>55;s.slaveryLegal=!win;s.slaveryShare=win?0:clamp(s.slaveryShare-2,0,30);s.civilRights=clamp(s.civilRights+(win?12:-5),0,100);n.debt=round1(clamp(n.debt+25,0,150));n.military=round1(clamp(n.military+12,0,100));world.economy.growth=round1(clamp(world.economy.growth-4,-8,10));summary=win?'The federal government prevailed after a devastating civil conflict and slavery was abolished.':'The war ended inconclusively; slavery survived in parts of the republic and the constitutional settlement remained unstable.';archiveConflict(world,rng,{name:'The Columbian Civil War',type:'Civil war',domestic:true,outcome:win?'Federal victory and abolition':'Inconclusive sectional settlement',duration:rng.int(3,6)});effects.legacy=win?6:-4;}
  } else if(pressure.id==='colonial-war'||pressure.id==='neighbor-war'){
    const aggressive=foreign>63||president.hidden.risk>72; if(aggressive){choice='Chose war rather than territorial compromise';n.military=clamp(n.military+9,0,100);n.debt=clamp(n.debt+11,0,150);world.economy.growth-=1.4;summary='The republic expands its military capacity and international ambitions at significant fiscal and human cost.';archiveConflict(world,rng,{name:pressure.title,outcome:'Military victory and territorial settlement',duration:rng.int(1,4)});}else{choice='Negotiated a settlement and avoided general war';n.governmentCapacity=clamp(n.governmentCapacity+3,0,100);summary='Diplomacy protects public finances, though expansionists accuse the administration of timidity.';}
  } else if(pressure.id==='labor-question'){
    if(economy<42){choice='Recognized collective bargaining and national labor standards';s.socialSpending=clamp(s.socialSpending+5,0,60);s.inequality=clamp(s.inequality-7,0,100);summary='Workers gain institutional power and inequality falls, while employers face higher labor costs.';}else{choice='Protected industrial flexibility and broke the national strike';s.inequality=clamp(s.inequality+4,0,100);n.gdpPerCapita=clamp(n.gdpPerCapita+2,0,150);summary='Industrial output recovers quickly, but labor radicalism and inequality intensify.';}
  } else if(pressure.id==='great-war'||pressure.id==='second-world-war'){
    const intervene=foreign+president.hidden.risk*0.25+president.abilities.speech*0.12+rng.normal(0,8)>70;
    if(intervene){choice=pressure.id==='great-war'?'Entered the Great War during its opening phase':'Mobilized early against the expansionist powers';n.military=clamp(n.military+18,0,100);n.debt=clamp(n.debt+18,0,150);n.technology=clamp(n.technology+7,0,100);world.economy.growth+=1.2;summary='Mobilization accelerates industry, military power, debt, and Columbia’s influence over the postwar order.';archiveConflict(world,rng,{name:pressure.id==='great-war'?'The Great War':'The Second World War',outcome:'Columbia joins the allied coalition',duration:rng.int(2,6)});}else{choice='Maintained armed neutrality';n.gdp=round1(n.gdp*1.04);summary='Columbia avoids the worst casualties and profits from trade, but gains less influence over the postwar settlement.';}
  } else if(pressure.id==='depression'){
    world.economy.growth=-5.5;world.economy.unemployment=12.5;if(economy<48){choice='Launched an expansive federal recovery and social-insurance program';s.socialSpending=clamp(s.socialSpending+12,0,60);s.taxBurden=clamp(s.taxBurden+6,0,55);s.inequality=clamp(s.inequality-8,0,100);n.debt=clamp(n.debt+20,0,160);world.economy.confidence+=8;summary='The federal state expands dramatically, cushioning hardship while creating a permanently larger tax-and-spending system.';}else{choice='Relied on monetary stabilization, balanced budgets, and private recovery';s.socialSpending=clamp(s.socialSpending+2,0,60);s.taxBurden=clamp(s.taxBurden+1,0,55);n.debt=clamp(n.debt+5,0,160);world.economy.confidence-=3;summary='The state remains smaller, but unemployment stays elevated longer and political anger grows.';}
  } else if(pressure.id==='civil-rights'){
    if(social<45||president.abilities.empathy>72){choice='Signed a broad national civil-rights settlement';s.civilRights=clamp(s.civilRights+15,0,100);s.inequality=clamp(s.inequality-3,0,100);summary='Federal enforcement expands political and civil equality while triggering a major partisan and regional realignment.';effects.legacy=4;}else{choice='Deferred civil-rights enforcement to the states';s.civilRights=clamp(s.civilRights+2,0,100);summary='Formal change slows and the movement radicalizes, preserving regional autonomy at a large social cost.';effects.legacy=-2;}
  } else if(pressure.id==='globalization'){
    if(president.ideology.trade>55){choice='Opened markets and embraced global economic integration';n.gdpPerCapita=clamp(n.gdpPerCapita+3,0,150);s.inequality=clamp(s.inequality+3,0,100);summary='Trade and productivity accelerate while regional winners and losers diverge sharply.';}else{choice='Protected strategic industries and limited trade exposure';s.inequality=clamp(s.inequality-1,0,100);world.economy.growth-=0.3;summary='Industrial communities receive more protection, though consumers and high-growth exporters see fewer gains.';}
  }
  if(!choice)return;
  makeNationalDecisionRecord(world,rng,president,pressure.title,choice,summary,effects);
  world.historical.pressuresResolved.push({id:pressure.id,year:world.date.year});
}

function maybeHistoricalPressure(world,rng) {
  if(world.date.week!==18)return;
  const era=currentEra(world);
  const unresolved=HISTORICAL_PRESSURES.filter((p)=>{
    if(world.date.year<p.earliest||world.date.year>p.latest|| (p.era&&p.era!==era.id))return false;
    const prior=world.historical.pressuresResolved.filter((x)=>x.id===p.id).sort((a,b)=>b.year-a.year);
    if(!p.repeat)return prior.length===0;
    return !prior.length || world.date.year-prior[0].year>=8;
  });
  unresolved.forEach((pressure)=>{
    const span=Math.max(1,pressure.latest-pressure.earliest);
    const progress=clamp((world.date.year-pressure.earliest)/span,0,1);
    const chance=pressure.earliest===pressure.latest||world.date.year===pressure.latest?1:(pressure.repeat?0.055+progress*0.10:0.035+progress*0.17);
    if(rng.next()<chance)resolveHistoricalPressure(world,rng,pressure);
  });
}


function platformFit(group, platform) {
  const keys=['economy','social','federal','foreign','trade','immigration','environment','institutions','style'];
  let score=0,count=0;keys.forEach((key)=>{if(group[key]!=null&&platform[key]!=null){score+=100-Math.abs(group[key]-platform[key]);count++;}});return count?score/count:50;
}

function evolveVoterCoalitions(world,rng) {
  const u=world.parties.union.platform||{}, l=world.parties.liberty.platform||{};
  world.states.forEach((state)=>{
    // Demographic blocs evolve with urbanization/industrialization. They remain abstract cohorts, not individual voters.
    const urban=world.country.society.urbanization, industrial=world.country.society.industrialization;
    const shareShift={
      urbanProfessionals:(urban-30)*0.0025, industrialWorkers:(industrial-35)*0.0020, ruralTraditionalists:-(urban-25)*0.0032,
      suburbanFamilies:currentEra(world).id==='modern-state'||currentEra(world).id==='contemporary'?0.06:0, immigrantCommunities:currentEra(world).id==='industrial'||currentEra(world).id==='contemporary'?0.045:0,
      youngGraduates:world.country.society.literacy>65?0.045:0, publicSector:world.country.nationalStats.governmentCapacity>55?0.025:0
    };
    state.groups.forEach((sg)=>{sg.share=Math.max(0.3,sg.share+(shareShift[sg.groupId]||0)+rng.normal(0,0.012));});
    const shareTotal=state.groups.reduce((sum,g)=>sum+g.share,0)||100;state.groups.forEach((g)=>{g.share=round1(g.share*100/shareTotal);});
    let unionWeighted=0,total=0;
    state.groups.forEach((sg)=>{
      const group=POPULATION_GROUPS.find((g)=>g.id===sg.groupId);if(!group)return;
      const uf=platformFit(group,u), lf=platformFit(group,l);
      let target=clamp(50+(uf-lf)*0.72,7,93);
      // Historical social questions can accelerate or suppress coalition movement.
      if(world.country.society.slaveryLegal && ['ruralTraditionalists','smallBusiness'].includes(sg.groupId)) target+=world.parties.union.platform.social<world.parties.liberty.platform.social?-2:2;
      if(world.country.society.industrialization>45 && sg.groupId==='industrialWorkers') target+=world.parties.union.platform.economy<world.parties.liberty.platform.economy?5:-5;
      sg.loyaltyUnion=round1(clamp(sg.loyaltyUnion+(target-sg.loyaltyUnion)*0.055+rng.normal(0,0.35),4,96));
      unionWeighted+=sg.loyaltyUnion*sg.share;total+=sg.share;
    });
    const unionShare=unionWeighted/(total||100);
    state.currentLean=round1(clamp((50-unionShare)*1.15 + state.baselineLean*0.18 + rng.normal(0,0.22),-30,30));
    state.districtIds.forEach((id)=>{const d=getDistrict(world,id);if(d)d.lean=round1(clamp(d.lean+(state.currentLean-d.lean)*0.12+rng.normal(0,0.15),-32,32));});
  });
}

function evolveParties(world,rng) {
  Object.values(world.parties).forEach((party)=>{
    // Platforms drift toward the median of active politicians and the current electorate.
    const active=world.politicians.filter((p)=>p.status==='Active'&&p.partyId===party.id);
    if(active.length){Object.keys(party.platform||{}).forEach((key)=>{const sample=active.filter((_,i)=>i%Math.max(1,Math.floor(active.length/180))===0);const avg=sample.reduce((sum,p)=>sum+(p.ideology[key]??50),0)/(sample.length||1);party.platform[key]=round1(clamp(party.platform[key]*0.82+avg*0.18,2,98));});}
    const current=party.lineage.find((l)=>l.id===party.currentEraId); const age=world.date.year-(current?.foundedYear||1);
    const crisisBonus=world.historical.pressureLog.some((x)=>x.year===world.date.year)?0.025:0;
    const weak=party.nationalSupport<42?0.035:0; const veryOld=age>48?0.022:age>30?0.008:0;
    if(age>18&&rng.next()<weak+veryOld+crisisBonus){
      if(current)current.dissolvedYear=world.date.year;
      const used=new Set(party.lineage.map((l)=>l.name)); const options=(PARTY_SUCCESSOR_NAMES[party.id]||[]).filter((n)=>!used.has(n)); const name=rng.pick(options.length?options:PARTY_SUCCESSOR_NAMES[party.id]);
      const eraId=`${party.id}-era-${party.lineage.length+1}`; const predecessor=current?.id||null; const oldName=party.name;
      party.name=name;party.short=name.split(' ').map((x)=>x[0]).join('').slice(0,3).toUpperCase();party.foundedYear=world.date.year;party.currentEraId=eraId;party.description=`A successor coalition to the ${oldName}, reorganized in Year ${world.date.year} as its voter base and ideological center shifted.`;
      party.lineage.push({id:eraId,name,short:party.short,foundedYear:world.date.year,dissolvedYear:null,predecessorId:predecessor,reason:party.nationalSupport<42?'Electoral collapse and reorganization':'Ideological realignment',platform:{...party.platform}});
      party.history.unshift({year:world.date.year,event:`${oldName} was reorganized and succeeded by the ${name}.`});
      active.forEach((p)=>{p.partyEraId=eraId;if(p.office!=='Private Citizen'||p.nationalRecognition>25)addCareer(p,world,`Joined the ${name} during the Year ${world.date.year} party realignment.`,'Party');});
      world.historical.partyRealignments.unshift({year:world.date.year,slot:party.id,predecessorName:oldName,successorName:name});
      addStory(world,rng,{category:'Party Realignment',importance:5,title:`${oldName} gives way to the ${name}`,text:`After ${age} years, one of Columbia’s major political coalitions has been reorganized. The institutional slot survives, but its name, platform, factions, and electoral coalition enter a new historical era.`});
      addHistory(world,{type:'Party Realignment',importance:5,title:`Founding of the ${name}`,text:`The ${name} succeeded the ${oldName} in Year ${world.date.year}.`});
    }
  });
}

function updateParties(world, rng) {
  Object.values(world.parties).forEach((party)=>{
    const active=world.politicians.filter((p)=>p.status==='Active'&&p.partyId===party.id);
    const eraFactionNames=FACTION_ERA_NAMES[currentEra(world).id]?.[party.id];
    if(eraFactionNames) party.factions.forEach((f,index)=>{f.name=eraFactionNames[index]||f.name;});
    party.leaderId=[...active].sort((a,b)=>b.power-a.power)[0]?.id||party.leaderId;
    party.factions.forEach((faction)=>{const leader=getPolitician(world,faction.leaderId);faction.influence=round1(clamp(faction.influence+(leader?leader.power/100-0.5:0)*1.1+rng.normal(0,1),5,45));});
    const total=party.factions.reduce((sum,f)=>sum+f.influence,0);party.factions.forEach((f)=>{f.influence=round1(f.influence*100/total);});
    party.platformHistory=party.platformHistory||[];party.platformHistory.push({year:world.date.year,platform:{...party.platform},support:party.nationalSupport});if(party.platformHistory.length>320)party.platformHistory.shift();
  });
  const support=clamp(50+nationalEnvironmentForUnion(world)*0.7,35,65);world.parties.union.nationalSupport=round1(support);world.parties.liberty.nationalSupport=round1(100-support);
  evolveParties(world,rng);
  evolveVoterCoalitions(world,rng);
}

function completeYear(world, rng) {
  annualStateDevelopment(world,rng);
  updateWorldSystem(world,rng);
  annualPoliticianSnapshots(world);
  retireAndReplace(world,rng);
  updateParties(world,rng);
  syncGovernmentCounts(world);
  const president=currentPresident(world);
  const stories=world.magazine.filter((story)=>story.year===world.date.year);
  const top=[...world.politicians].filter((p)=>p.status==='Active').sort((a,b)=>b.power+b.momentum-(a.power+a.momentum)).slice(0,5).map((p)=>p.id);
  world.annualReview={year:world.date.year,presidentId:president.id,presidentApproval:president.approval,economy:{...world.economy},house:{...world.government.house},senate:{...world.government.senate},lawsPassed:world.government.laws.filter((law)=>law.year===world.date.year).length,majorEvents:stories.filter((story)=>story.importance>=4).length,topPoliticianIds:top,topStoryId:stories.sort((a,b)=>b.importance-a.importance)[0]?.id||null,electionId:world.elections.find((e)=>e.year===world.date.year)?.id||null,activePoliticians:world.politicians.filter((p)=>p.status==='Active').length};
  addHistory(world,{type:'Annual Review',importance:3,title:`Year ${world.date.year} enters the archive`,text:`The year ended with ${president.name} at ${president.approval.toFixed(1)}% approval and ${world.annualReview.activePoliticians.toLocaleString()} active politicians.`});
}

function advanceOneWeekMutable(world, rng) {
  if(world.annualReview)return;
  world.date.week+=1;
  if(world.date.week>52){world.date.week=52;return;}
  updateNationalEconomy(world,rng);
  updateOfficeholders(world,rng);
  maybeGovernorPolicies(world,rng);
  maybeFederalPolicy(world,rng);
  maybeStartOrResolveCrisis(world,rng);
  maybeScandal(world,rng);
  maybeHistoricalPressure(world,rng);
  updateElectionCycle(world,rng);
  if(world.date.week===52)completeYear(world,rng);
  world.rngSeed=rng.seed;
}

function moveToNextYearMutable(world) {
  if(!world.annualReview)return;
  world.date.year+=1;world.date.week=1;world.annualReview=null;
}

export function advanceWeeks(world, weeks=1, options={}) {
  const next=cloneWorld(world);const rng=makeRng(next.rngSeed||next.seed);
  for(let i=0;i<weeks;i+=1){if(next.annualReview)break;const before=next.notifications[0]?.id;advanceOneWeekMutable(next,rng);if(options.stopOnMajor&&i>0&&next.notifications[0]?.id&&next.notifications[0]?.id!==before)break;}
  next.rngSeed=rng.seed;return next;
}

export function advanceToEndOfYear(world) {
  const next=cloneWorld(world);const rng=makeRng(next.rngSeed||next.seed);
  while(!next.annualReview)advanceOneWeekMutable(next,rng);
  next.rngSeed=rng.seed;return next;
}

export function moveToNextYear(world) {const next=cloneWorld(world);moveToNextYearMutable(next);return next;}

export function simulateYears(world, years=1) {
  const next=cloneWorld(world);const rng=makeRng(next.rngSeed||next.seed);const target=next.date.year+years;
  while(next.date.year<target){while(!next.annualReview)advanceOneWeekMutable(next,rng);moveToNextYearMutable(next);}next.rngSeed=rng.seed;return next;
}

export function advanceToNextEvent(world) {
  const next=cloneWorld(world);const rng=makeRng(next.rngSeed||next.seed);const startingHistory=next.history.length;const startingElectionPhase=next.electionCycle.phase;
  for(let i=0;i<104&&!next.annualReview;i+=1){advanceOneWeekMutable(next,rng);if(next.history.length>startingHistory||next.electionCycle.phase!==startingElectionPhase||next.notifications[0]?.year===next.date.year&&next.notifications[0]?.week===next.date.week)break;}
  next.rngSeed=rng.seed;return next;
}

export function getCycleLabel(world) {
  if(world.annualReview)return `Year ${world.date.year} review`;
  if(world.electionCycle.phase!=='Governing')return world.electionCycle.phase;
  const cy=cycleYear(world.date.year);
  if(cy===1)return 'New administration';if(cy===2)return 'Midterm year';if(cy===3)return 'Pre-election year';return 'Presidential election year';
}
