// Balance harness: npm run sim [runs]
import { BACKGROUNDS } from '../src/data';
import { getEventCard } from '../src/data';
import { buildRunConfig, createRun, eventPrice, projectedIncome } from '../src/engine';
import { botCharacter, careerFunds, climbCareer, hometownWinRate, playCampaign, reelectionRate, setNightActions } from '../src/sim/bot';
import type { BotStyle } from '../src/sim/bot';

const runs = Number(process.argv[2] ?? 200);
const pct = (v: number) => `${(v * 100).toFixed(0)}%`.padStart(5);

console.log(`Hometown mayoral races, ${runs} runs each (age 35)\n`);
for (const home of ['ny-north', 'ny-wny', 'ny-nyc']) {
  for (const style of ['sensible', 'idle', 'contrarian'] as BotStyle[]) {
    const r = hometownWinRate(botCharacter(home), style, runs);
    console.log(`${home.padEnd(9)} ${style.padEnd(10)} win ${pct(r.winRate)}  avg share ${pct(r.avgShare)}`);
  }
}
console.log('\nNative vs transplant: first mayoral race and donor income (public servant, age 35)');
for (const home of ['ny-north', 'ny-wny', 'ny-nyc']) {
  for (const [label, homeState] of [
    ['native', undefined],
    ['transplant (TX)', 'TX'],
  ] as const) {
    const r = hometownWinRate(botCharacter(home, 'public_servant', 35, homeState), 'sensible', runs);
    const start = createRun(buildRunConfig(botCharacter(home, 'public_servant', 35, homeState), 'money'));
    console.log(
      `${home.padEnd(9)} ${label.padEnd(16)} win ${pct(r.winRate)}  avg share ${pct(r.avgShare)}  donors/turn $${(projectedIncome(start).donors / 1000).toFixed(1)}k`,
    );
  }
}

console.log('\nSensible bot by background: first mayoral race (Watertown / NYC)');
for (const b of BACKGROUNDS) {
  const north = hometownWinRate(botCharacter('ny-north', b.id), 'sensible', Math.max(50, runs / 2));
  const nyc = hometownWinRate(botCharacter('ny-nyc', b.id), 'sensible', Math.max(50, runs / 2));
  console.log(
    `${b.name.padEnd(22)} Watertown ${pct(north.winRate)} (${pct(north.avgShare)})   NYC ${pct(nyc.winRate)} (${pct(nyc.avgShare)})`,
  );
}

console.log('\nElection night: same seeds with and without night actions (sensible bot)');
for (const home of ['ny-north', 'ny-nyc']) {
  let close = 0;
  let flippedClose = 0;
  let flipped = 0;
  let blowoutFlips = 0;
  const milestones: Record<string, number> = {};
  const n = runs;
  for (let i = 0; i < n; i++) {
    const seed = `night-${home}-${i}`;
    setNightActions(false);
    const off = playCampaign(createRun(buildRunConfig(botCharacter(home), seed)), 'sensible').state.elections.at(-1)!;
    setNightActions(true);
    const onRun = playCampaign(createRun(buildRunConfig(botCharacter(home), seed)), 'sensible').state;
    const on = onRun.elections.at(-1)!;
    for (const m of onRun.log.filter((l) => l.text.startsWith('🏅')).map((l) => l.text.split(':')[0]!.slice(2)))
      milestones[m] = (milestones[m] ?? 0) + 1;
    const margin = off.totalShares[0]! - Math.max(...off.totalShares.slice(1));
    const isClose = Math.abs(margin) < 0.03;
    if (isClose) close++;
    if (off.playerWon !== on.playerWon) {
      flipped++;
      if (isClose) flippedClose++;
      if (Math.abs(margin) > 0.06) blowoutFlips++;
    }
  }
  console.log(
    `${home.padEnd(9)} close races ${pct(close / n)}  flipped by night actions: ${pct(flippedClose / Math.max(1, close))} of close, ${pct(flipped / n)} of all, ${blowoutFlips} blowouts`,
  );
  console.log(
    `          milestones per campaign: ${Object.entries(milestones)
      .map(([k, v]) => `${k} ${(v / n).toFixed(2)}`)
      .join(' · ')}`,
  );
}

console.log('\nEconomics investment: Watertown public servant, 20 turns (~6 years)');
const rallyPrice = eventPrice(getEventCard('arena_rally'), createRun(buildRunConfig(botCharacter('ny-north'), 'price')));
for (const style of ['sensible', 'investor'] as BotStyle[]) {
  const n = Math.max(40, runs / 4);
  let funds = 0;
  let fr = 0;
  let rally = 0;
  for (let i = 0; i < n; i++) {
    const r = careerFunds(botCharacter('ny-north'), style, 20, `fund-${style}-${i}`);
    funds += r.funds;
    fr += r.fundraising;
    if (r.peak >= rallyPrice) rally++;
  }
  console.log(
    `${style.padEnd(10)} Economics ${(fr / n).toFixed(1)}  avg funds $${Math.round(funds / n / 1000)}k  could afford a $${rallyPrice / 1000}k rally: ${pct(rally / n)}`,
  );
}

console.log('\nRe-election after a first term (sensible campaigns, governing style varies)');
for (const home of ['ny-north', 'ny-wny']) {
  for (const style of ['sensible', 'flipflop'] as BotStyle[]) {
    const r = reelectionRate(botCharacter(home), style, Math.max(60, runs / 2));
    console.log(
      `${home.padEnd(9)} ${style.padEnd(9)} re-elected ${pct(r.reelected)} of ${r.terms} terms  approval at filing ${pct(r.avgApproval)}  integrity ${Math.round(r.integrity)}`,
    );
  }
}

console.log('\nThe climb (Watertown-born climber, up to 60 turns ≈ 18 years)');
for (const [background, party] of [
  ['public_servant', undefined],
  ['lawyer', undefined],
  ['public_servant', 'DU'],
] as const) {
  const n = Math.max(40, runs / 3);
  const tally: Record<string, number> = {};
  let house = 0;
  let gov = 0;
  let years = 0;
  let tries = 0;
  let houseFirst = 0;
  let houseTried = 0;
  let firstWins = 0;
  for (let i = 0; i < n; i++) {
    const r = climbCareer(botCharacter('ny-north', background), 60, `climb-${background}-${i}`, party);
    tally[r.party] = (tally[r.party] ?? 0) + 1;
    if (r.reachedHouse) house++;
    if (r.reachedGovernor) {
      gov++;
      years += r.years;
    }
    if (r.firstHouseTry !== undefined) {
      houseTried++;
      if (r.firstHouseTry) houseFirst++;
    }
    if (r.firstGovernorTry !== undefined) {
      tries++;
      if (r.firstGovernorTry) firstWins++;
    }
  }
  console.log(
    `${(background + (party ? ' as Blue' : '')).padEnd(16)} reached House ${pct(house / n)} (first try ${pct(houseFirst / Math.max(1, houseTried))})  Governor ${pct(gov / n)}${gov ? ` (avg ${Math.round(years / gov)} yrs)` : ''}  first Governor try won ${pct(firstWins / Math.max(1, tries))}  parties ${JSON.stringify(tally)}`,
  );
}

console.log('\nBeginner scenarios (target: 80–90% wins for sensible play)');
import { SCENARIOS } from '../src/data';
import { scenarioRate } from '../src/sim/bot';
for (const scn of SCENARIOS.filter((x) => x.track === 'beginner')) {
  const n = Math.max(40, runs / 3);
  const plain = scenarioRate(scn.id, n);
  const loaded = scenarioRate(scn.id, n, ['war_chest', 'union_hall_key']);
  console.log(
    `${scn.title.padEnd(22)} win ${pct(plain.winRate)}  stars ${plain.avgStars.toFixed(2)}   with 2 artifacts: win ${pct(loaded.winRate)}  stars ${loaded.avgStars.toFixed(2)}`,
  );
}
