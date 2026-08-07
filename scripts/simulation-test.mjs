import { createWorld, currentEra, getPolitician } from '../src/world.js';
import { simulateYears } from '../src/simulation.js';

const assert = (condition, message) => { if (!condition) throw new Error(message); };

const initial = createWorld(1700);
assert(initial.schemaVersion === 3, 'Expected v0.3 schema');
assert(initial.states.length === 50, 'Expected 50 states');
assert(initial.districts.length === 435, 'Expected 435 House districts');
assert(initial.senateSeats.length === 100, 'Expected 100 Senate seats');
assert(initial.politicians.filter((p) => p.status === 'Active').length === 6200, 'Active political universe must begin at 6,200');
assert(initial.politicians.filter((p) => p.rarity === 'Generational').length <= 2, 'No more than two active Generational politicians at founding');
const founder = initial.politicians.find((p) => p.foundingFather);
assert(founder?.rarity === 'Generational', 'Founding president must be a Generational founding figure');
assert(founder?.careerOriginId === 'military', 'Founding president should carry the military/revolutionary origin');
assert(founder?.stateRecognitionMap?.length === 50 && founder?.stateFavorabilityMap?.length === 50, 'Politicians need complete 50-state standing maps');
assert(initial.politicians.every((p) => p.prePoliticalCareer?.length), 'Every politician needs a pre-political career path');
const localShare = initial.politicians.filter((p) => ['local-politics','state-politics'].includes(p.careerOriginId)).length / initial.politicians.length;
assert(localShare > 0.60, 'Local/state politics should be the dominant career origin');
assert(initial.worldSystem.countries.length >= 30, 'Simplified foreign world is missing');
assert(currentEra(initial).id === 'founding', 'Universe should begin in the founding era');
assert(initial.parties.union.lineage.length === 1 && initial.parties.liberty.lineage.length === 1, 'Founding party lineages missing');

const world = simulateYears(initial, 12);
assert(world.politicians.filter((p) => p.status === 'Active').length === 6200, 'Active political universe must remain at 6,200');
assert(world.politicians.filter((p) => p.status === 'Active' && p.rarity === 'Generational').length <= 2, 'Generational cap drifted above two');
assert(world.districts.every((district) => {
  const incumbent = getPolitician(world, district.incumbentId);
  return incumbent?.office === 'Representative' && incumbent.officeDistrictId === district.id;
}), 'Every House district must have one consistent representative');
assert(world.senateSeats.every((seat) => {
  const incumbent = getPolitician(world, seat.incumbentId);
  return incumbent?.office === 'Senator' && incumbent.officeStateId === seat.stateId;
}), 'Every Senate seat must have one consistent senator');
assert(world.states.every((state) => {
  const governor = getPolitician(world, state.governorId);
  return governor?.office === 'Governor' && governor.officeStateId === state.id;
}), 'Every state must have one consistent governor');
const officeIds = [...world.districts.map((d) => d.incumbentId), ...world.senateSeats.map((s) => s.incumbentId), ...world.states.map((s) => s.governorId)];
assert(new Set(officeIds).size === officeIds.length, 'No politician may hold two incompatible elected offices');
assert(world.raceArchive.some((race) => race.office === 'House'), 'House election archive missing');
assert(world.primaryArchive.some((race) => race.uncontested), 'Uncontested primaries should exist');
assert(world.primaryArchive.some((race) => !race.uncontested), 'Contested primaries should exist');
assert(world.magazine.some((story) => story.category === 'Rising Stars'), 'Primary-defeat rising-star stories should be possible');
assert(world.states.some((state) => state.policyHistory.length > 0), 'State policy histories should be populated');
assert(world.politicians.some((p) => p.annualHistory.length >= 5), 'Politician year-by-year histories should be populated');
assert(world.elections.length >= 4, 'Presidential election cycle did not advance');
assert(world.states.some((state) => Math.abs(state.currentLean - state.baselineLean) > 0.5), 'Population-group party coalitions are not evolving');
assert(world.country.nationalStats.technology > initial.country.nationalStats.technology, 'Historical national development is not advancing');
assert(world.historical.pressureLog.length > 0, 'Historical pressure engine did not generate a turning point for validation seed');
assert(Number.isFinite(world.country.population) && world.country.population > initial.country.population, 'National population is not evolving correctly');
assert(world.peopleArchive.length > 0, 'Routine retirees should be compacted into the lightweight historical archive');
const archivedPerson = world.peopleArchive[0];
assert(getPolitician(world, archivedPerson.id)?.name === archivedPerson.name, 'Compacted historical politicians must remain resolvable from old records');
assert(world.politicians.some((p) => p.stateRecognitionMap.some((v, i) => i !== world.states.findIndex((s) => s.id === p.homeStateId) && v > 20)), 'Recognition is not spreading beyond home states');

console.log(`v0.3 validation passed: ${world.politicians.filter((p)=>p.status==='Active').length.toLocaleString()} active politicians, ${world.raceArchive.length.toLocaleString()} races, ${world.primaryArchive.length.toLocaleString()} primaries, ${world.historical.pressureLog.length} historical turning points.`);
